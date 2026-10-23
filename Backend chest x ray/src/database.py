import os
import json
import time
import uuid
import sqlite3
import logging
import subprocess
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, DuplicateKeyError

from config import (
    BASE_DIR,
    MONGODB_URI,
    MONGODB_DATABASE,
    PREDICTIONS_COLLECTION,
    USERS_COLLECTION,
)

logger = logging.getLogger("chest_xray_api.database")

_mongo_client: Optional[MongoClient] = None
_last_mongo_check: float = 0.0
_MONGO_RECHECK_INTERVAL: float = 60.0  # seconds between reconnect checks if MongoDB is down

# Path to the local SQLite database used when MongoDB is offline
SQLITE_DB_PATH = os.path.join(BASE_DIR, "chest_xray_local.db")


# ==========================================
# Local SQLite Persistence Layer
# ==========================================

def _get_sqlite_conn() -> sqlite3.Connection:
    """Returns an initialized SQLite connection with WAL journal mode for fast concurrency."""
    conn = sqlite3.connect(SQLITE_DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def _init_sqlite_db():
    """Initializes tables for users and predictions in SQLite if they don't already exist."""
    try:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                image_filename TEXT,
                image_path TEXT,
                predicted_class TEXT,
                confidence REAL,
                probabilities TEXT,
                heatmap_path TEXT,
                timestamp TEXT
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_predictions_user_time ON predictions (user_id, timestamp DESC);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_predictions_time ON predictions (timestamp DESC);")
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error initializing local SQLite database: {e}")


# Initialize SQLite tables on module import
_init_sqlite_db()


def _sqlite_create_user(name: str, email: str, password_hash: str) -> Dict[str, Any]:
    normalized_email = email.strip().lower()
    user_id = uuid.uuid4().hex[:24]
    created_at = datetime.now(timezone.utc)
    conn = _get_sqlite_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name.strip(), normalized_email, password_hash, created_at.isoformat())
        )
        conn.commit()
        logger.info(f"User successfully registered in local SQLite (ID: {user_id}, Email: {normalized_email})")
        return {
            "_id": user_id,
            "name": name.strip(),
            "email": normalized_email,
            "password_hash": password_hash,
            "created_at": created_at,
        }
    except sqlite3.IntegrityError:
        raise DuplicateKeyError("An account with this email address already exists.")
    finally:
        conn.close()


def _sqlite_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    normalized_email = email.strip().lower()
    conn = _get_sqlite_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?", (normalized_email,))
        row = cur.fetchone()
        if not row:
            return None
        try:
            created_at = datetime.fromisoformat(row["created_at"])
        except Exception:
            created_at = datetime.now(timezone.utc)
        return {
            "_id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "created_at": created_at,
        }
    finally:
        conn.close()


def _sqlite_get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = _get_sqlite_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?", (str(user_id),))
        row = cur.fetchone()
        if not row:
            return None
        try:
            created_at = datetime.fromisoformat(row["created_at"])
        except Exception:
            created_at = datetime.now(timezone.utc)
        return {
            "_id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "created_at": created_at,
        }
    finally:
        conn.close()


def _sqlite_save_prediction(
    image_filename: str,
    image_path: str,
    predicted_class: str,
    confidence: float,
    probabilities: Dict[str, float],
    heatmap_path: str,
    user_id: Optional[str] = None,
) -> str:
    pred_id = uuid.uuid4().hex[:24]
    ts = datetime.now(timezone.utc).isoformat()
    probs_json = json.dumps(probabilities)
    conn = _get_sqlite_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO predictions
               (id, user_id, image_filename, image_path, predicted_class, confidence, probabilities, heatmap_path, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (pred_id, str(user_id) if user_id else None, str(image_filename), str(image_path),
             str(predicted_class), float(confidence), probs_json, str(heatmap_path), ts)
        )
        conn.commit()
        logger.info(f"Prediction successfully saved to local SQLite (ID: {pred_id})")
        return pred_id
    finally:
        conn.close()


def _sqlite_get_user_prediction_history(user_id: str, limit: int = 20, skip: int = 0) -> Tuple[List[Dict[str, Any]], int]:
    conn = _get_sqlite_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM predictions WHERE user_id = ?", (str(user_id),))
        total = cur.fetchone()[0]
        cur.execute(
            """SELECT id, image_filename, predicted_class, confidence, probabilities, timestamp
               FROM predictions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?""",
            (str(user_id), max(1, min(100, limit)), max(0, skip))
        )
        rows = cur.fetchall()
        items = []
        for r in rows:
            try:
                probs = json.loads(r["probabilities"])
            except Exception:
                probs = {}
            img_name = r["image_filename"]
            try:
                dt = datetime.fromisoformat(r["timestamp"])
            except Exception:
                dt = r["timestamp"]
            items.append({
                "id": r["id"],
                "image_filename": img_name,
                "predicted_class": r["predicted_class"],
                "confidence": float(r["confidence"]),
                "probabilities": probs,
                "heatmap_url": f"/static/heatmaps/heatmap_{img_name}" if img_name else None,
                "image_url": f"/static/uploads/{img_name}" if img_name else None,
                "timestamp": dt,
            })
        return items, total
    finally:
        conn.close()


def _sqlite_get_user_prediction_by_id(prediction_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    conn = _get_sqlite_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, image_filename, image_path, predicted_class, confidence, probabilities, heatmap_path, timestamp
               FROM predictions WHERE id = ? AND (user_id = ? OR user_id IS NULL)""",
            (str(prediction_id), str(user_id))
        )
        row = cur.fetchone()
        if not row:
            return None
        try:
            probs = json.loads(row["probabilities"])
        except Exception:
            probs = {}
        img_name = row["image_filename"]
        try:
            dt = datetime.fromisoformat(row["timestamp"])
        except Exception:
            dt = row["timestamp"]
        return {
            "id": row["id"],
            "image_filename": img_name,
            "image_path": row["image_path"],
            "heatmap_path": row["heatmap_path"],
            "predicted_class": row["predicted_class"],
            "confidence": float(row["confidence"]),
            "probabilities": probs,
            "heatmap_url": f"/static/heatmaps/heatmap_{img_name}" if img_name else None,
            "image_url": f"/static/uploads/{img_name}" if img_name else None,
            "timestamp": dt,
        }
    finally:
        conn.close()


# ==========================================
# MongoDB Management & Connection
# ==========================================

def _try_autostart_mongodb():
    """Attempts to auto-launch MongoDB in Linux/Codespaces if installed."""
    try:
        subprocess.run(["docker", "start", "mongodb"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        return
    except Exception:
        pass
    try:
        subprocess.run(["sudo", "service", "mongodb", "start"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
    except Exception:
        pass


def get_mongo_client() -> Optional[MongoClient]:
    """
    Returns a thread-safe singleton MongoClient instance if MongoDB is reachable.
    If MongoDB is offline, throttles reconnection attempts so requests respond in <5ms via SQLite.
    """
    global _mongo_client, _last_mongo_check
    now = time.time()

    if _mongo_client is not None:
        try:
            _mongo_client.admin.command("ping")
            return _mongo_client
        except Exception:
            _mongo_client = None

    # Throttle connection attempts if recently failed
    if now - _last_mongo_check < _MONGO_RECHECK_INTERVAL:
        return None

    _last_mongo_check = now

    if not MONGODB_URI:
        return None

    try:
        client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=1500,
            connectTimeoutMS=1500,
        )
        client.admin.command("ping")
        _mongo_client = client
        logger.info("Connected to MongoDB successfully.")
        ensure_indexes(_mongo_client)
        return _mongo_client
    except Exception as e:
        if ("localhost" in MONGODB_URI or "127.0.0.1" in MONGODB_URI) and os.name != "nt":
            try:
                _try_autostart_mongodb()
                client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500, connectTimeoutMS=1500)
                client.admin.command("ping")
                _mongo_client = client
                logger.info("MongoDB auto-started and connected.")
                ensure_indexes(_mongo_client)
                return _mongo_client
            except Exception:
                pass
        logger.warning(f"MongoDB not available ({e}); using local SQLite storage.")
        _mongo_client = None
        return None


def ensure_indexes(client: Optional[MongoClient] = None):
    """Creates indexes on MongoDB collections."""
    if client is None:
        client = _mongo_client
    if client is None:
        return
    try:
        db = client[MONGODB_DATABASE]
        users_col = db[USERS_COLLECTION]
        users_col.create_index([("email", ASCENDING)], unique=True)

        pred_col = db[PREDICTIONS_COLLECTION]
        pred_col.create_index([("user_id", ASCENDING), ("timestamp", -1)])
        pred_col.create_index([("timestamp", -1)])
    except Exception as e:
        logger.warning(f"Could not verify/create MongoDB indexes: {e}")


def get_predictions_collection() -> Optional[Collection]:
    """Returns MongoDB predictions collection or None if MongoDB is offline."""
    client = get_mongo_client()
    if client is None:
        return None
    try:
        db = client[MONGODB_DATABASE]
        return db[PREDICTIONS_COLLECTION]
    except Exception as e:
        logger.error(f"Error accessing predictions collection: {e}")
        return None


def get_users_collection() -> Optional[Collection]:
    """Returns MongoDB users collection or None if MongoDB is offline."""
    client = get_mongo_client()
    if client is None:
        return None
    try:
        db = client[MONGODB_DATABASE]
        return db[USERS_COLLECTION]
    except Exception as e:
        logger.error(f"Error accessing users collection: {e}")
        return None


# ==========================================
# Prediction Persistence (MongoDB + SQLite)
# ==========================================

def format_prediction_document(
    image_filename: str,
    image_path: str,
    predicted_class: str,
    confidence: float,
    probabilities: Dict[str, float],
    heatmap_path: str,
    user_id: Optional[str] = None,
    timestamp: Optional[datetime] = None,
) -> Dict[str, Any]:
    return {
        "image_filename": str(image_filename),
        "image_path": str(image_path),
        "predicted_class": str(predicted_class),
        "confidence": float(confidence),
        "probabilities": {str(k): float(v) for k, v in probabilities.items()},
        "heatmap_path": str(heatmap_path),
        "timestamp": timestamp or datetime.now(timezone.utc),
        "user_id": str(user_id) if user_id else None,
    }


def save_prediction(
    image_filename: str,
    image_path: str,
    predicted_class: str,
    confidence: float,
    probabilities: Dict[str, float],
    heatmap_path: str,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """
    Persists prediction to MongoDB or SQLite fallback. Never raises to disrupt inference.
    """
    collection = get_predictions_collection()
    if collection is not None:
        try:
            doc = format_prediction_document(
                image_filename=image_filename,
                image_path=image_path,
                predicted_class=predicted_class,
                confidence=confidence,
                probabilities=probabilities,
                heatmap_path=heatmap_path,
                user_id=user_id,
            )
            result = collection.insert_one(doc)
            doc_id = str(result.inserted_id)
            logger.info(f"Prediction successfully saved to MongoDB (ID: {doc_id})")
            return doc_id
        except Exception as e:
            logger.warning(f"MongoDB save failed ({e}), falling back to SQLite.")

    return _sqlite_save_prediction(
        image_filename=image_filename,
        image_path=image_path,
        predicted_class=predicted_class,
        confidence=confidence,
        probabilities=probabilities,
        heatmap_path=heatmap_path,
        user_id=user_id,
    )


def get_user_prediction_history(
    user_id: str,
    limit: int = 20,
    skip: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """Retrieves prediction records for the user from MongoDB or SQLite."""
    collection = get_predictions_collection()
    if collection is not None:
        try:
            query = {"user_id": str(user_id)}
            total = collection.count_documents(query)
            cursor = (
                collection.find(query)
                .sort("timestamp", -1)
                .skip(max(0, skip))
                .limit(max(1, min(100, limit)))
            )
            items = []
            for doc in cursor:
                img_name = doc.get("image_filename", "")
                items.append({
                    "id": str(doc["_id"]),
                    "image_filename": img_name,
                    "predicted_class": doc.get("predicted_class", ""),
                    "confidence": float(doc.get("confidence", 0.0)),
                    "probabilities": {str(k): float(v) for k, v in doc.get("probabilities", {}).items()},
                    "heatmap_url": f"/static/heatmaps/heatmap_{img_name}" if img_name else None,
                    "image_url": f"/static/uploads/{img_name}" if img_name else None,
                    "timestamp": doc.get("timestamp"),
                })
            return items, total
        except Exception as e:
            logger.warning(f"MongoDB history query failed ({e}), checking SQLite.")

    return _sqlite_get_user_prediction_history(user_id, limit, skip)


def get_user_prediction_by_id(
    prediction_id: str,
    user_id: str,
) -> Optional[Dict[str, Any]]:
    """Retrieves a single prediction by ID for the user from MongoDB or SQLite."""
    collection = get_predictions_collection()
    if collection is not None:
        try:
            user_condition = {"$or": [{"user_id": str(user_id)}, {"user_id": None}]}
            try:
                obj_id = ObjectId(prediction_id) if isinstance(prediction_id, str) and len(prediction_id) == 24 else prediction_id
                doc = collection.find_one({"_id": obj_id, **user_condition})
            except Exception:
                doc = collection.find_one({"_id": str(prediction_id), **user_condition})

            if doc:
                img_name = doc.get("image_filename", "")
                return {
                    "id": str(doc["_id"]),
                    "image_filename": img_name,
                    "image_path": doc.get("image_path"),
                    "heatmap_path": doc.get("heatmap_path"),
                    "predicted_class": doc.get("predicted_class", ""),
                    "confidence": float(doc.get("confidence", 0.0)),
                    "probabilities": {str(k): float(v) for k, v in doc.get("probabilities", {}).items()},
                    "heatmap_url": f"/static/heatmaps/heatmap_{img_name}" if img_name else None,
                    "image_url": f"/static/uploads/{img_name}" if img_name else None,
                    "timestamp": doc.get("timestamp"),
                }
        except Exception as e:
            logger.warning(f"MongoDB get prediction failed ({e}), checking SQLite.")

    return _sqlite_get_user_prediction_by_id(prediction_id, user_id)


# ==========================================
# User Authentication Persistence
# ==========================================

def create_user(name: str, email: str, password_hash: str) -> Dict[str, Any]:
    """
    Registers a new user in MongoDB if available, otherwise seamlessly in SQLite.
    Never fails with ConnectionError when SQLite fallback is ready.
    """
    collection = get_users_collection()
    if collection is not None:
        normalized_email = email.strip().lower()
        try:
            existing = collection.find_one({"email": normalized_email})
            if existing:
                raise DuplicateKeyError("An account with this email address already exists.")

            user_doc = {
                "name": name.strip(),
                "email": normalized_email,
                "password_hash": password_hash,
                "created_at": datetime.now(timezone.utc),
            }
            result = collection.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            return user_doc
        except DuplicateKeyError:
            raise
        except Exception as e:
            logger.warning(f"MongoDB create_user failed ({e}), saving to local SQLite.")

    # SQLite fallback
    return _sqlite_create_user(name, email, password_hash)


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves user by email from MongoDB or SQLite fallback."""
    collection = get_users_collection()
    if collection is not None:
        try:
            normalized_email = email.strip().lower()
            doc = collection.find_one({"email": normalized_email})
            if doc:
                return doc
        except Exception as e:
            logger.warning(f"MongoDB get_user_by_email failed ({e}), checking SQLite.")

    return _sqlite_get_user_by_email(email)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves user by ID from MongoDB or SQLite fallback."""
    collection = get_users_collection()
    if collection is not None:
        try:
            try:
                obj_id = ObjectId(user_id) if isinstance(user_id, str) and len(user_id) == 24 else user_id
                doc = collection.find_one({"_id": obj_id})
            except Exception:
                doc = collection.find_one({"_id": str(user_id)})
            if doc:
                return doc
        except Exception as e:
            logger.warning(f"MongoDB get_user_by_id failed ({e}), checking SQLite.")

    return _sqlite_get_user_by_id(user_id)


def close_mongo_connection():
    """Closes MongoDB connection if open."""
    global _mongo_client
    if _mongo_client is not None:
        try:
            _mongo_client.close()
            logger.info("MongoDB connection closed.")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")
        finally:
            _mongo_client = None
