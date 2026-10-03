import os
import numpy as np
import cv2
from PIL import Image, ImageFile

from config import (
    IMG_SIZE,
    MIN_IMG_DIMENSION,
    MAX_IMG_DIMENSION,
    MAX_TOTAL_PIXELS,
    ALLOWED_EXTENSIONS
)

# Set PIL safety threshold to prevent memory exhaustion / decompression bomb attacks
Image.MAX_IMAGE_PIXELS = MAX_TOTAL_PIXELS
# Strictly reject truncated/incomplete image files rather than attempting partial loading
ImageFile.LOAD_TRUNCATED_IMAGES = False

# Mapping of detected PIL image format identifiers to allowable extensions
FORMAT_TO_EXTENSIONS = {
    "png": {"png"},
    "jpeg": {"jpg", "jpeg"},
    "webp": {"webp"},
}


def is_valid_image_file(filename: str, allowed_extensions: set = ALLOWED_EXTENSIONS) -> bool:
    """
    Validates that the file has a non-empty name and an allowed extension.
    Guards against path traversal characters in extension extraction.
    """
    if not filename or not isinstance(filename, str) or "." not in filename:
        return False
    # Safely extract extension from clean basename
    clean_name = os.path.basename(filename.replace("\\", "/"))
    parts = clean_name.rsplit(".", 1)
    if len(parts) != 2:
        return False
    return parts[1].strip().lower() in allowed_extensions


def validate_image_file_content(
    image_path: str,
    min_dimension: int = MIN_IMG_DIMENSION,
    max_dimension: int = MAX_IMG_DIMENSION,
    max_total_pixels: int = MAX_TOTAL_PIXELS
) -> dict:
    """
    Performs deep content-level image validation:
    1. Verifies non-empty file existence on disk.
    2. Identifies actual image container format (detects extension/content mismatch).
    3. Validates structural integrity (rejects truncated or malformed streams).
    4. Enforces dimension boundaries (minimum resolution & decompression bomb protection).
    5. Verifies raster pixel decodability.
    
    Returns:
        dict: {"format": detected_format, "width": width, "height": height}
    Raises:
        ValueError: On any structural, format, or dimension validation failure.
    """
    if not os.path.exists(image_path):
        raise ValueError("Uploaded file does not exist on disk.")

    file_size = os.path.getsize(image_path)
    if file_size == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")

    # 1. Inspect format and header with PIL
    try:
        with Image.open(image_path) as pil_img:
            img_format = (pil_img.format or "").lower()
            if img_format not in FORMAT_TO_EXTENSIONS:
                raise ValueError(
                    f"Unsupported image format '{img_format.upper()}'. Only PNG, JPG/JPEG, and WEBP formats are supported."
                )

            # Check if file extension matches actual image container
            ext = image_path.rsplit(".", 1)[-1].lower() if "." in image_path else ""
            valid_exts = FORMAT_TO_EXTENSIONS[img_format]
            if ext and ext not in valid_exts:
                raise ValueError(
                    f"Image content format mismatch: file extension '.{ext}' does not match detected image format '{img_format.upper()}'."
                )

            # Inspect dimensions
            w, h = pil_img.size
            if w < min_dimension or h < min_dimension:
                raise ValueError(
                    f"Image resolution ({w}x{h}) is too small. Minimum resolution is {min_dimension}x{min_dimension} pixels."
                )
            if w > max_dimension or h > max_dimension:
                raise ValueError(
                    f"Image resolution ({w}x{h}) exceeds maximum allowed dimensions of {max_dimension}x{max_dimension} pixels."
                )

            total_pixels = w * h
            if total_pixels > max_total_pixels:
                raise ValueError(
                    f"Image total pixel count ({total_pixels:,}) exceeds maximum allowable limit of {max_total_pixels:,} pixels."
                )

            # Structural stream integrity check
            pil_img.verify()

    except ValueError:
        raise
    except Exception as e:
        raise ValueError(
            "Unable to process the uploaded image. Please ensure the file is an uncorrupted chest X-ray image in PNG, JPG, or WEBP format."
        )

    # 2. Verify raster decoding with OpenCV or PIL
    img_cv = cv2.imread(image_path)
    if img_cv is None:
        try:
            with Image.open(image_path) as pil_img:
                pil_img.convert("RGB")
        except Exception:
            raise ValueError(
                "Unable to process the uploaded image. The image bitmap could not be decoded safely."
            )

    return {"format": img_format, "width": w, "height": h}


def apply_clahe_enhancement(img_rgb: np.ndarray) -> np.ndarray:
    """
    Applies Contrast Limited Adaptive Histogram Equalization (CLAHE)
    to highlight subtle lung opacities, consolidations, and lesions.
    Input: RGB numpy array uint8 (H, W, 3)
    Output: Enhanced RGB numpy array uint8 (H, W, 3)
    """
    if len(img_rgb.shape) == 3 and img_rgb.shape[2] == 3:
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_rgb.copy()
        
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)
    enhanced_rgb = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2RGB)
    return enhanced_rgb


def preprocess_image(image_path: str) -> np.ndarray:
    """
    Loads an image from disk, converts to 3-channel RGB, resizes to (224, 224),
    applies CLAHE medical contrast enhancement, and normalizes using ResNet50 ImageNet statistics.
    
    Returns a numpy array of shape (1, 224, 224, 3) ready for model inference.
    """
    import tensorflow as tf

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    # Try reading with OpenCV first
    img = cv2.imread(image_path)
    if img is not None:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        # Fix A: Two-step resize to prevent interpolation artifact shortcuts
        img = cv2.resize(img, (256, 256), interpolation=cv2.INTER_AREA)
        img = cv2.resize(img, IMG_SIZE, interpolation=cv2.INTER_AREA)
    else:
        # Fallback to PIL if OpenCV fails on certain color formats
        try:
            with Image.open(image_path) as pil_img:
                pil_img = pil_img.convert("RGB")
                pil_img = pil_img.resize((256, 256), resample=Image.LANCZOS)
                pil_img = pil_img.resize(IMG_SIZE, resample=Image.LANCZOS)
                img = np.array(pil_img)
        except Exception as e:
            raise ValueError(f"Could not decode image at {image_path}: {e}")

    # 1. Apply CLAHE Medical Radiography Enhancement
    img_enhanced = apply_clahe_enhancement(img)

    # 2. ResNet50 / ImageNet Standardization (zero-centered mean/std)
    img_processed = tf.keras.applications.resnet50.preprocess_input(img_enhanced.astype("float32"))
    img_batch = np.expand_dims(img_processed, axis=0)  # Add batch dimension -> (1, 224, 224, 3)
    return img_batch

