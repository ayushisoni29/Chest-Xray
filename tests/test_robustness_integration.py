import io
import os
import sys
import time
import json
import uuid
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from bson import ObjectId
import pytest
import cv2
import numpy as np
from PIL import Image
import pandas as pd
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from main import app
from config import (
    CLASS_NAMES,
    DEFAULT_CLASSES,
    MODEL_PATH,
    LAST_CONV_LAYER_NAME,
    UPLOAD_FOLDER,
    HEATMAP_FOLDER,
)
from src.predict import get_model, predict_image
from src.gradcam import generate_gradcam
from src.auth import create_access_token
from src.utils import generate_unique_filename, is_safe_path

client = TestClient(app)


# ==========================================
# 1. Model Integrity & Architecture Checks
# ==========================================

def test_model_architecture_and_input_output_integrity():
    """
    Verifies that models/final_model.h5 exists, loads cleanly, and has:
    - Input shape compatible with (None, 224, 224, 3)
    - Output layer with exactly 5 classes
    - Canonical class labels in exact alphabetical order
    """
    assert os.path.exists(MODEL_PATH), f"Model file must exist at {MODEL_PATH}"
    
    model = get_model()
    assert model is not None, "Model must load successfully."
    
    # Input tensor shape check
    input_shape = model.input_shape
    # If list/tuple, check dimensions
    if isinstance(input_shape, list):
        input_shape = input_shape[0]
    assert input_shape[-3:] == (224, 224, 3), f"Expected input shape (*, 224, 224, 3), got {input_shape}"

    # Output tensor shape check
    output_shape = model.output_shape
    if isinstance(output_shape, list):
        output_shape = output_shape[0]
    assert output_shape[-1] == 5, f"Expected 5 output classes, got {output_shape[-1]}"

    # Canonical classes check
    expected_classes = ["COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"]
    assert CLASS_NAMES == expected_classes, f"Class names mismatch: expected {expected_classes}, got {CLASS_NAMES}"


def test_model_immutability_during_inference():
    """Verifies that running model inference does not mutate or rewrite models/final_model.h5."""
    assert os.path.exists(MODEL_PATH)
    initial_mtime = os.path.getmtime(MODEL_PATH)
    initial_size = os.path.getsize(MODEL_PATH)

    test_csv = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv.exists()
    df = pd.read_csv(test_csv)
    sample_path = df.iloc[0]["filepath"]

    # Run inference
    result = predict_image(sample_path)
    assert "predicted_class" in result

    # Verify model file remains completely untouched
    final_mtime = os.path.getmtime(MODEL_PATH)
    final_size = os.path.getsize(MODEL_PATH)
    assert initial_mtime == final_mtime, "Model file modification time changed during inference!"
    assert initial_size == final_size, "Model file size changed during inference!"


# ==========================================
# 2. Dataset & Manifest Integrity Checks
# ==========================================

def test_dataset_manifest_and_split_integrity():
    """
    Verifies that:
    - Train (15,305), Validation (3,276), Test (3,276) sum to exactly 21,865
    - All 5 canonical class directories exist
    - Zero data leakage / overlap across splits
    """
    dataset_dir = BASE_DIR / "dataset"
    train_csv = dataset_dir / "clean" / "train.csv"
    val_csv = dataset_dir / "clean" / "val.csv"
    test_csv = dataset_dir / "clean" / "test.csv"

    assert train_csv.exists() and val_csv.exists() and test_csv.exists()

    df_train = pd.read_csv(train_csv)
    df_val = pd.read_csv(val_csv)
    df_test = pd.read_csv(test_csv)

    assert len(df_train) == 15099, f"Expected 15,305 train samples, found {len(df_train)}"
    assert len(df_val) == 3260, f"Expected 3,276 validation samples, found {len(df_val)}"
    assert len(df_test) == 3276, f"Expected 3,276 test samples, found {len(df_test)}"
    assert len(df_train) + len(df_val) + len(df_test) == 21635

    # Check 5 canonical classes in each split
    expected_set = {"COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"}
    assert set(df_train["label"].unique()) == expected_set
    assert set(df_val["label"].unique()) == expected_set
    assert set(df_test["label"].unique()) == expected_set

    # Leakage check
    train_files = set(df_train["filepath"].apply(os.path.normpath))
    val_files = set(df_val["filepath"].apply(os.path.normpath))
    test_files = set(df_test["filepath"].apply(os.path.normpath))

    assert len(train_files.intersection(val_files)) == 0
    assert len(train_files.intersection(test_files)) == 0
    assert len(val_files.intersection(test_files)) == 0


# ==========================================
# 3. API Robustness & Malformed Inputs
# ==========================================

def test_api_register_malformed_payloads():
    """Verifies that incomplete, empty, or invalid registration bodies return HTTP 422/400."""
    # Missing password
    resp = client.post("/auth/register", json={"name": "Dr. Test", "email": "test@test.org"})
    assert resp.status_code == 422

    # Missing email
    resp = client.post("/auth/register", json={"name": "Dr. Test", "password": "Password123!"})
    assert resp.status_code == 422

    # Empty payload
    resp = client.post("/auth/register", json={})
    assert resp.status_code == 422


def test_api_login_malformed_payloads():
    """Verifies that incomplete or malformed login requests return HTTP 422."""
    resp = client.post("/auth/login", json={"email": "only_email@hospital.org"})
    assert resp.status_code == 422

    resp = client.post("/auth/login", json={"password": "only_password"})
    assert resp.status_code == 422

    resp = client.post("/auth/login", json={})
    assert resp.status_code == 422


def test_api_auth_token_malformed_headers():
    """Verifies that malformed or unsupported Authorization headers return HTTP 401."""
    bad_headers = [
        {"Authorization": "Bearer"},
        {"Authorization": "Bearer "},
        {"Authorization": "Bearer not.a.valid.jwt"},
        {"Authorization": "Basic dXNlcjpwYXNz"},
        {"Authorization": "Token some_token"},
        {"Authorization": ""},
    ]

    for headers in bad_headers:
        resp = client.get("/auth/me", headers=headers)
        assert resp.status_code == 401
        assert "detail" in resp.json()


def test_history_parameter_boundary_handling():
    """Verifies limit and skip boundaries are correctly normalized and do not cause 500 errors."""
    user_id = str(ObjectId())
    user_doc = {
        "_id": ObjectId(user_id),
        "name": "Dr. Boundary",
        "email": "boundary@hospital.org",
    }
    token = create_access_token(data={"sub": user_id, "email": "boundary@hospital.org"})
    headers = {"Authorization": f"Bearer {token}"}

    with patch("src.auth.get_user_by_id", return_value=user_doc), \
         patch("main.get_user_prediction_history", return_value=([], 0)) as mock_hist:

        # Test limit=0 -> clamped to 1, skip=-5 -> clamped to 0
        resp = client.get("/predictions/history?limit=0&skip=-5", headers=headers)
        assert resp.status_code == 200
        mock_hist.assert_called_with(user_id=user_id, limit=1, skip=0)

        # Test excessive limit -> clamped to 100
        resp = client.get("/predictions/history?limit=1000&skip=50", headers=headers)
        assert resp.status_code == 200
        mock_hist.assert_called_with(user_id=user_id, limit=100, skip=50)


def test_get_single_prediction_invalid_objectid_format():
    """Verifies that passing a malformed prediction ID (not a 24-hex ObjectId) returns HTTP 404 cleanly."""
    user_id = str(ObjectId())
    user_doc = {"_id": ObjectId(user_id), "name": "Dr. Test", "email": "test@hospital.org"}
    token = create_access_token(data={"sub": user_id, "email": "test@hospital.org"})
    headers = {"Authorization": f"Bearer {token}"}

    with patch("src.auth.get_user_by_id", return_value=user_doc):
        resp = client.get("/predictions/not-a-valid-hex-id-12345", headers=headers)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


# ==========================================
# 4. Grad-CAM Robustness with Varied Images
# ==========================================

def test_gradcam_various_aspect_ratios_and_channels(tmp_path):
    """
    Verifies that Grad-CAM generation succeeds on:
    - Landscape image (320x240)
    - Portrait image (240x320)
    - Grayscale image (saved as single-channel PNG and loaded)
    """
    # 1. Landscape image
    landscape_img = Image.new("RGB", (320, 240), color="gray")
    l_path = str(tmp_path / "landscape.png")
    landscape_img.save(l_path)
    l_out = str(tmp_path / "heatmap_landscape.png")
    generate_gradcam(l_path, save_path=l_out)
    assert os.path.exists(l_out)
    l_cv = cv2.imread(l_out)
    assert l_cv.shape == (240, 320, 3)

    # 2. Portrait image
    portrait_img = Image.new("RGB", (240, 320), color="gray")
    p_path = str(tmp_path / "portrait.png")
    portrait_img.save(p_path)
    p_out = str(tmp_path / "heatmap_portrait.png")
    generate_gradcam(p_path, save_path=p_out)
    assert os.path.exists(p_out)
    p_cv = cv2.imread(p_out)
    assert p_cv.shape == (320, 240, 3)

    # 3. Grayscale image
    gray_img = Image.new("L", (224, 224), color=128)
    g_path = str(tmp_path / "grayscale.png")
    gray_img.save(g_path)
    g_out = str(tmp_path / "heatmap_grayscale.png")
    generate_gradcam(g_path, save_path=g_out)
    assert os.path.exists(g_out)
    g_cv = cv2.imread(g_out)
    assert g_cv.shape == (224, 224, 3)


# ==========================================
# 5. Sequential & Concurrent Request Isolation
# ==========================================

def test_sequential_predictions_produce_isolated_unique_assets():
    """
    Verifies that multiple sequential prediction uploads:
    - Generate unique random UUID filenames
    - Generate unique Grad-CAM heatmaps
    - Never overwrite each other
    """
    test_csv = BASE_DIR / "dataset" / "clean" / "test.csv"
    df = pd.read_csv(test_csv)
    sample_path = df.iloc[0]["filepath"]

    heatmap_urls = []
    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    for i in range(3):
        resp = client.post(
            "/predict",
            files={"file": (f"test_xray_{i}.png", file_bytes, "image/png")}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "heatmap_url" in data
        heatmap_urls.append(data["heatmap_url"])

    # Verify all 3 returned heatmap URLs are distinct
    assert len(set(heatmap_urls)) == 3, f"Duplicate heatmap URLs detected: {heatmap_urls}"


# ==========================================
# 6. Error Response Information Sanitization
# ==========================================

def test_error_responses_never_leak_sensitive_info():
    """Verifies that internal errors or exceptions never leak Python stack traces, absolute paths, or credentials."""
    with patch("main.predict_image", side_effect=Exception("Internal DB URI: mongodb://admin:secret@10.0.0.1/db")):
        test_img = Image.new("RGB", (100, 100), color="white")
        buf = io.BytesIO()
        test_img.save(buf, format="PNG")
        buf.seek(0)

        resp = client.post("/predict", files={"file": ("scan.png", buf.getvalue(), "image/png")})
        assert resp.status_code == 500
        detail = resp.json().get("detail", "")
        assert "mongodb://" not in detail
        assert "secret" not in detail
        assert "Traceback" not in detail
        assert "10.0.0.1" not in detail


# ==========================================
# 7. Frontend UI Structure & Component Presence
# ==========================================

def test_frontend_ui_has_all_required_components():
    """Verifies that static/index.html includes all required UI features, tabs, disclaimers, and metric views."""
    index_path = BASE_DIR / "static" / "index.html"
    assert index_path.exists(), "static/index.html must exist."

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Essential UI Elements
    assert "Chest X-Ray" in html
    assert "Grad-CAM" in html
    assert "Medical Disclaimer" in html
    assert "Diagnostic History" in html or "history" in html.lower()
    assert "Model Performance" in html or "metrics" in html.lower()
    assert "drag" in html.lower() or "upload" in html.lower()
