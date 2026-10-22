import os
import numpy as np
import cv2
from PIL import Image, ImageFile

from config import (
    IMG_SIZE,
    MIN_IMG_DIMENSION,
    MAX_IMG_DIMENSION,
    MAX_TOTAL_PIXELS,
    ALLOWED_EXTENSIONS,
)

# PIL safety settings
Image.MAX_IMAGE_PIXELS = MAX_TOTAL_PIXELS
ImageFile.LOAD_TRUNCATED_IMAGES = False

# Supported image formats and extensions
FORMAT_TO_EXTENSIONS = {
    "png": {"png"},
    "jpeg": {"jpg", "jpeg"},
    "webp": {"webp"},
}


def is_valid_image_file(
    filename: str,
    allowed_extensions: set = ALLOWED_EXTENSIONS,
) -> bool:
    """Check whether the filename has an allowed image extension."""
    if not filename or not isinstance(filename, str) or "." not in filename:
        return False

    clean_name = os.path.basename(filename.replace("\\", "/"))
    parts = clean_name.rsplit(".", 1)

    if len(parts) != 2:
        return False

    return parts[1].strip().lower() in allowed_extensions


def validate_image_file_content(
    image_path: str,
    min_dimension: int = MIN_IMG_DIMENSION,
    max_dimension: int = MAX_IMG_DIMENSION,
    max_total_pixels: int = MAX_TOTAL_PIXELS,
) -> dict:
    """
    Validate image format, integrity, dimensions and pixel count.
    Returns format, width and height.
    Raises ValueError if validation fails.
    """
    if not os.path.exists(image_path):
        raise ValueError("Uploaded file does not exist on disk.")

    if os.path.getsize(image_path) == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")

    try:
        with Image.open(image_path) as pil_img:
            img_format = (pil_img.format or "").lower()

            if img_format not in FORMAT_TO_EXTENSIONS:
                raise ValueError(
                    "Unsupported image format. Only PNG, JPG/JPEG, "
                    "and WEBP formats are supported."
                )

            extension = (
                image_path.rsplit(".", 1)[-1].lower()
                if "." in image_path
                else ""
            )

            valid_extensions = FORMAT_TO_EXTENSIONS[img_format]

            if extension and extension not in valid_extensions:
                raise ValueError(
                    f"Image content format mismatch: file extension '.{extension}' does not match detected image format '{img_format.upper()}'."
                )

            width, height = pil_img.size

            if width < min_dimension or height < min_dimension:
                raise ValueError(
                    f"Image resolution ({width}x{height}) is too small. "
                    f"Minimum dimension is {min_dimension} pixels."
                )

            if width > max_dimension or height > max_dimension:
                raise ValueError(
                    f"Image resolution ({width}x{height}) exceeds maximum allowed dimensions of {max_dimension}x{max_dimension} pixels."
                )

            total_pixels = width * height

            if total_pixels > max_total_pixels:
                raise ValueError(
                    "Image exceeds the maximum allowed pixel count."
                )

            pil_img.verify()

    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(
            "Unable to process the uploaded image. "
            "Please upload a valid PNG, JPG, or WEBP image."
        ) from exc

    # Verify that the image pixels can be decoded.
    img_cv = cv2.imread(image_path)

    if img_cv is None:
        try:
            with Image.open(image_path) as pil_img:
                pil_img.convert("RGB")
        except Exception as exc:
            raise ValueError(
                "The uploaded image could not be decoded."
            ) from exc

    return {
        "format": img_format,
        "width": width,
        "height": height,
    }


def validate_chest_xray_domain(image_path: str) -> None:
    """
    Out-of-Distribution (OOD) filter:
    Validates whether the image possesses characteristics of a chest radiograph.
    Chest radiographs are inherently monochrome / grayscale with very low color saturation.
    If an image exhibits high saturation (e.g., natural color photos, selfies, animals, cars),
    it is rejected with a clear clinical explanation.
    """
    img = cv2.imread(image_path)
    if img is None:
        return

    # Convert to HSV color space to inspect color saturation
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]

    mean_sat = float(np.mean(saturation))
    high_sat_ratio = float(np.sum(saturation > 50) / saturation.size)

    # Authentic chest X-rays have mean saturation near 0.
    # Natural photos typically have mean_sat > 45 and significant high-saturation pixels.
    if mean_sat > 45.0 and high_sat_ratio > 0.25:
        raise ValueError(
            "Out-of-Distribution Image: The uploaded file appears to be a natural color photograph "
            "rather than a chest radiograph. Please upload a standard chest X-ray image (PA/AP view)."
        )


def calculate_blur_score(image_path: str) -> float:
    """
    Calculate image sharpness using Laplacian variance.
    Lower scores often indicate blur, but the threshold
    must be calibrated on real X-ray samples.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    if img is None:
        raise ValueError("Unable to read image for blur detection.")

    height, width = img.shape
    max_size = 512
    scale = min(1.0, max_size / max(height, width))

    if scale < 1.0:
        new_width = max(1, round(width * scale))
        new_height = max(1, round(height * scale))

        img = cv2.resize(
            img,
            (new_width, new_height),
            interpolation=cv2.INTER_AREA,
        )

    return float(cv2.Laplacian(img, cv2.CV_64F).var())


def apply_clahe_enhancement(img_rgb: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE contrast enhancement to an RGB image.
    Returns an RGB image.
    """
    if len(img_rgb.shape) == 3 and img_rgb.shape[2] == 3:
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_rgb.copy()

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    enhanced_gray = clahe.apply(gray)
    enhanced_rgb = cv2.cvtColor(
        enhanced_gray,
        cv2.COLOR_GRAY2RGB,
    )

    return enhanced_rgb


def preprocess_image(image_path: str) -> np.ndarray:
    """
    Loads an image from disk, converts it to 3-channel RGB, resizes it
    to the model input size, and normalizes pixel values to [0, 1].

    Returns a numpy array ready for model inference.
    """

    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"Image not found at path: {image_path}"
        )

    img = cv2.imread(image_path)

    if img is not None:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(
            img,
            (256, 256),
            interpolation=cv2.INTER_AREA,
        )
        img = cv2.resize(
            img,
            IMG_SIZE,
            interpolation=cv2.INTER_AREA,
        )
    else:
        try:
            with Image.open(image_path) as pil_img:
                pil_img = pil_img.convert("RGB")
                pil_img = pil_img.resize(
                    (256, 256),
                    resample=Image.LANCZOS,
                )
                pil_img = pil_img.resize(
                    IMG_SIZE,
                    resample=Image.LANCZOS,
                )
                img = np.array(pil_img)
        except Exception as exc:
            raise ValueError(
                f"Could not decode image: {exc}"
            ) from exc

    img_processed = img.astype("float32") / 255.0
    img_batch = np.expand_dims(img_processed, axis=0)

    return img_batch
