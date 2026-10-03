import os
import sys
from pathlib import Path
import cv2
import numpy as np
import pandas as pd
import pytest
import tensorflow as tf
from fastapi.testclient import TestClient

# Ensure root workspace is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from main import app
from src.predict import get_model, predict_image
from src.gradcam import generate_gradcam, find_conv_layer
from config import LAST_CONV_LAYER_NAME

client = TestClient(app)


def test_target_conv_layer_exists_and_valid():
    """Verifies that the target convolutional layer exists, is Conv2D, and has valid output shape."""
    model = get_model()
    assert model is not None, "Model should be successfully loaded."

    # Look for the target conv layer in base model or root model
    base_submodel = None
    for layer in model.layers:
        if hasattr(layer, "layers"):
            base_submodel = layer
            break

    target_layer = find_conv_layer(base_submodel if base_submodel else model, LAST_CONV_LAYER_NAME)
    assert target_layer is not None, f"Target layer '{LAST_CONV_LAYER_NAME}' must exist in the model."
    assert isinstance(target_layer, tf.keras.layers.Conv2D) or "conv" in target_layer.name.lower()
    
    # Check output shape
    output_shape = target_layer.output.shape
    assert len(output_shape) == 4, f"Target layer output must be 4D (batch, h, w, channels), got {output_shape}"
    assert output_shape[1] == 7 and output_shape[2] == 7, f"Expected 7x7 spatial feature map, got {output_shape}"


def test_gradcam_generation_on_heldout_xray(tmp_path):
    """Verifies that generate_gradcam produces a non-empty, properly sized overlay from a held-out test scan."""
    test_csv_path = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv_path.exists(), "dataset/test.csv manifest must exist."

    test_df = pd.read_csv(test_csv_path)
    assert len(test_df) > 0, "dataset/test.csv must not be empty."

    test_image_path = test_df.iloc[0]["filepath"]
    assert os.path.exists(test_image_path), f"Test scan not found at: {test_image_path}"

    orig_img = cv2.imread(test_image_path)
    assert orig_img is not None, "Original test image should be readable by OpenCV."
    orig_h, orig_w = orig_img.shape[:2]

    # Output path in temp dir
    save_path = str(tmp_path / "gradcam_output.png")
    out_path = generate_gradcam(test_image_path, save_path=save_path, alpha=0.45)

    assert os.path.exists(out_path), "Grad-CAM output file must be created."
    assert os.path.getsize(out_path) > 1000, "Grad-CAM output file size must be non-trivial."

    # Read generated heatmap image and check dimensions and content
    generated_img = cv2.imread(out_path)
    assert generated_img is not None, "Generated Grad-CAM image must be readable by OpenCV."
    gen_h, gen_w, gen_c = generated_img.shape

    assert (gen_h, gen_w) == (orig_h, orig_w), f"Overlay dimensions ({gen_h}, {gen_w}) must match original ({orig_h}, {orig_w})"
    assert gen_c == 3, "Overlay must have 3 color channels (BGR/RGB)."
    assert generated_img.std() > 5.0, "Grad-CAM heatmap should not be a flat or solid color image."


def test_gradcam_invalid_image_path_handling(tmp_path):
    """Verifies that Grad-CAM raises a clean error when provided a non-existent image path."""
    fake_path = "static/uploads/non_existent_scan_12345.png"
    save_path = str(tmp_path / "should_fail.png")

    with pytest.raises((FileNotFoundError, ValueError)):
        generate_gradcam(fake_path, save_path=save_path)


def test_predict_endpoint_returns_valid_gradcam_file():
    """Verifies that POST /predict generates a real Grad-CAM heatmap on disk and returns its accessible URL."""
    test_csv_path = BASE_DIR / "dataset" / "clean" / "test.csv"
    test_df = pd.read_csv(test_csv_path)
    test_image_path = test_df.iloc[0]["filepath"]

    with open(test_image_path, "rb") as f:
        filename = os.path.basename(test_image_path)
        content_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
        response = client.post("/predict", files={"file": (filename, f, content_type)})

    assert response.status_code == 200
    data = response.json()
    assert "heatmap_url" in data
    heatmap_url = data["heatmap_url"]

    # Verify that the heatmap file physically exists in static/heatmaps
    heatmap_rel_path = heatmap_url.lstrip("/")
    heatmap_abs_path = os.path.join(str(BASE_DIR), heatmap_rel_path)
    assert os.path.exists(heatmap_abs_path), f"Heatmap file does not exist on disk at {heatmap_abs_path}"

    # Verify file is readable
    heatmap_img = cv2.imread(heatmap_abs_path)
    assert heatmap_img is not None, "Persisted heatmap file must be readable by OpenCV."
