import os
import numpy as np
import cv2
import tensorflow as tf

from src.predict import get_model
from src.preprocess import preprocess_image
from config import LAST_CONV_LAYER_NAME


def find_conv_layer(model_or_layer, layer_name: str = None):
    """Finds the target convolutional layer in the model hierarchy."""
    if layer_name:
        for layer in model_or_layer.layers:
            if layer.name == layer_name:
                return layer
            if hasattr(layer, "layers"):
                res = find_conv_layer(layer, layer_name)
                if res is not None:
                    return res

    for layer in reversed(model_or_layer.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer
        if hasattr(layer, "layers"):
            res = find_conv_layer(layer)
            if res is not None:
                return res

    return None


def generate_gradcam(image_path: str, save_path: str, alpha: float = 0.45, return_heatmap: bool = False):
    """
    Generates a Grad-CAM heatmap overlay for the given image and saves it to save_path.
    Returns the absolute path to the generated heatmap image, or (path, heatmap) if return_heatmap is True.
    """
    model = get_model()
    img_array = preprocess_image(image_path)

    # Check if model has a nested base model
    base_submodel = None
    submodel_idx = -1
    for idx, layer in enumerate(model.layers):
        if isinstance(layer, tf.keras.Model):
            base_submodel = layer
            submodel_idx = idx
            break

    if base_submodel is not None:
        target_conv = find_conv_layer(base_submodel, LAST_CONV_LAYER_NAME)
        if target_conv is None:
            target_conv = find_conv_layer(base_submodel)

        base_grad_model = tf.keras.models.Model(
            inputs=base_submodel.inputs,
            outputs=[target_conv.output, base_submodel.output]
        )

        with tf.GradientTape() as tape:
            conv_outputs, base_out = base_grad_model(img_array)
            tape.watch(conv_outputs)

            x = base_out
            for layer in model.layers[submodel_idx + 1:]:
                x = layer(x, training=False)
            predictions = x

            class_idx = tf.argmax(predictions[0])
            loss = predictions[:, class_idx]

        grads = tape.gradient(loss, conv_outputs)
    else:
        target_conv = find_conv_layer(model, LAST_CONV_LAYER_NAME)
        grad_model = tf.keras.models.Model(
            inputs=model.inputs,
            outputs=[target_conv.output, model.output]
        )

        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            class_idx = tf.argmax(predictions[0])
            loss = predictions[:, class_idx]

        grads = tape.gradient(loss, conv_outputs)

    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)
    heatmap_np = heatmap.numpy()

    # Load original image for overlay
    original_img = cv2.imread(image_path)
    if original_img is None:
        raise ValueError(f"Could not read image for overlay at: {image_path}")

    h, w = original_img.shape[:2]
    heatmap_resized = cv2.resize(heatmap_np, (w, h))
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    # Blend original and heatmap
    overlaid = cv2.addWeighted(original_img, 1.0 - alpha, heatmap_colored, alpha, 0)

    # Ensure parent directory exists and save
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    cv2.imwrite(save_path, overlaid)

    if return_heatmap:
        return save_path, heatmap_resized
    return save_path

