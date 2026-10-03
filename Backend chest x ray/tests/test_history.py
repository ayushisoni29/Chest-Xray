import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.auth import create_access_token
from main import app

client = TestClient(app)

USER_A_ID = str(ObjectId())
USER_B_ID = str(ObjectId())

USER_A_DOC = {
    "_id": ObjectId(USER_A_ID),
    "name": "Dr. Alice",
    "email": "alice@hospital.org",
    "password_hash": "$2b$12$fakehashA",
    "created_at": datetime.now(timezone.utc),
}

USER_B_DOC = {
    "_id": ObjectId(USER_B_ID),
    "name": "Dr. Bob",
    "email": "bob@hospital.org",
    "password_hash": "$2b$12$fakehashB",
    "created_at": datetime.now(timezone.utc),
}


def auth_headers(user_id: str, email: str = "user@test.org"):
    token = create_access_token(data={"sub": user_id, "email": email})
    return {"Authorization": f"Bearer {token}"}


# 1. Authenticated user can retrieve their own history
def test_get_history_authenticated_success():
    mock_items = [
        {
            "id": str(ObjectId()),
            "image_filename": "scan1.png",
            "predicted_class": "COVID",
            "confidence": 0.95,
            "probabilities": {"COVID": 0.95, "Lung_Opacity": 0.01, "Normal": 0.02, "Pneumonia": 0.01, "Tuberculosis": 0.01},
            "heatmap_url": "/static/heatmaps/heatmap_scan1.png",
            "image_url": "/static/uploads/scan1.png",
            "timestamp": datetime.now(timezone.utc),
        }
    ]

    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_history", return_value=(mock_items, 1)) as mock_hist:

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get("/predictions/history", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["predicted_class"] == "COVID"
        assert data["items"][0]["confidence"] == 0.95
        mock_hist.assert_called_once_with(user_id=USER_A_ID, limit=20, skip=0)


# 2. Unauthenticated user cannot retrieve history (401)
def test_get_history_unauthenticated_rejected():
    response = client.get("/predictions/history")
    assert response.status_code == 401


# 3. User A cannot retrieve User B's history (User Isolation)
def test_user_isolation_user_a_cannot_see_user_b_history():
    user_b_items = [
        {
            "id": str(ObjectId()),
            "image_filename": "scan_b.png",
            "predicted_class": "Pneumonia",
            "confidence": 0.88,
            "probabilities": {"COVID": 0.02, "Lung_Opacity": 0.05, "Normal": 0.02, "Pneumonia": 0.88, "Tuberculosis": 0.03},
            "heatmap_url": "/static/heatmaps/heatmap_scan_b.png",
            "image_url": "/static/uploads/scan_b.png",
            "timestamp": datetime.now(timezone.utc),
        }
    ]

    # When User A calls /predictions/history, the endpoint explicitly passes User A's ID
    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_history", return_value=([], 0)) as mock_hist:

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get("/predictions/history", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0
        # Verified that the query was scoped strictly to USER_A_ID, not USER_B_ID
        mock_hist.assert_called_once_with(user_id=USER_A_ID, limit=20, skip=0)


# 4. History is sorted newest first
def test_history_sorting_newest_first():
    t_newer = datetime.now(timezone.utc)
    t_older = t_newer - timedelta(hours=2)

    mock_items = [
        {
            "id": str(ObjectId()),
            "image_filename": "newer.png",
            "predicted_class": "Normal",
            "confidence": 0.98,
            "probabilities": {"COVID": 0.0, "Lung_Opacity": 0.0, "Normal": 0.98, "Pneumonia": 0.01, "Tuberculosis": 0.01},
            "heatmap_url": "/static/heatmaps/heatmap_newer.png",
            "image_url": "/static/uploads/newer.png",
            "timestamp": t_newer,
        },
        {
            "id": str(ObjectId()),
            "image_filename": "older.png",
            "predicted_class": "Tuberculosis",
            "confidence": 0.91,
            "probabilities": {"COVID": 0.01, "Lung_Opacity": 0.02, "Normal": 0.01, "Pneumonia": 0.05, "Tuberculosis": 0.91},
            "heatmap_url": "/static/heatmaps/heatmap_older.png",
            "image_url": "/static/uploads/older.png",
            "timestamp": t_older,
        },
    ]

    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_history", return_value=(mock_items, 2)):

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get("/predictions/history", headers=headers)

        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 2
        assert items[0]["predicted_class"] == "Normal"
        assert items[1]["predicted_class"] == "Tuberculosis"


# 5. Pagination / limit / skip works
def test_history_pagination_limit_and_skip():
    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_history", return_value=([], 50)) as mock_hist:

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get("/predictions/history?limit=10&skip=20", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["skip"] == 20
        assert data["total"] == 50
        mock_hist.assert_called_once_with(user_id=USER_A_ID, limit=10, skip=20)


# 6. Single prediction retrieval works
def test_get_single_prediction_authenticated_success():
    pred_id = str(ObjectId())
    mock_prediction = {
        "id": pred_id,
        "image_filename": "single_scan.png",
        "predicted_class": "Lung_Opacity",
        "confidence": 0.82,
        "probabilities": {"COVID": 0.05, "Lung_Opacity": 0.82, "Normal": 0.05, "Pneumonia": 0.05, "Tuberculosis": 0.03},
        "heatmap_url": "/static/heatmaps/heatmap_single_scan.png",
        "image_url": "/static/uploads/single_scan.png",
        "timestamp": datetime.now(timezone.utc),
    }

    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_by_id", return_value=mock_prediction) as mock_get:

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get(f"/predictions/{pred_id}", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == pred_id
        assert data["predicted_class"] == "Lung_Opacity"
        assert data["confidence"] == 0.82
        mock_get.assert_called_once_with(prediction_id=pred_id, user_id=USER_A_ID)


# 7. User cannot retrieve another user's prediction by ID (404/Access Denied)
def test_get_single_prediction_another_user_returns_404():
    pred_id = str(ObjectId())

    # Mock returns None because query filters by { _id: pred_id, user_id: USER_A_ID }
    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_by_id", return_value=None):

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get(f"/predictions/{pred_id}", headers=headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


# 8. Missing prediction returns 404
def test_get_single_prediction_missing_returns_404():
    non_existent_id = str(ObjectId())

    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_by_id", return_value=None):

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get(f"/predictions/{non_existent_id}", headers=headers)

        assert response.status_code == 404


# 9. Password fields are never exposed in history or prediction responses
def test_history_response_never_exposes_passwords():
    mock_items = [
        {
            "id": str(ObjectId()),
            "image_filename": "test.png",
            "predicted_class": "Normal",
            "confidence": 0.99,
            "probabilities": {"COVID": 0.0, "Lung_Opacity": 0.0, "Normal": 0.99, "Pneumonia": 0.01, "Tuberculosis": 0.0},
            "heatmap_url": "/static/heatmaps/heatmap_test.png",
            "image_url": "/static/uploads/test.png",
            "timestamp": datetime.now(timezone.utc),
        }
    ]

    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_history", return_value=(mock_items, 1)):

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get("/predictions/history", headers=headers)

        assert response.status_code == 200
        text = response.text
        assert "password" not in text.lower()
        assert "hash" not in text.lower()


# 10. MongoDB failure is handled safely (503 Service Unavailable)
def test_history_handles_mongodb_failure_safely():
    with patch("src.auth.get_user_by_id", return_value=USER_A_DOC), \
         patch("main.get_user_prediction_history", side_effect=ConnectionError("MongoDB offline")):

        headers = auth_headers(USER_A_ID, "alice@hospital.org")
        response = client.get("/predictions/history", headers=headers)

        assert response.status_code == 503
        assert "database" in response.json()["detail"].lower()
