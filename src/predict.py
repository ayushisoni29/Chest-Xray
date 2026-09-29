import os
import threading
import numpy as np
import tensorflow as tf

from config import MODEL_PATH, CLASS_NAMES, load_class_names
from src.preprocess import preprocess_image

_model = None
_model_lock = threading.Lock()


def get_model():
    """Thread-safe singleton loader for the trained model."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                if not os.path.exists(MODEL_PATH):
                    raise FileNotFoundError(
                        f"Trained model not found at {MODEL_PATH}. "
                        "Please train the model or copy final_model.h5 into the models/ directory."
                    )
                _model = tf.keras.models.load_model(MODEL_PATH)
    return _model


def predict_image(image_path: str) -> dict:
    """
    Runs model inference on a chest X-ray image and returns the prediction summary.

    Returns:
    {
        "predicted_class": "COVID",
        "confidence": 0.9624,
        "all_class_probabilities": {
            "COVID": 0.9624,
            "Lung_Opacity": 0.0123,
            "Normal": 0.0051,
            "Pneumonia": 0.0182,
            "Tuberculosis": 0.0020
        }
    }
    """
    model = get_model()
    class_names = load_class_names()
    img_array = preprocess_image(image_path)

    preds = model(img_array, training=False).numpy()[0]  # shape: (num_classes,)
    class_idx = int(np.argmax(preds))

    # Guard if number of outputs matches class names
    if class_idx >= len(class_names):
        pred_label = f"Class_{class_idx}"
    else:
        pred_label = class_names[class_idx]

    prob_dict = {}
    for i, p in enumerate(preds):
        name = class_names[i] if i < len(class_names) else f"Class_{i}"
        prob_dict[name] = round(float(p), 4)

    return {
        "predicted_class": pred_label,
        "confidence": round(float(preds[class_idx]), 4),
        "all_class_probabilities": prob_dict,
    }
