import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from bson import ObjectId
import pytest
from pymongo.errors import DuplicateKeyError
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from main import app

client = TestClient(app)


def test_password_hashing_and_verification():
    raw_pwd = "DoctorSecretPassword#2026"
    pwd_hash = hash_password(raw_pwd)

    assert pwd_hash != raw_pwd
    assert pwd_hash.startswith("$2b$") or pwd_hash.startswith("$2a$")
    assert verify_password(raw_pwd, pwd_hash) is True
    assert verify_password("WrongPassword123", pwd_hash) is False


def test_jwt_token_lifecycle():
    user_data = {"sub": "user_abc_123", "email": "doctor@hospital.org"}
    token = create_access_token(data=user_data, expires_delta=timedelta(minutes=30))

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user_abc_123"
    assert payload["email"] == "doctor@hospital.org"
    assert "exp" in payload


def test_jwt_token_expiration():
    user_data = {"sub": "user_expired", "email": "expired@hospital.org"}
    # Token expired 10 minutes ago
    expired_token = create_access_token(data=user_data, expires_delta=timedelta(minutes=-10))

    payload = decode_access_token(expired_token)
    assert payload is None


def test_register_user_success():
    mock_id = ObjectId()
    mock_user_doc = {
        "_id": mock_id,
        "name": "Dr. Alice Smith",
        "email": "alice.smith@hospital.org",
        "password_hash": "$2b$12$fakehash",
        "created_at": datetime.now(timezone.utc),
    }

    with patch("main.create_user", return_value=mock_user_doc):
        response = client.post(
            "/auth/register",
            json={
                "name": "Dr. Alice Smith",
                "email": "Alice.Smith@Hospital.Org",  # Case normalization test
                "password": "SecurePassword123!",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["id"] == str(mock_id)
        assert data["user"]["name"] == "Dr. Alice Smith"
        assert data["user"]["email"] == "alice.smith@hospital.org"


def test_register_user_duplicate_email():
    with patch("main.create_user", side_effect=DuplicateKeyError("Email exists")):
        response = client.post(
            "/auth/register",
            json={
                "name": "Dr. Alice Smith",
                "email": "alice.smith@hospital.org",
                "password": "SecurePassword123!",
            },
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]


def test_login_user_success():
    mock_id = ObjectId()
    pwd_hash = hash_password("CorrectPassword123")
    mock_user_doc = {
        "_id": mock_id,
        "name": "Dr. Bob Jones",
        "email": "bob.jones@clinic.org",
        "password_hash": pwd_hash,
        "created_at": datetime.now(timezone.utc),
    }

    with patch("main.get_user_by_email", return_value=mock_user_doc):
        response = client.post(
            "/auth/login",
            json={
                "email": "Bob.Jones@Clinic.org",
                "password": "CorrectPassword123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["id"] == str(mock_id)
        assert data["user"]["name"] == "Dr. Bob Jones"


def test_login_user_invalid_password():
    pwd_hash = hash_password("RealPassword123")
    mock_user_doc = {
        "_id": ObjectId(),
        "name": "Dr. Bob Jones",
        "email": "bob.jones@clinic.org",
        "password_hash": pwd_hash,
    }

    with patch("main.get_user_by_email", return_value=mock_user_doc):
        response = client.post(
            "/auth/login",
            json={
                "email": "bob.jones@clinic.org",
                "password": "WrongPassword!",
            },
        )

        assert response.status_code == 401
        assert "Invalid email address or password" in response.json()["detail"]


def test_login_user_not_found():
    with patch("main.get_user_by_email", return_value=None):
        response = client.post(
            "/auth/login",
            json={
                "email": "unknown@clinic.org",
                "password": "Password123",
            },
        )

        assert response.status_code == 401
        assert "Invalid email address or password" in response.json()["detail"]


def test_get_me_authenticated():
    mock_id = ObjectId()
    mock_user_doc = {
        "_id": mock_id,
        "name": "Dr. Carol White",
        "email": "carol@hospital.org",
        "created_at": datetime.now(timezone.utc),
    }

    token = create_access_token(data={"sub": str(mock_id), "email": "carol@hospital.org"})

    with patch("src.auth.get_user_by_id", return_value=mock_user_doc):
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(mock_id)
        assert data["name"] == "Dr. Carol White"
        assert data["email"] == "carol@hospital.org"


def test_get_me_unauthorized():
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_predict_with_authenticated_user_links_user_id():
    import pandas as pd
    test_csv = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv.exists()
    test_df = pd.read_csv(test_csv)
    image_path = test_df.iloc[0]["filepath"]

    mock_id = str(ObjectId())
    mock_user = {
        "_id": ObjectId(mock_id),
        "name": "Dr. Dave Miller",
        "email": "dave@hospital.org",
        "created_at": datetime.now(timezone.utc),
    }

    token = create_access_token(data={"sub": mock_id, "email": "dave@hospital.org"})

    with patch("src.auth.get_user_by_id", return_value=mock_user), \
         patch("main.save_prediction") as mock_save:

        with open(image_path, "rb") as f:
            filename = os.path.basename(image_path)
            content_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
            response = client.post(
                "/predict",
                files={"file": (filename, f, content_type)},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        mock_save.assert_called_once()
        call_kwargs = mock_save.call_args[1]
        assert call_kwargs["user_id"] == mock_id
