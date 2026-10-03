import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, DuplicateKeyError

from config import (
    MONGODB_URI,
    MONGODB_DATABASE,
    PREDICTIONS_COLLECTION,
    USERS_COLLECTION,
)

logger = logging.getLogger("chest_xray_api.database")

_mongo_client: Optional[MongoClient] = None


def get_mongo_client() -> Optional[MongoClient]:
    """
    Returns a thread-safe singleton MongoClient instance.
    Uses short serverSelectionTimeoutMS so requests never hang if MongoDB is unavailable.
    """
    global _mongo_client
    if _mongo_client is None:
        try:
            if not MONGODB_URI:
                logger.warning("MONGODB_URI not configured. Database persistence disabled.")
                return None
            _mongo_client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
            )
            logger.info("MongoDB client initialized.")
            ensure_indexes(_mongo_client)
        except Exception as e:
            logger.error(f"Failed to initialize MongoDB client: {e}")
            _mongo_client = None
    return _mongo_client


def ensure_indexes(client: Optional[MongoClient] = None):
    """Creates necessary indexes (e.g. unique email on users, user_id/timestamp on predictions)."""
    if client is None:
        client = _mongo_client
    if client is None:
        return
    try:
        db = client[MONGODB_DATABASE]
        # Users unique email index
        users_col = db[USERS_COLLECTION]
        users_col.create_index([("email", ASCENDING)], unique=True)

        # Predictions user_id and timestamp index for efficient history queries
        pred_col = db[PREDICTIONS_COLLECTION]
        pred_col.create_index([("user_id", ASCENDING), ("timestamp", -1)])
        pred_col.create_index([("timestamp", -1)])
    except Exception as e:
        logger.warning(f"Could not verify/create MongoDB indexes: {e}")


def get_predictions_collection() -> Optional[Collection]:
    """Returns the predictions collection or None if MongoDB client is unavailable."""
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
    """Returns the users collection or None if MongoDB client is unavailable."""
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
# Prediction Persistence
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
    """
    Constructs the standardized prediction document for MongoDB insertion.
    Uses a timezone-aware UTC datetime for the timestamp.
    """
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
    Persists a prediction record to the MongoDB predictions collection.
    Gracefully catches any connection/insertion errors and returns None without
    disrupting the machine learning inference pipeline.
    Returns the stringified ObjectId on success.
    """
    try:
        collection = get_predictions_collection()
        if collection is None:
            logger.warning("MongoDB collection unavailable. Skipping prediction storage.")
            return None

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

    except (ServerSelectionTimeoutError, PyMongoError) as e:
        logger.error(f"MongoDB storage error (gracefully degraded): {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error saving prediction to MongoDB: {e}")
        return None


def get_user_prediction_history(
    user_id: str,
    limit: int = 20,
    skip: int = 0,
) -> tuple[list[Dict[str, Any]], int]:
    """
    Retrieves prediction records belonging ONLY to the specified user_id.
    Sorted descending by timestamp (newest first).
    Returns a tuple of (items_list, total_count).
    """
    collection = get_predictions_collection()
    if collection is None:
        raise ConnectionError("Database connection is unavailable.")

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

    except (ServerSelectionTimeoutError, PyMongoError) as e:
        logger.error(f"MongoDB error querying prediction history: {e}")
        raise ConnectionError(f"Database error querying history: {e}")
    except Exception as e:
        logger.error(f"Unexpected error querying prediction history: {e}")
        raise


def get_user_prediction_by_id(
    prediction_id: str,
    user_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single prediction by ObjectId and verifies ownership by user_id.
    Returns None if the prediction does not exist OR belongs to a different user.
    """
    collection = get_predictions_collection()
    if collection is None:
        raise ConnectionError("Database connection is unavailable.")

    try:
        try:
            obj_id = ObjectId(prediction_id) if isinstance(prediction_id, str) else prediction_id
        except Exception:
            # Invalid ObjectId string format
            return None

        doc = collection.find_one({"_id": obj_id, "user_id": str(user_id)})
        if not doc:
            return None

        img_name = doc.get("image_filename", "")
        return {
            "id": str(doc["_id"]),
            "image_filename": img_name,
            "predicted_class": doc.get("predicted_class", ""),
            "confidence": float(doc.get("confidence", 0.0)),
            "probabilities": {str(k): float(v) for k, v in doc.get("probabilities", {}).items()},
            "heatmap_url": f"/static/heatmaps/heatmap_{img_name}" if img_name else None,
            "image_url": f"/static/uploads/{img_name}" if img_name else None,
            "timestamp": doc.get("timestamp"),
        }

    except (ServerSelectionTimeoutError, PyMongoError) as e:
        logger.error(f"MongoDB error querying single prediction: {e}")
        raise ConnectionError(f"Database error querying prediction: {e}")
    except Exception as e:
        logger.error(f"Unexpected error querying single prediction: {e}")
        raise


# ==========================================
# User Account Persistence
# ==========================================

def create_user(name: str, email: str, password_hash: str) -> Dict[str, Any]:
    """
    Creates a new user record in the MongoDB users collection.
    Email is normalized to lowercase and trimmed.
    Raises DuplicateKeyError if email is already registered.
    Raises ConnectionError if database is unreachable.
    """
    collection = get_users_collection()
    if collection is None:
        raise ConnectionError("Database connection is unavailable.")

    normalized_email = email.strip().lower()

    try:
        # Manual check as safeguard in addition to unique index
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
    except (ServerSelectionTimeoutError, PyMongoError) as e:
        logger.error(f"MongoDB connection error during user creation: {e}")
        raise ConnectionError(f"Database error during user registration: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during user creation: {e}")
        raise


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user document by normalized email address."""
    collection = get_users_collection()
    if collection is None:
        raise ConnectionError("Database connection is unavailable.")
    try:
        normalized_email = email.strip().lower()
        return collection.find_one({"email": normalized_email})
    except (ServerSelectionTimeoutError, PyMongoError) as e:
        logger.error(f"MongoDB connection error querying user by email: {e}")
        raise ConnectionError(f"Database error querying user by email: {e}")
    except Exception as e:
        logger.error(f"Error querying user by email: {e}")
        return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user document by its stringified ObjectId."""
    collection = get_users_collection()
    if collection is None:
        raise ConnectionError("Database connection is unavailable.")
    try:
        obj_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
        return collection.find_one({"_id": obj_id})
    except (ServerSelectionTimeoutError, PyMongoError) as e:
        logger.error(f"MongoDB connection error querying user by ID: {e}")
        raise ConnectionError(f"Database error querying user by ID: {e}")
    except Exception as e:
        logger.error(f"Error querying user by ID: {e}")
        return None


def close_mongo_connection():
    """Closes the MongoDB client connection if open."""
    global _mongo_client
    if _mongo_client is not None:
        try:
            _mongo_client.close()
            logger.info("MongoDB connection closed.")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")
        finally:
            _mongo_client = None
