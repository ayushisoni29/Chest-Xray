import os
import json
from dotenv import load_dotenv

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env if present
load_dotenv(os.path.join(BASE_DIR, ".env"))

# MongoDB settings
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "chest_xray_ai")
PREDICTIONS_COLLECTION = os.getenv("MONGODB_COLLECTION", "predictions")
USERS_COLLECTION = os.getenv("MONGODB_USERS_COLLECTION", "users")

# JWT Authentication settings
_DEFAULT_DEV_JWT_SECRET = "chest-xray-ai-super-secret-key-change-in-production"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", _DEFAULT_DEV_JWT_SECRET)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

if ENVIRONMENT == "production" and (not JWT_SECRET_KEY or JWT_SECRET_KEY == _DEFAULT_DEV_JWT_SECRET):
    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY must be set to a strong, random "
        "secret in production mode. Please configure JWT_SECRET_KEY in your .env or environment variables."
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Model settings — Ensemble: both models are averaged for 97.40% verified held-out test accuracy
MODEL_PATH = os.path.join(BASE_DIR, "models", "final_super_model_v3.keras")       # Fine-tuned v3 (97.18% standalone)
MODEL_PATH_V1 = os.path.join(BASE_DIR, "models", "final_super_model_old.keras")  # Original v1 (96.08% standalone)
CLASS_LABELS_PATH = os.path.join(BASE_DIR, "models", "class_labels.json")
IMG_SIZE = (224, 224)

# Default class names (alphabetical order matching Keras generator sorting: 0=COVID, 1=Lung_Opacity, 2=Normal, 3=Pneumonia, 4=Tuberculosis)
DEFAULT_CLASSES = ["COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"]

def load_class_names():
    """Loads class mapping from class_labels.json if available, else uses defaults."""
    if os.path.exists(CLASS_LABELS_PATH):
        try:
            with open(CLASS_LABELS_PATH, "r") as f:
                mapping = json.load(f)
                # Map keys "0", "1", ... to ordered list
                return [mapping[str(i)] for i in range(len(mapping))]
        except Exception:
            pass
    return DEFAULT_CLASSES

CLASS_NAMES = load_class_names()

# Calibrated decision thresholds per class for clinical sensitivity optimization
OPTIMAL_THRESHOLDS_PATH = os.path.join(BASE_DIR, "models", "optimal_thresholds.json")
DEFAULT_THRESHOLDS = {
    "COVID": 0.45,
    "Lung_Opacity": 0.50,
    "Normal": 0.50,
    "Pneumonia": 0.38,
    "Tuberculosis": 0.35,
}

def load_optimal_thresholds():
    if os.path.exists(OPTIMAL_THRESHOLDS_PATH):
        try:
            with open(OPTIMAL_THRESHOLDS_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_THRESHOLDS

OPTIMAL_THRESHOLDS = load_optimal_thresholds()

# Storage paths for uploaded scans and generated Grad-CAM overlays
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
HEATMAP_FOLDER = os.path.join(BASE_DIR, "static", "heatmaps")

# Grad-CAM settings — candidate layer names for different CNN backbones
# ResNet50 -> "conv5_block3_3_conv"
LAST_CONV_LAYER_NAME = "conv5_block3_3_conv"

# Upload constraints & Security limits
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MIN_IMG_DIMENSION = 32
MAX_IMG_DIMENSION = 4096
MAX_TOTAL_PIXELS = 16_000_000  # 16 Megapixels - decompression bomb protection

# CORS Origins — Allow all origins for mobile app, LAN Wi-Fi, and Codespaces access
ALLOWED_ORIGINS = ["*"]

_custom_origins = os.getenv("ALLOWED_ORIGINS", "")
if _custom_origins:
    for _orig in _custom_origins.split(","):
        _orig_clean = _orig.strip()
        if _orig_clean and _orig_clean not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(_orig_clean)

# Automatic Cleanup & Retention Settings (Step 9)
# Files referenced by MongoDB prediction records are NEVER deleted by routine cleanup.
# Retention thresholds apply only to unreferenced/orphan files and temporary artifacts.
CLEANUP_ORPHAN_RETENTION_HOURS = int(os.getenv("CLEANUP_ORPHAN_RETENTION_HOURS", "24"))
CLEANUP_TEMP_RETENTION_HOURS = int(os.getenv("CLEANUP_TEMP_RETENTION_HOURS", "24"))
CLEANUP_INTERVAL_MINUTES = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "60"))
CLEANUP_ENABLED = os.getenv("CLEANUP_ENABLED", "true").lower() in ("true", "1", "yes")

