import os
import time
import pytest
import tempfile
import shutil
from unittest.mock import MagicMock, patch

from src.cleanup import (
    get_referenced_file_basenames,
    cleanup_stale_files,
    run_periodic_cleanup_loop,
)
from src.utils import is_safe_path, cleanup_file


@pytest.fixture
def mock_storage_dirs(tmp_path):
    """Creates isolated temporary upload and heatmap directories for testing."""
    uploads_dir = tmp_path / "uploads"
    heatmaps_dir = tmp_path / "heatmaps"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    heatmaps_dir.mkdir(parents=True, exist_ok=True)
    return str(uploads_dir), str(heatmaps_dir)


def create_test_file(directory: str, filename: str, age_hours: float = 0.0, content: bytes = b"dummy"):
    """Helper to create a test file with an artificial modification time."""
    filepath = os.path.join(directory, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    # Set modification time in the past
    past_timestamp = time.time() - (age_hours * 3600.0)
    os.utime(filepath, (past_timestamp, past_timestamp))
    return filepath


def test_get_referenced_file_basenames_success():
    """Verifies that all image and heatmap basenames are correctly extracted from MongoDB documents."""
    mock_collection = MagicMock()
    mock_collection.find.return_value = [
        {
            "image_filename": "scan1.png",
            "image_path": "static/uploads/scan1.png",
            "heatmap_path": "static/heatmaps/heatmap_scan1.png",
            "heatmap_url": "/static/heatmaps/heatmap_scan1.png?v=1",
        },
        {
            "image_filename": "scan2.jpg",
            "image_path": "C:\\some\\windows\\path\\scan2.jpg",
            "heatmap_path": "/posix/path/heatmap_scan2.jpg",
            "heatmap_url": "/static/heatmaps/heatmap_scan2.jpg",
        },
    ]

    referenced, db_connected = get_referenced_file_basenames(mock_collection)
    assert db_connected is True
    assert "scan1.png" in referenced
    assert "heatmap_scan1.png" in referenced
    assert "scan2.jpg" in referenced
    assert "heatmap_scan2.jpg" in referenced


def test_get_referenced_file_basenames_db_unavailable():
    """Verifies graceful handling when MongoDB collection is unavailable."""
    with patch("src.cleanup.get_predictions_collection", return_value=None):
        referenced, db_connected = get_referenced_file_basenames(None)
        assert db_connected is False
        assert isinstance(referenced, set)
        assert len(referenced) == 0



def test_stale_orphan_upload_is_deleted(mock_storage_dirs):
    """Test A: Stale orphan upload file (> 24h old and unreferenced) is deleted."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    stale_orphan = create_test_file(uploads_dir, "orphan_upload.png", age_hours=30.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []  # No referenced files

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["deleted"] == 1
    assert stats["scanned"] == 1
    assert not os.path.exists(stale_orphan)


def test_stale_orphan_heatmap_is_deleted(mock_storage_dirs):
    """Test B: Stale orphan heatmap file (> 24h old and unreferenced) is deleted."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    stale_heatmap = create_test_file(heatmaps_dir, "heatmap_orphan.png", age_hours=30.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["deleted"] == 1
    assert not os.path.exists(stale_heatmap)


def test_recent_orphan_file_is_preserved(mock_storage_dirs):
    """Test C: Recent orphan file (< 24h old, e.g. in-flight inference) is preserved."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    recent_orphan = create_test_file(uploads_dir, "recent_upload.png", age_hours=2.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["preserved"] == 1
    assert stats["deleted"] == 0
    assert os.path.exists(recent_orphan)


def test_referenced_old_upload_is_preserved(mock_storage_dirs):
    """Test D: Stale upload file (> 24h old) referenced by a MongoDB record is preserved."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    old_referenced_upload = create_test_file(uploads_dir, "historical_scan.png", age_hours=200.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = [{"image_filename": "historical_scan.png"}]

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["preserved"] == 1
    assert stats["deleted"] == 0
    assert os.path.exists(old_referenced_upload)


def test_referenced_old_heatmap_is_preserved(mock_storage_dirs):
    """Test E: Stale heatmap file (> 24h old) referenced by a MongoDB record is preserved."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    old_referenced_hm = create_test_file(heatmaps_dir, "heatmap_historical.png", age_hours=200.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = [{"heatmap_path": "static/heatmaps/heatmap_historical.png"}]

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["preserved"] == 1
    assert stats["deleted"] == 0
    assert os.path.exists(old_referenced_hm)


def test_path_traversal_deletion_attempt_is_rejected(mock_storage_dirs):
    """Test F: Path traversal attempt outside base directories is strictly rejected."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    assert not is_safe_path(uploads_dir, os.path.join(uploads_dir, "..", "sensitive.txt"))
    assert not is_safe_path(uploads_dir, "C:\\Windows\\system32\\calc.exe")


def test_file_outside_allowed_directories_is_never_deleted(tmp_path, mock_storage_dirs):
    """Test G: External sensitive files are never deleted during cleanup."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    external_dir = tmp_path / "outside_secure_dir"
    external_dir.mkdir(parents=True, exist_ok=True)
    external_file = create_test_file(str(external_dir), "important.csv", age_hours=500.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert os.path.exists(external_file)


def test_missing_file_does_not_crash_cleanup(mock_storage_dirs):
    """Test H: Race condition where a file is deleted during scanning does not crash cleanup."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    assert cleanup_file(os.path.join(uploads_dir, "non_existent_file.png")) is False


def test_directory_is_not_deleted_accidentally(mock_storage_dirs):
    """Test I: Subdirectories within upload or heatmap folders are preserved and skipped."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    sub_dir = os.path.join(uploads_dir, "nested_folder")
    os.makedirs(sub_dir, exist_ok=True)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert os.path.exists(sub_dir)
    assert os.path.isdir(sub_dir)
    assert stats["skipped"] >= 1


def test_cleanup_failure_does_not_crash_application(mock_storage_dirs):
    """Test J: Unhandled OS errors during scanning are caught cleanly without raising."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    with patch("os.scandir", side_effect=PermissionError("Mock permission denied")):
        stats = cleanup_stale_files(
            upload_dir=uploads_dir,
            heatmap_dir=heatmaps_dir,
            collection=MagicMock(),
        )
        assert stats["errors"] >= 1


def test_cleanup_only_affects_filesystem_assets(mock_storage_dirs):
    """Test K: Cleanup never invokes delete operations on database collections."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    mock_collection = MagicMock()
    mock_collection.find.return_value = [{"image_filename": "test.png"}]

    cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        collection=mock_collection,
    )

    # Verify no deletion methods were ever called on the MongoDB collection
    assert mock_collection.delete_one.call_count == 0
    assert mock_collection.delete_many.call_count == 0
    assert mock_collection.drop.call_count == 0


def test_prediction_mongodb_documents_remain_untouched(mock_storage_dirs):
    """Test L: Prediction documents in MongoDB remain completely intact."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    mock_collection = MagicMock()
    mock_docs = [
        {"image_filename": f"scan_{i}.png", "predicted_class": "Normal"} for i in range(5)
    ]
    mock_collection.find.return_value = mock_docs

    cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        collection=mock_collection,
    )

    assert mock_collection.update_one.call_count == 0
    assert mock_collection.update_many.call_count == 0


def test_multiple_cleanup_calls_are_safe_idempotent(mock_storage_dirs):
    """Test M: Successive cleanup executions are safe and idempotent."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    create_test_file(uploads_dir, "orphan.png", age_hours=40.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    # First run: deletes orphan
    stats1 = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        collection=mock_collection,
    )
    assert stats1["deleted"] == 1

    # Second run: nothing left to delete
    stats2 = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        collection=mock_collection,
    )
    assert stats2["deleted"] == 0
    assert stats2["scanned"] == 0


def test_current_active_recent_files_are_preserved(mock_storage_dirs):
    """Test N: Active in-flight uploads are preserved regardless of database presence."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    recent_file = create_test_file(uploads_dir, "active_upload.png", age_hours=0.01)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        orphan_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["preserved"] == 1
    assert os.path.exists(recent_file)


def test_temporary_stale_artifacts_cleaned(mock_storage_dirs):
    """Test O: Temporary artifacts (.tmp, .partial) older than temp retention are deleted."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    stale_tmp = create_test_file(uploads_dir, "upload_123.tmp", age_hours=25.0)
    stale_partial = create_test_file(uploads_dir, "buffer.partial", age_hours=30.0)
    recent_tmp = create_test_file(uploads_dir, "upload_456.tmp", age_hours=1.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        temp_retention_hours=24,
        collection=mock_collection,
    )

    assert stats["deleted"] == 2
    assert stats["preserved"] == 1
    assert not os.path.exists(stale_tmp)
    assert not os.path.exists(stale_partial)
    assert os.path.exists(recent_tmp)


def test_safe_mode_preserves_all_files_when_database_down(mock_storage_dirs):
    """Verifies that if MongoDB is down, unverified orphan images are NOT deleted."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    stale_image = create_test_file(uploads_dir, "maybe_orphan.png", age_hours=100.0)

    # Collection is None -> Database unreachable
    with patch("src.cleanup.get_predictions_collection", return_value=None):
        stats = cleanup_stale_files(
            upload_dir=uploads_dir,
            heatmap_dir=heatmaps_dir,
            collection=None,
        )

        assert stats["db_connected"] is False
        assert stats["deleted"] == 0
        assert stats["preserved"] == 1
        assert os.path.exists(stale_image)



def test_dry_run_mode_does_not_delete_files(mock_storage_dirs):
    """Verifies that dry_run=True identifies candidates without deleting from disk."""
    uploads_dir, heatmaps_dir = mock_storage_dirs
    stale_orphan = create_test_file(uploads_dir, "dryrun_orphan.png", age_hours=50.0)

    mock_collection = MagicMock()
    mock_collection.find.return_value = []

    stats = cleanup_stale_files(
        upload_dir=uploads_dir,
        heatmap_dir=heatmaps_dir,
        dry_run=True,
        collection=mock_collection,
    )

    assert stats["deleted"] == 1
    assert stats["dry_run"] is True
    assert os.path.exists(stale_orphan)  # File was NOT deleted
