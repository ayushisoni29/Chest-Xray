import os
import json
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


def test_test_manifest_integrity():
    """Verifies that the held-out test manifest exists, is non-empty, and contains exactly 5 canonical classes."""
    test_csv_path = BASE_DIR / "dataset" / "clean" / "test.csv"
    assert test_csv_path.exists(), "dataset/test.csv must exist."

    df = pd.read_csv(test_csv_path)
    assert len(df) == 3276, f"Expected exactly 3,276 test samples, found {len(df)}"

    unique_classes = set(df['label'].unique())
    expected_classes = set(CLASS_NAMES)
    assert unique_classes == expected_classes, f"Class mismatch. Expected {expected_classes}, found {unique_classes}"

    # Verify no nulls in filepaths or labels
    assert df['filepath'].isnull().sum() == 0, "No null filepaths allowed."
    assert df['label'].isnull().sum() == 0, "No null labels allowed."


def test_data_leakage_absence():
    """Verifies zero overlap between train, validation, and test splits (No data leakage)."""
    train_path = BASE_DIR / "dataset" / "clean" / "train.csv"
    val_path = BASE_DIR / "dataset" / "clean" / "val.csv"
    test_path = BASE_DIR / "dataset" / "clean" / "test.csv"

    assert train_path.exists() and val_path.exists() and test_path.exists()

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    train_set = set(train_df['filepath'].apply(os.path.normpath))
    val_set = set(val_df['filepath'].apply(os.path.normpath))
    test_set = set(test_df['filepath'].apply(os.path.normpath))

    assert len(train_set.intersection(test_set)) == 0, "Data leakage detected: Train and Test sets overlap!"
    assert len(val_set.intersection(test_set)) == 0, "Data leakage detected: Val and Test sets overlap!"
    assert len(train_set.intersection(val_set)) == 0, "Data leakage detected: Train and Val sets overlap!"

    assert len(test_df) == len(test_set), "Duplicate records detected in test manifest."


def test_evaluation_artifacts_exist_and_valid():
    """Verifies that generated evaluation artifacts exist, adhere to schema, and confusion matrix is 5x5."""
    metrics_path = BASE_DIR / "evaluation" / "metrics.json"
    metadata_path = BASE_DIR / "evaluation" / "evaluation_metadata.json"
    cm_static_path = BASE_DIR / "static" / "confusion_matrix.png"

    assert metrics_path.exists(), "evaluation/metrics.json must exist."
    assert metadata_path.exists(), "evaluation/evaluation_metadata.json must exist."
    assert cm_static_path.exists(), "static/confusion_matrix.png must exist."

    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Class order check
    assert data["class_order"] == CLASS_NAMES

    # Overall metrics checks
    om = data["overall_metrics"]
    assert om["total_test_samples"] == 3276
    for key in ["accuracy", "macro_precision", "macro_recall", "macro_f1", "weighted_f1"]:
        assert key in om
        val = om[key]
        assert isinstance(val, float)
        assert 0.0 <= val <= 1.0, f"Metric {key}={val} is outside [0.0, 1.0]"

    # Class metrics check
    cm_dict = data["class_metrics"]
    for cls in CLASS_NAMES:
        assert cls in cm_dict
        m = cm_dict[cls]
        assert "precision" in m and "recall" in m and "f1_score" in m and "support" in m
        assert 0.0 <= m["precision"] <= 1.0
        assert 0.0 <= m["recall"] <= 1.0
        assert 0.0 <= m["f1_score"] <= 1.0
        assert m["support"] > 0

    # Confusion matrix checks (5x5, integer sums to 3280)
    raw_cm = data["confusion_matrix_raw"]
    assert len(raw_cm) == 5, "Confusion matrix must have 5 rows."
    total_cm_sum = 0
    for row in raw_cm:
        assert len(row) == 5, "Confusion matrix must have 5 columns."
        total_cm_sum += sum(row)
    assert total_cm_sum == 3276, f"Confusion matrix total sum ({total_cm_sum}) must match test sample count (3276)."


def test_get_model_metrics_api():
    """Verifies that GET /model/metrics returns HTTP 200 and valid JSON data."""
    response = client.get("/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "overall_metrics" in data
    assert "class_metrics" in data
    assert "confusion_matrix_raw" in data
    assert data["overall_metrics"]["total_test_samples"] == 3276
