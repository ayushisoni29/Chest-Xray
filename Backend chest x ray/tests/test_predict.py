import os
import sys
from pathlib import Path
import pandas as pd
import pytest
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from main import app
from config import CLASS_NAMES

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True


def test_predict_invalid_file_extension():
    response = client.post(
        "/predict",
        files={"file": ("report.pdf", b"%PDF-1.4 test content", "application/pdf")},
    )
    assert response.status_code == 400
    assert "Only" in response.json()["detail"] and "files are allowed" in response.json()["detail"]


def test_predict_test_manifest_xray():
    test_csv_path = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv_path.exists(), "dataset/test.csv manifest must exist."

    test_df = pd.read_csv(test_csv_path)
    assert len(test_df) > 0, "dataset/test.csv must not be empty."

    # Pick the first valid test image path from the official held-out test split
    test_image_path = test_df.iloc[0]["filepath"]
    assert os.path.exists(test_image_path), f"Test scan not found at: {test_image_path}"

    with open(test_image_path, "rb") as f:
        filename = os.path.basename(test_image_path)
        content_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
        response = client.post("/predict", files={"file": (filename, f, content_type)})

    assert response.status_code == 200, f"Prediction failed with response: {response.text}"
    data = response.json()
    assert "predicted_class" in data
    assert data["predicted_class"] in CLASS_NAMES
    assert "confidence" in data
    assert "all_class_probabilities" in data
    assert "heatmap_url" in data
    assert isinstance(data["confidence"], float)
    assert data["heatmap_url"].startswith("/static/heatmaps/")

    # Verify all 5 classes are present and probabilities sum approximately to 1.0
    for cls in CLASS_NAMES:
        assert cls in data["all_class_probabilities"]
    prob_sum = sum(data["all_class_probabilities"].values())
    assert 0.99 <= prob_sum <= 1.01, f"Probabilities sum should be ~1.0, got {prob_sum}"


def test_ood_natural_color_image_rejected():
    """Verifies that non-X-ray colorful images (selfies, natural photos) are rejected by the OOD filter."""
    import io
    from PIL import Image

    # Create a vivid natural color image (high saturation)
    color_img = Image.new("RGB", (224, 224), color=(255, 60, 20))
    buf = io.BytesIO()
    color_img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("natural_photo.png", buf.getvalue(), "image/png")}
    )
    assert response.status_code == 400
    assert "Out-of-Distribution" in response.json()["detail"]


def test_predict_returns_calibrated_thresholds():
    """Verifies that the prediction endpoint returns calibrated per-class optimal thresholds and clinical flags."""
    test_csv_path = BASE_DIR / "dataset" / "clean" / "test.csv"
    test_df = pd.read_csv(test_csv_path)
    test_image_path = test_df.iloc[0]["filepath"]

    with open(test_image_path, "rb") as f:
        filename = os.path.basename(test_image_path)
        content_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
        response = client.post("/predict", files={"file": (filename, f, content_type)})

    assert response.status_code == 200
    data = response.json()
    assert "calibrated_thresholds" in data
    assert "clinical_flags" in data
    assert isinstance(data["calibrated_thresholds"], dict)
    assert "Tuberculosis" in data["calibrated_thresholds"]
    assert "Pneumonia" in data["calibrated_thresholds"]
    assert isinstance(data["clinical_flags"], list)
