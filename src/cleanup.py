import os
import time
import logging
import asyncio
from typing import Optional, Set, Tuple, Dict, Any
from pymongo.collection import Collection

from config import (
    UPLOAD_FOLDER,
    HEATMAP_FOLDER,
    CLEANUP_ORPHAN_RETENTION_HOURS,
    CLEANUP_TEMP_RETENTION_HOURS,
    CLEANUP_INTERVAL_MINUTES,
    CLEANUP_ENABLED,
)
from src.database import get_predictions_collection
from src.utils import is_safe_path, cleanup_file

logger = logging.getLogger("chest_xray_api.cleanup")


def get_referenced_file_basenames(
    collection: Optional[Collection] = None,
) -> Tuple[Set[str], bool]:
    """
    Queries MongoDB predictions collection to collect all image and heatmap filenames
    currently referenced by stored prediction records.

    Returns:
        tuple (referenced_set, is_database_connected):
            - referenced_set: set of sanitized filename basenames referenced in DB.
            - is_database_connected: bool indicating if MongoDB was reachable.
    """
    referenced = set()
    if collection is None:
        collection = get_predictions_collection()

    if collection is None:
        logger.warning(
            "MongoDB predictions collection unavailable. Cannot verify referenced assets."
        )
        return referenced, False

    try:
        # Project only filename/path fields for minimal memory and query overhead
        projection = {
            "image_filename": 1,
            "image_path": 1,
            "heatmap_path": 1,
            "heatmap_url": 1,
        }
        cursor = collection.find({}, projection)

        for doc in cursor:
            # 1. Direct image filename
            img_fn = doc.get("image_filename")
            if img_fn and isinstance(img_fn, str):
                referenced.add(os.path.basename(img_fn.replace("\\", "/")))

            # 2. Upload file path
            img_p = doc.get("image_path")
            if img_p and isinstance(img_p, str):
                referenced.add(os.path.basename(img_p.replace("\\", "/")))

            # 3. Heatmap file path
            hm_p = doc.get("heatmap_path")
            if hm_p and isinstance(hm_p, str):
                referenced.add(os.path.basename(hm_p.replace("\\", "/")))

            # 4. Heatmap URL
            hm_u = doc.get("heatmap_url")
            if hm_u and isinstance(hm_u, str):
                clean_url = hm_u.split("?")[0].rstrip("/")
                referenced.add(os.path.basename(clean_url.replace("\\", "/")))

        # Filter out empty strings
        referenced.discard("")
        return referenced, True

    except Exception as e:
        logger.error(f"Error querying referenced files from MongoDB: {e}")
        return set(), False


def cleanup_stale_files(
    upload_dir: Optional[str] = None,
    heatmap_dir: Optional[str] = None,
    orphan_retention_hours: Optional[int] = None,
    temp_retention_hours: Optional[int] = None,
    dry_run: bool = False,
    collection: Optional[Collection] = None,
) -> Dict[str, Any]:
    """
    Scans upload and heatmap storage directories and prunes stale orphan files and
    abandoned temporary files while strictly preserving all files referenced by MongoDB records.

    Safety Rules:
      1. Referenced Assets: Files referenced in MongoDB prediction records are NEVER deleted.
      2. Conservative Stance: If MongoDB is unreachable, orphan deletions are skipped.
      3. Path Traversal Guard: Every candidate path must strictly resolve inside its base directory.
      4. Recent Files: Orphan files younger than orphan_retention_hours are preserved (in-flight inference).
      5. Temporary Files: Abandoned .tmp / .partial files older than temp_retention_hours are pruned.

    Returns:
        Structured dictionary with execution counts:
        {"scanned": int, "preserved": int, "deleted": int, "skipped": int, "errors": int, "dry_run": bool, "db_connected": bool}
    """
    target_upload_dir = upload_dir or UPLOAD_FOLDER
    target_heatmap_dir = heatmap_dir or HEATMAP_FOLDER
    orphan_threshold_hrs = (
        orphan_retention_hours
        if orphan_retention_hours is not None
        else CLEANUP_ORPHAN_RETENTION_HOURS
    )
    temp_threshold_hrs = (
        temp_retention_hours
        if temp_retention_hours is not None
        else CLEANUP_TEMP_RETENTION_HOURS
    )

    stats = {
        "scanned": 0,
        "preserved": 0,
        "deleted": 0,
        "skipped": 0,
        "errors": 0,
        "dry_run": dry_run,
        "db_connected": False,
    }

    logger.info(
        f"Starting storage cleanup (orphan_retention: {orphan_threshold_hrs}h, temp_retention: {temp_threshold_hrs}h, dry_run: {dry_run})"
    )

    # 1. Fetch referenced files from MongoDB
    referenced_basenames, db_connected = get_referenced_file_basenames(collection)
    stats["db_connected"] = db_connected

    if not db_connected:
        logger.warning(
            "Cleanup proceeding in SAFE-MODE: MongoDB is unavailable, all potential orphan images/heatmaps will be PRESERVED."
        )

    now = time.time()
    scan_targets = [
        (target_upload_dir, "uploads"),
        (target_heatmap_dir, "heatmaps"),
    ]

    for base_dir, label in scan_targets:
        if not os.path.exists(base_dir) or not os.path.isdir(base_dir):
            continue

        try:
            with os.scandir(base_dir) as entries:
                for entry in entries:
                    try:
                        # Skip directories and hidden / dot files (e.g., .gitkeep)
                        if entry.is_dir() or entry.name.startswith("."):
                            stats["skipped"] += 1
                            continue

                        if not entry.is_file():
                            stats["skipped"] += 1
                            continue

                        stats["scanned"] += 1
                        file_path = entry.path

                        # 2. Strict Path Traversal Containment Check
                        if not is_safe_path(base_dir, file_path):
                            logger.error(
                                f"Security alert: Path traversal candidate detected and rejected: {entry.name}"
                            )
                            stats["errors"] += 1
                            stats["skipped"] += 1
                            continue

                        # Determine file age in hours
                        try:
                            stat_res = entry.stat()
                            mtime = stat_res.st_mtime
                            age_hours = (now - mtime) / 3600.0
                        except (FileNotFoundError, OSError):
                            stats["skipped"] += 1
                            continue

                        basename = entry.name

                        # 3. Check if file is a temporary artifact (.tmp, .partial, temp_*)
                        is_temp_file = (
                            basename.endswith(".tmp")
                            or basename.endswith(".partial")
                            or basename.startswith("temp_")
                        )

                        if is_temp_file:
                            if age_hours >= temp_threshold_hrs:
                                # Stale temporary artifact -> prune
                                if not dry_run:
                                    if cleanup_file(file_path):
                                        stats["deleted"] += 1
                                        logger.info(f"Deleted stale temp file: {basename} (age: {age_hours:.1f}h)")
                                    else:
                                        stats["errors"] += 1
                                else:
                                    stats["deleted"] += 1
                            else:
                                # Active/recent temporary artifact -> preserve
                                stats["preserved"] += 1
                            continue

                        # 4. Check if file is referenced in MongoDB prediction records
                        if basename in referenced_basenames:
                            # Permanently protected history asset
                            stats["preserved"] += 1
                            continue

                        # 5. File is unreferenced / orphan
                        if not db_connected:
                            # Safe fallback: preserve unverified orphan when DB cannot be queried
                            stats["preserved"] += 1
                            stats["skipped"] += 1
                            continue

                        if age_hours < orphan_threshold_hrs:
                            # Recent orphan (e.g. in-flight request or newly uploaded scan) -> preserve
                            stats["preserved"] += 1
                        else:
                            # Stale orphan asset -> prune safely
                            if not dry_run:
                                if cleanup_file(file_path):
                                    stats["deleted"] += 1
                                    logger.info(
                                        f"Deleted stale orphan {label} file: {basename} (age: {age_hours:.1f}h)"
                                    )
                                else:
                                    stats["errors"] += 1
                            else:
                                stats["deleted"] += 1

                    except Exception as item_err:
                        logger.error(f"Error evaluating cleanup candidate '{entry.name}': {item_err}")
                        stats["errors"] += 1

        except Exception as scan_err:
            logger.error(f"Error scanning directory '{base_dir}': {scan_err}")
            stats["errors"] += 1

    logger.info(
        f"Storage cleanup completed: Scanned={stats['scanned']}, Preserved={stats['preserved']}, Deleted={stats['deleted']}, Skipped={stats['skipped']}, Errors={stats['errors']}"
    )
    return stats


async def run_periodic_cleanup_loop(interval_minutes: Optional[int] = None):
    """
    Asynchronous background worker that periodically executes storage cleanup
    without blocking FastAPI request handling or model inference.
    """
    interval = interval_minutes if interval_minutes is not None else CLEANUP_INTERVAL_MINUTES
    interval_seconds = max(60, interval * 60)

    logger.info(f"Storage cleanup background task initialized (interval: {interval} minutes).")

    try:
        while True:
            await asyncio.sleep(interval_seconds)
            if CLEANUP_ENABLED:
                try:
                    # Run cleanup in a thread pool executor to avoid any filesystem I/O blocking the event loop
                    await asyncio.to_thread(cleanup_stale_files)
                except Exception as loop_err:
                    logger.error(f"Periodic cleanup execution error (safely caught): {loop_err}")
    except asyncio.CancelledError:
        logger.info("Storage cleanup background task cancelled gracefully.")
