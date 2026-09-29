import io
import os
import sys
from pathlib import Path
import pytest
from PIL import Image
import pandas as pd
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from main import app
from src.preprocess import is_valid_image_file, validate_image_file_content
from config import ALLOWED_EXTENSIONS

client = TestClient(app)


def test_reject_empty_file():
    """Verifies that an empty (0 bytes) upload is rejected with HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("empty_scan.png", b"", "image/png")}
    )
    assert response.status_code == 400
    assert "empty (0 bytes)" in response.json()["detail"]


def test_reject_unsupported_file_extension():
    """Verifies that non-image extensions (.pdf, .txt, .exe) are rejected with HTTP 400."""
    for bad_name, mime in [("report.pdf", "application/pdf"), ("notes.txt", "text/plain"), ("script.sh", "text/x-sh")]:
        response = client.post(
            "/predict",
            files={"file": (bad_name, b"Dummy content bytes", mime)}
        )
        assert response.status_code == 400
        assert "Only" in response.json()["detail"]


def test_reject_corrupted_image_content():
    """Verifies that a corrupted file with a .png extension is safely rejected without exposing stack traces."""
    corrupted_bytes = b"NOT_A_REAL_PNG_HEADER_DATA_CORRUPT"
    response = client.post(
        "/predict",
        files={"file": ("corrupted.png", corrupted_bytes, "image/png")}
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Unable to process" in detail or "Unable to decode" in detail or "valid" in detail
    assert "Traceback" not in detail
    assert "File \"" not in detail


def test_reject_tiny_sub_resolution_image():
    """Verifies that images smaller than minimum valid dimensions (e.g. 4x4 pixels) are rejected."""
    tiny_img = Image.new("RGB", (4, 4), color="black")
    buf = io.BytesIO()
    tiny_img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("tiny_scan.png", buf.getvalue(), "image/png")}
    )
    assert response.status_code == 400
    assert "too small" in response.json()["detail"]


def test_valid_image_returns_expected_schema():
    """Verifies that a valid held-out test scan returns HTTP 200 with all required response keys."""
    test_csv_path = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv_path.exists()
    test_df = pd.read_csv(test_csv_path)
    test_image_path = test_df.iloc[0]["filepath"]

    with open(test_image_path, "rb") as f:
        response = client.post(
            "/predict",
            files={"file": (os.path.basename(test_image_path), f, "image/png")}
        )

    assert response.status_code == 200
    data = response.json()
    assert "predicted_class" in data
    assert "confidence" in data
    assert "all_class_probabilities" in data
    assert "heatmap_url" in data
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0


def test_medical_disclaimer_in_frontend():
    """Verifies that static/index.html includes the required medical disclaimers and research notices."""
    index_path = BASE_DIR / "static" / "index.html"
    assert index_path.exists()

    with open(index_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    assert "Medical Disclaimer" in html_content
    assert "not a definitive medical diagnosis" in html_content
    assert "Research/Educational Use Only" in html_content
    assert "Do not make medical decisions based solely on this result" in html_content
