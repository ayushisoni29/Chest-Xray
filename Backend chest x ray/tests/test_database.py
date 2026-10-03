import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from bson import ObjectId
import pytest
from pymongo.errors import ServerSelectionTimeoutError, PyMongoError
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.database import (
    format_prediction_document,
    save_prediction,
    get_predictions_collection,
    get_mongo_client,
)
from main import app

client = TestClient(app)


def test_format_prediction_document():
    """Verifies that format_prediction_document generates a valid dictionary schema."""
    fixed_time = datetime(2026, 9, 23, 12, 0, 0, tzinfo=timezone.utc)
    probs = {
        "COVID": 0.05,
        "Lung_Opacity": 0.10,
        "Normal": 0.80,
        "Pneumonia": 0.03,
        "Tuberculosis": 0.02,
    }

    doc = format_prediction_document(
        image_filename="test_scan.png",
        image_path="/path/to/test_scan.png",
        predicted_class="Normal",
        confidence=0.80,
        probabilities=probs,
        heatmap_path="/path/to/heatmap.png",
        user_id="user_123",
        timestamp=fixed_time,
    )

    assert doc["image_filename"] == "test_scan.png"
    assert doc["image_path"] == "/path/to/test_scan.png"
    assert doc["predicted_class"] == "Normal"
    assert doc["confidence"] == 0.80
    assert doc["probabilities"] == probs
    assert doc["heatmap_path"] == "/path/to/heatmap.png"
    assert doc["user_id"] == "user_123"
    assert doc["timestamp"] == fixed_time
    assert isinstance(doc["timestamp"], datetime)


def test_save_prediction_successful_mock():
    """Verifies that save_prediction inserts a document and returns the stringified ObjectId."""
    mock_id = ObjectId()
    mock_collection = MagicMock()
    mock_collection.insert_one.return_value = MagicMock(inserted_id=mock_id)

    probs = {"COVID": 0.1, "Lung_Opacity": 0.1, "Normal": 0.7, "Pneumonia": 0.05, "Tuberculosis": 0.05}

    with patch("src.database.get_predictions_collection", return_value=mock_collection):
        result_id = save_prediction(
            image_filename="patient_xray.png",
            image_path="static/uploads/patient_xray.png",
            predicted_class="Normal",
            confidence=0.70,
            probabilities=probs,
            heatmap_path="static/heatmaps/heatmap_patient_xray.png",
        )

        assert result_id == str(mock_id)
        mock_collection.insert_one.assert_called_once()
        inserted_doc = mock_collection.insert_one.call_args[0][0]
        assert inserted_doc["predicted_class"] == "Normal"
        assert inserted_doc["user_id"] is None
        assert isinstance(inserted_doc["timestamp"], datetime)


def test_save_prediction_graceful_degradation_on_mongo_error():
    """Verifies that save_prediction returns None and does not raise exceptions when MongoDB errors occur."""
    mock_collection = MagicMock()
    mock_collection.insert_one.side_effect = ServerSelectionTimeoutError("No MongoDB server found")

    probs = {"COVID": 0.0, "Lung_Opacity": 0.0, "Normal": 1.0, "Pneumonia": 0.0, "Tuberculosis": 0.0}

    with patch("src.database.get_predictions_collection", return_value=mock_collection):
        # Should gracefully return None and NOT raise ServerSelectionTimeoutError
        result_id = save_prediction(
            image_filename="scan.png",
            image_path="path/scan.png",
            predicted_class="Normal",
            confidence=1.0,
            probabilities=probs,
            heatmap_path="path/heatmap.png",
        )

        assert result_id is None


def test_save_prediction_when_collection_is_none():
    """Verifies that save_prediction safely returns None when collection cannot be retrieved."""
    with patch("src.database.get_predictions_collection", return_value=None):
        result_id = save_prediction(
            image_filename="scan.png",
            image_path="path/scan.png",
            predicted_class="Normal",
            confidence=1.0,
            probabilities={"Normal": 1.0},
            heatmap_path="path/heatmap.png",
        )
        assert result_id is None


def test_predict_endpoint_database_called_and_graceful():
    """Verifies that /predict calls save_prediction and returns HTTP 200 even if MongoDB fails."""
    import pandas as pd
    test_csv = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv.exists()
    test_df = pd.read_csv(test_csv)
    image_path = test_df.iloc[0]["filepath"]

    with patch("main.save_prediction") as mock_save:
        mock_save.return_value = None  # Simulate DB offline

        with open(image_path, "rb") as f:
            filename = os.path.basename(image_path)
            content_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
            response = client.post("/predict", files={"file": (filename, f, content_type)})

        assert response.status_code == 200
        data = response.json()
        assert "predicted_class" in data
        assert "confidence" in data
        assert "all_class_probabilities" in data
        assert "heatmap_url" in data

        # Verify save_prediction was invoked with correct arguments
        mock_save.assert_called_once()
        call_kwargs = mock_save.call_args[1]
        assert call_kwargs["predicted_class"] == data["predicted_class"]
        assert call_kwargs["confidence"] == data["confidence"]
        assert call_kwargs["probabilities"] == data["all_class_probabilities"]
