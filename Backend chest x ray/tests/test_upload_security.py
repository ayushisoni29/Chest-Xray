import io
import os
import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from PIL import Image
import pandas as pd
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from main import app
from src.utils import generate_unique_filename, is_safe_path, cleanup_file, get_safe_extension
from src.preprocess import is_valid_image_file, validate_image_file_content
from config import ALLOWED_EXTENSIONS, UPLOAD_FOLDER, HEATMAP_FOLDER, MAX_FILE_SIZE_BYTES

client = TestClient(app)


def test_zero_byte_upload_rejected():
    """Verifies that 0-byte file uploads are rejected with HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("zero_scan.png", b"", "image/png")}
    )
    assert response.status_code == 400
    assert "empty (0 bytes)" in response.json()["detail"]


def test_unsupported_file_extension_rejected():
    """Verifies that unsupported extensions (.pdf, .sh, .exe, .txt) are rejected."""
    for bad_name, mime in [("report.pdf", "application/pdf"), ("script.sh", "text/x-sh"), ("notes.txt", "text/plain")]:
        response = client.post(
            "/predict",
            files={"file": (bad_name, b"some content", mime)}
        )
        assert response.status_code == 400
        assert "Only" in response.json()["detail"] and "files are allowed" in response.json()["detail"]


def test_corrupted_image_content_rejected():
    """Verifies that corrupted raw bytes pretending to be a PNG are rejected safely."""
    response = client.post(
        "/predict",
        files={"file": ("corrupt_scan.png", b"\x89PNG\r\n\x1a\nCorruptedGarbagePayloadBytes12345", "image/png")}
    )
    assert response.status_code == 400
    assert "Unable to process the uploaded image" in response.json()["detail"]


def test_fake_png_bytes_content_mismatch_rejected():
    """Verifies that plain text content disguised as a .png is rejected."""
    text_bytes = b"Hello, this is a plain text file pretending to be an X-Ray image."
    response = client.post(
        "/predict",
        files={"file": ("fake_image.png", text_bytes, "image/png")}
    )
    assert response.status_code == 400
    assert "Unable to process the uploaded image" in response.json()["detail"]


def test_extension_content_mismatch_rejected():
    """Verifies that a valid JPEG container named with a .png extension is detected and rejected."""
    # Create valid JPEG in memory
    jpeg_img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    jpeg_img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("mismatched_extension.png", buf.getvalue(), "image/png")}
    )
    assert response.status_code == 400
    assert "mismatch" in response.json()["detail"] or "Unable to process" in response.json()["detail"]


def test_mime_type_mismatch_handled_safely():
    """Verifies that a genuinely valid PNG with incorrect client MIME (e.g. application/octet-stream) succeeds based on verified content."""
    png_img = Image.new("RGB", (100, 100), color="gray")
    buf = io.BytesIO()
    png_img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("valid_scan.png", buf.getvalue(), "application/octet-stream")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "predicted_class" in data
    assert "heatmap_url" in data


def test_oversized_file_rejected():
    """Verifies that files exceeding 10 MB are rejected with HTTP 400."""
    # Simulate an 11 MB payload
    fake_large_payload = b"0" * (11 * 1024 * 1024)
    response = client.post(
        "/predict",
        files={"file": ("huge_scan.png", fake_large_payload, "image/png")}
    )
    assert response.status_code == 400
    assert "exceeds maximum allowed size" in response.json()["detail"]


def test_excessive_image_dimensions_rejected():
    """Verifies that dimensions exceeding 4096x4096 are rejected (Decompression bomb protection)."""
    # Create image with dimensions 4097 x 100
    oversized_img = Image.new("RGB", (4097, 100), color="white")
    buf = io.BytesIO()
    oversized_img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("oversized_dim.png", buf.getvalue(), "image/png")}
    )
    assert response.status_code == 400
    assert "exceeds maximum allowed dimensions" in response.json()["detail"] or "Unable to process" in response.json()["detail"]


def test_sub_resolution_tiny_image_rejected():
    """Verifies that images smaller than 32x32 pixels are rejected."""
    tiny_img = Image.new("RGB", (16, 16), color="black")
    buf = io.BytesIO()
    tiny_img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("tiny_scan.png", buf.getvalue(), "image/png")}
    )
    assert response.status_code == 400
    assert "too small" in response.json()["detail"]


def test_path_traversal_forward_slash_sanitized():
    """Verifies that forward-slash directory traversal attempts (../../evil.png) cannot escape upload folder."""
    traversal_name = "../../../evil.png"
    safe_name = generate_unique_filename(traversal_name, ALLOWED_EXTENSIONS)
    assert not safe_name.startswith("..")
    assert "/" not in safe_name
    assert safe_name.endswith(".png")

    target_path = os.path.join(UPLOAD_FOLDER, safe_name)
    assert is_safe_path(UPLOAD_FOLDER, target_path) is True


def test_path_traversal_backward_slash_sanitized():
    """Verifies that Windows backward-slash traversal (..\\..\\evil.jpg) is neutralized."""
    traversal_name = "..\\..\\..\\evil.jpg"
    safe_name = generate_unique_filename(traversal_name, ALLOWED_EXTENSIONS)
    assert "\\" not in safe_name
    assert not safe_name.startswith("..")
    assert safe_name.endswith(".jpg")

    target_path = os.path.join(UPLOAD_FOLDER, safe_name)
    assert is_safe_path(UPLOAD_FOLDER, target_path) is True


def test_windows_absolute_path_sanitized():
    """Verifies that Windows absolute drive paths (C:\\Windows\\System32\\scan.png) are neutralized."""
    win_abs_name = "C:\\Windows\\System32\\scan.png"
    safe_name = generate_unique_filename(win_abs_name, ALLOWED_EXTENSIONS)
    assert ":" not in safe_name
    assert "\\" not in safe_name
    assert safe_name.endswith(".png")


def test_safe_uuid_filename_generation():
    """Verifies that generated filenames are random 32-character hex UUIDs with sanitized extension."""
    name1 = generate_unique_filename("patient_xray.png", ALLOWED_EXTENSIONS)
    name2 = generate_unique_filename("patient_xray.png", ALLOWED_EXTENSIONS)
    assert name1 != name2
    assert len(name1.split(".")[0]) == 32
    assert name1.endswith(".png")


def test_valid_png_upload_succeeds():
    """Verifies that a valid PNG radiograph from the test set processes successfully."""
    test_csv = BASE_DIR / "dataset" / "clean" / "test.csv"
    df = pd.read_csv(test_csv)
    sample_path = df.iloc[0]["filepath"]

    with open(sample_path, "rb") as f:
        resp = client.post("/predict", files={"file": ("test_scan.png", f, "image/png")})

    assert resp.status_code == 200
    data = resp.json()
    assert "predicted_class" in data
    assert "confidence" in data
    assert "heatmap_url" in data


def test_valid_jpeg_upload_succeeds():
    """Verifies that a valid JPEG format radiograph processes successfully."""
    img = Image.new("RGB", (224, 224), color="gray")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    resp = client.post("/predict", files={"file": ("scan.jpg", buf.getvalue(), "image/jpeg")})
    assert resp.status_code == 200
    data = resp.json()
    assert "predicted_class" in data
    assert "confidence" in data


def test_valid_webp_upload_succeeds():
    """Verifies that a valid WEBP format radiograph processes successfully."""
    img = Image.new("RGB", (224, 224), color="gray")
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    buf.seek(0)

    resp = client.post("/predict", files={"file": ("scan.webp", buf.getvalue(), "image/webp")})
    assert resp.status_code == 200
    data = resp.json()
    assert "predicted_class" in data
    assert "confidence" in data


def test_sanitized_error_response_no_stack_traces_or_paths():
    """Verifies that server error details do not expose internal paths or stack traces."""
    with patch("main.predict_image", side_effect=RuntimeError("Internal GPU failure at D:\\Secret\\Path\\model.py")):
        img = Image.new("RGB", (100, 100), color="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        resp = client.post("/predict", files={"file": ("scan.png", buf.getvalue(), "image/png")})
        assert resp.status_code == 500
        detail = resp.json()["detail"]
        assert "Unable to process the uploaded image." in detail
        assert "Traceback" not in detail
        assert "Secret" not in detail
        assert "model.py" not in detail


def test_partial_file_cleanup_on_failure():
    """Verifies that uploaded files are deleted from disk if processing fails during inference."""
    captured_upload_path = []

    def mock_failing_predict(path):
        captured_upload_path.append(path)
        assert os.path.exists(path), "File should temporarily exist before failure"
        raise RuntimeError("Simulated inference crash")

    with patch("main.predict_image", side_effect=mock_failing_predict):
        img = Image.new("RGB", (100, 100), color="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        resp = client.post("/predict", files={"file": ("temp_scan.png", buf.getvalue(), "image/png")})
        assert resp.status_code == 500

    assert len(captured_upload_path) == 1
    assert not os.path.exists(captured_upload_path[0]), "Uploaded file must be cleaned up after failure!"


def test_is_safe_path_utility():
    """Verifies the is_safe_path utility correctly catches traversal attacks."""
    base = os.path.abspath("static/uploads")
    safe_child = os.path.join(base, "abc.png")
    unsafe_escape = os.path.join(base, "..", "secret.txt")
    unsafe_win_root = "C:\\Windows\\System32\\cmd.exe"

    assert is_safe_path(base, safe_child) is True
    assert is_safe_path(base, unsafe_escape) is False
    assert is_safe_path(base, unsafe_win_root) is False
