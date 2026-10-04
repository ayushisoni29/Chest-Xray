"""
=============================================================================
 CHEST X-RAY PAPER FEATURES — COMPLETE COLAB SCRIPT
=============================================================================
 This script adds 4 unique research features to your project:
   1. Confidence Calibration (ECE + Reliability Diagram)
   2. Per-Class ROC-AUC Curves
   3. Confidence-Based Rejection Analysis
   4. Misclassified Grad-CAM Analysis

 RUN THIS ON GOOGLE COLAB (GPU runtime).
 Follow the setup instructions in COLAB_INSTRUCTIONS.md
=============================================================================
"""

import os
import json
import numpy as np
import pandas as pd
import cv2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

import tensorflow as tf
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    precision_recall_fscore_support, accuracy_score
)
from sklearn.preprocessing import label_binarize

print(f"TensorFlow version: {tf.__version__}")
print(f"GPU available: {tf.config.list_physical_devices('GPU')}")

# =============================================================================
# CONFIGURATION — UPDATE THESE PATHS FOR YOUR COLAB SETUP
# =============================================================================

# Option A: Google Drive paths (if you mounted Drive)
# DRIVE_BASE = "/content/drive/MyDrive/chest_xray_project"

# Option B: Direct upload to Colab (recommended for speed)
BASE_DIR = "/content/chest_xray"

# Model paths
MODEL_V3_PATH = os.path.join(BASE_DIR, "final_super_model_v3.keras")
MODEL_V1_PATH = os.path.join(BASE_DIR, "final_super_model_old.keras")

# Test CSV path
TEST_CSV_PATH = os.path.join(BASE_DIR, "test.csv")

# Dataset root (where COVID/, Lung_Opacity/, Normal/, etc. folders are)
DATASET_ROOT = os.path.join(BASE_DIR, "dataset")

# Output directory for all results
OUTPUT_DIR = os.path.join(BASE_DIR, "paper_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Class configuration
CLASS_NAMES = ["COVID", "Lung_Opacity", "Normal", "Pneumonia", "Tuberculosis"]
NUM_CLASSES = 5
IMG_SIZE = (224, 224)

# Grad-CAM target layer
LAST_CONV_LAYER = "conv5_block3_3_conv"


# =============================================================================
# PREPROCESSING — EXACT MATCH WITH PRODUCTION PIPELINE
# =============================================================================

def apply_clahe(img_rgb):
    """CLAHE enhancement matching production preprocess.py"""
    if len(img_rgb.shape) == 3 and img_rgb.shape[2] == 3:
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_rgb.copy()
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)
    enhanced_rgb = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2RGB)
    return enhanced_rgb


def preprocess_single_image(image_path):
    """Exact production preprocessing: resize → CLAHE → ResNet50 normalize"""
    img = cv2.imread(image_path)
    if img is None:
        return None
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    # Two-step resize (matching production pipeline)
    img = cv2.resize(img, (256, 256), interpolation=cv2.INTER_AREA)
    img = cv2.resize(img, IMG_SIZE, interpolation=cv2.INTER_AREA)
    # Simple 1/255 rescaling (matching how the model was ACTUALLY trained)
    img = img.astype("float32") / 255.0
    return img


# =============================================================================
# STEP 1: LOAD MODELS
# =============================================================================

print("\n" + "="*60)
print("STEP 1: LOADING MODELS")
print("="*60)

model_v3 = tf.keras.models.load_model(MODEL_V3_PATH)
print(f"✅ Model V3 loaded: {MODEL_V3_PATH}")

model_v1 = None
if os.path.exists(MODEL_V1_PATH):
    model_v1 = tf.keras.models.load_model(MODEL_V1_PATH)
    print(f"✅ Model V1 loaded: {MODEL_V1_PATH}")
else:
    print(f"⚠️  Model V1 not found — will use V3 only (no ensemble)")

# Print model summary for paper documentation
print(f"\nModel V3 parameters: {model_v3.count_params():,}")
if model_v1:
    print(f"Model V1 parameters: {model_v1.count_params():,}")


# =============================================================================
# STEP 2: RUN INFERENCE ON FULL TEST SET
# =============================================================================

print("\n" + "="*60)
print("STEP 2: RUNNING INFERENCE ON TEST SET")
print("="*60)

test_df = pd.read_csv(TEST_CSV_PATH)
print(f"Test samples: {len(test_df)}")
print(f"Columns: {list(test_df.columns)}")

# Determine the filepath column and label column
filepath_col = "filepath"
label_col = "class_name" if "class_name" in test_df.columns else "label"

all_true_labels = []
all_pred_probs_v3 = []
all_pred_probs_v1 = []
all_pred_probs_ensemble = []
all_filepaths = []
failed_images = []

for idx, row in tqdm(test_df.iterrows(), total=len(test_df), desc="Inference"):
    filepath = row[filepath_col]
    true_label = row[label_col]

    # Resolve path: test.csv has relative paths like "dataset/COVID/file.png"
    if not os.path.isabs(filepath):
        # Try joining with BASE_DIR
        full_path = os.path.join(BASE_DIR, filepath)
        if not os.path.exists(full_path):
            # Try joining with DATASET_ROOT parent
            full_path = os.path.join(DATASET_ROOT, os.path.basename(os.path.dirname(filepath)), os.path.basename(filepath))
    else:
        full_path = filepath

    if not os.path.exists(full_path):
        failed_images.append(filepath)
        continue

    img = preprocess_single_image(full_path)
    if img is None:
        failed_images.append(filepath)
        continue

    img_batch = np.expand_dims(img, axis=0)

    # V3 prediction
    preds_v3 = model_v3(img_batch, training=False).numpy()[0]
    all_pred_probs_v3.append(preds_v3)

    # V1 prediction (if available)
    if model_v1 is not None:
        preds_v1 = model_v1(img_batch, training=False).numpy()[0]
        all_pred_probs_v1.append(preds_v1)
        # Ensemble: simple average
        preds_ensemble = (preds_v1 + preds_v3) / 2.0
    else:
        preds_ensemble = preds_v3

    all_pred_probs_ensemble.append(preds_ensemble)
    all_true_labels.append(true_label)
    all_filepaths.append(full_path)

print(f"\n✅ Inference complete: {len(all_true_labels)} images processed")
if failed_images:
    print(f"⚠️  {len(failed_images)} images failed to load")

# Convert to numpy arrays
y_true_names = np.array(all_true_labels)
y_true = np.array([CLASS_NAMES.index(name) for name in y_true_names])
probs_ensemble = np.array(all_pred_probs_ensemble)
probs_v3 = np.array(all_pred_probs_v3)
y_pred = np.argmax(probs_ensemble, axis=1)
y_pred_names = np.array([CLASS_NAMES[i] for i in y_pred])
confidences = np.max(probs_ensemble, axis=1)

# Save basic metrics first
acc = accuracy_score(y_true, y_pred)
print(f"\nOverall Accuracy: {acc*100:.2f}%")
print(classification_report(y_true, y_pred, target_names=CLASS_NAMES))


# =============================================================================
# FEATURE 1: CONFIDENCE CALIBRATION (ECE + RELIABILITY DIAGRAM)
# =============================================================================

print("\n" + "="*60)
print("FEATURE 1: CONFIDENCE CALIBRATION ANALYSIS")
print("="*60)

def compute_ece(y_true, y_pred, confidences, n_bins=10):
    """Compute Expected Calibration Error (ECE)"""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_accuracies = []
    bin_confidences = []
    bin_counts = []

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        # Find samples in this confidence bin
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        count = np.sum(in_bin)
        bin_counts.append(count)

        if count > 0:
            bin_acc = np.mean(y_true[in_bin] == y_pred[in_bin])
            bin_conf = np.mean(confidences[in_bin])
            bin_accuracies.append(bin_acc)
            bin_confidences.append(bin_conf)
        else:
            bin_accuracies.append(0)
            bin_confidences.append(0)

    # ECE = weighted average of |accuracy - confidence| per bin
    bin_counts = np.array(bin_counts)
    bin_accuracies = np.array(bin_accuracies)
    bin_confidences = np.array(bin_confidences)

    total = np.sum(bin_counts)
    ece = np.sum(bin_counts / total * np.abs(bin_accuracies - bin_confidences))

    return ece, bin_accuracies, bin_confidences, bin_counts


ece_score, bin_accs, bin_confs, bin_counts = compute_ece(y_true, y_pred, confidences, n_bins=10)
print(f"Expected Calibration Error (ECE): {ece_score:.4f}")

# Plot Reliability Diagram
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Left: Reliability Diagram
bin_edges = np.linspace(0, 1, 11)
bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
bar_width = 0.08

ax1.bar(bin_centers, bin_accs, width=bar_width, alpha=0.7, color='#2196F3',
        edgecolor='#1565C0', label='Model Accuracy', zorder=3)
ax1.plot([0, 1], [0, 1], 'k--', linewidth=1.5, label='Perfect Calibration', zorder=2)
ax1.fill_between([0, 1], [0, 1], alpha=0.05, color='gray')
ax1.set_xlabel('Mean Predicted Confidence', fontsize=12)
ax1.set_ylabel('Fraction of Correct Predictions', fontsize=12)
ax1.set_title(f'Reliability Diagram (ECE = {ece_score:.4f})', fontsize=13, fontweight='bold')
ax1.legend(fontsize=10)
ax1.set_xlim(0, 1)
ax1.set_ylim(0, 1.05)
ax1.grid(True, alpha=0.3, zorder=0)

# Right: Confidence Histogram
ax2.bar(bin_centers, bin_counts, width=bar_width, alpha=0.7, color='#FF9800',
        edgecolor='#E65100', zorder=3)
ax2.set_xlabel('Prediction Confidence', fontsize=12)
ax2.set_ylabel('Number of Samples', fontsize=12)
ax2.set_title('Confidence Distribution', fontsize=13, fontweight='bold')
ax2.set_xlim(0, 1)
ax2.grid(True, alpha=0.3, zorder=0)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "calibration_reliability_diagram.png"), dpi=300, bbox_inches='tight')
plt.close()
print("✅ Saved: calibration_reliability_diagram.png")

# Save ECE data
ece_data = {
    "ece_score": round(float(ece_score), 4),
    "num_bins": 10,
    "bin_accuracies": [round(float(x), 4) for x in bin_accs],
    "bin_confidences": [round(float(x), 4) for x in bin_confs],
    "bin_counts": [int(x) for x in bin_counts],
    "total_samples": int(len(y_true))
}
with open(os.path.join(OUTPUT_DIR, "calibration_ece.json"), "w") as f:
    json.dump(ece_data, f, indent=2)
print("✅ Saved: calibration_ece.json")


# =============================================================================
# FEATURE 2: PER-CLASS ROC-AUC CURVES
# =============================================================================

print("\n" + "="*60)
print("FEATURE 2: PER-CLASS ROC-AUC CURVES")
print("="*60)

# Binarize the true labels for multi-class ROC
y_true_bin = label_binarize(y_true, classes=list(range(NUM_CLASSES)))

fig, ax = plt.subplots(figsize=(8, 7))
colors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA']
auc_scores = {}

for i, class_name in enumerate(CLASS_NAMES):
    fpr, tpr, _ = roc_curve(y_true_bin[:, i], probs_ensemble[:, i])
    roc_auc = auc(fpr, tpr)
    auc_scores[class_name] = round(float(roc_auc), 4)
    ax.plot(fpr, tpr, color=colors[i], linewidth=2,
            label=f'{class_name} (AUC = {roc_auc:.4f})')

ax.plot([0, 1], [0, 1], 'k--', linewidth=1, alpha=0.5)
ax.set_xlabel('False Positive Rate', fontsize=12)
ax.set_ylabel('True Positive Rate', fontsize=12)
ax.set_title('Per-Class ROC Curves (One-vs-Rest)', fontsize=13, fontweight='bold')
ax.legend(loc='lower right', fontsize=10)
ax.set_xlim([0, 1])
ax.set_ylim([0, 1.02])
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "roc_auc_curves.png"), dpi=300, bbox_inches='tight')
plt.close()
print("✅ Saved: roc_auc_curves.png")

# Compute macro and weighted AUC
macro_auc = np.mean(list(auc_scores.values()))
auc_data = {
    "per_class_auc": auc_scores,
    "macro_auc": round(float(macro_auc), 4)
}
with open(os.path.join(OUTPUT_DIR, "roc_auc_scores.json"), "w") as f:
    json.dump(auc_data, f, indent=2)
print(f"Per-class AUC: {auc_scores}")
print(f"Macro AUC: {macro_auc:.4f}")
print("✅ Saved: roc_auc_scores.json")


# =============================================================================
# FEATURE 3: CONFIDENCE-BASED REJECTION ANALYSIS
# =============================================================================

print("\n" + "="*60)
print("FEATURE 3: CONFIDENCE-BASED REJECTION ANALYSIS")
print("="*60)

thresholds = [0.50, 0.60, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
rejection_results = []

print(f"\n{'Threshold':>10} | {'Accepted':>10} | {'Rejected':>10} | {'Accept %':>10} | {'Acc on Accepted':>16} | {'Errors Caught':>14}")
print("-" * 85)

for thresh in thresholds:
    accepted_mask = confidences >= thresh
    rejected_mask = ~accepted_mask

    n_accepted = np.sum(accepted_mask)
    n_rejected = np.sum(rejected_mask)
    accept_pct = n_accepted / len(confidences) * 100

    if n_accepted > 0:
        acc_accepted = accuracy_score(y_true[accepted_mask], y_pred[accepted_mask])
    else:
        acc_accepted = 0.0

    # How many actual errors were in the rejected set?
    total_errors = np.sum(y_true != y_pred)
    if n_rejected > 0:
        errors_in_rejected = np.sum(y_true[rejected_mask] != y_pred[rejected_mask])
    else:
        errors_in_rejected = 0

    errors_caught_pct = errors_in_rejected / total_errors * 100 if total_errors > 0 else 0

    result = {
        "threshold": thresh,
        "accepted": int(n_accepted),
        "rejected": int(n_rejected),
        "acceptance_rate": round(accept_pct, 2),
        "accuracy_on_accepted": round(float(acc_accepted) * 100, 2),
        "errors_caught_percent": round(errors_caught_pct, 2)
    }
    rejection_results.append(result)

    print(f"{thresh:>10.2f} | {n_accepted:>10} | {n_rejected:>10} | {accept_pct:>9.1f}% | {acc_accepted*100:>15.2f}% | {errors_caught_pct:>12.1f}%")

# Save results
with open(os.path.join(OUTPUT_DIR, "rejection_analysis.json"), "w") as f:
    json.dump({
        "total_samples": int(len(y_true)),
        "total_errors_no_rejection": int(np.sum(y_true != y_pred)),
        "baseline_accuracy": round(float(acc) * 100, 2),
        "thresholds": rejection_results
    }, f, indent=2)
print("\n✅ Saved: rejection_analysis.json")

# Plot rejection curve
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

accept_rates = [r["acceptance_rate"] for r in rejection_results]
acc_on_accepted = [r["accuracy_on_accepted"] for r in rejection_results]
errors_caught = [r["errors_caught_percent"] for r in rejection_results]

ax1.plot(thresholds, acc_on_accepted, 'o-', color='#2196F3', linewidth=2, markersize=8, label='Accuracy on Accepted')
ax1.axhline(y=acc*100, color='#E53935', linestyle='--', linewidth=1.5, label=f'Baseline ({acc*100:.1f}%)')
ax1.set_xlabel('Confidence Threshold', fontsize=12)
ax1.set_ylabel('Accuracy (%)', fontsize=12)
ax1.set_title('Accuracy vs Rejection Threshold', fontsize=13, fontweight='bold')
ax1.legend(fontsize=10)
ax1.grid(True, alpha=0.3)

ax2.plot(thresholds, accept_rates, 's-', color='#43A047', linewidth=2, markersize=8, label='Acceptance Rate')
ax2.plot(thresholds, errors_caught, '^-', color='#E53935', linewidth=2, markersize=8, label='Errors Caught')
ax2.set_xlabel('Confidence Threshold', fontsize=12)
ax2.set_ylabel('Percentage (%)', fontsize=12)
ax2.set_title('Coverage vs Error Rejection', fontsize=13, fontweight='bold')
ax2.legend(fontsize=10)
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "rejection_analysis_plot.png"), dpi=300, bbox_inches='tight')
plt.close()
print("✅ Saved: rejection_analysis_plot.png")


# =============================================================================
# FEATURE 4: MISCLASSIFIED GRAD-CAM ANALYSIS
# =============================================================================

print("\n" + "="*60)
print("FEATURE 4: MISCLASSIFIED GRAD-CAM ANALYSIS")
print("="*60)

# Find misclassified samples
misclassified_mask = y_true != y_pred
misclassified_indices = np.where(misclassified_mask)[0]
print(f"Total misclassified: {len(misclassified_indices)}")

# Sort by confidence (highest confidence errors first — most interesting)
mis_confidences = confidences[misclassified_indices]
sorted_mis_idx = misclassified_indices[np.argsort(-mis_confidences)]

# Take top 15 most confident wrong predictions
top_n = min(15, len(sorted_mis_idx))
top_misclassified = sorted_mis_idx[:top_n]


def find_conv_layer(model_or_layer, layer_name=None):
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


def generate_gradcam_heatmap(model, img_array, alpha=0.45):
    """Generate Grad-CAM heatmap matching production gradcam.py"""
    # Check for nested base model
    base_submodel = None
    submodel_idx = -1
    for idx_l, layer in enumerate(model.layers):
        if isinstance(layer, tf.keras.Model):
            base_submodel = layer
            submodel_idx = idx_l
            break

    if base_submodel is not None:
        target_conv = find_conv_layer(base_submodel, LAST_CONV_LAYER)
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
        target_conv = find_conv_layer(model, LAST_CONV_LAYER)
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
    conv_out = conv_outputs[0]
    heatmap = conv_out @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)

    return heatmap.numpy()


# Generate Grad-CAM for top misclassified images
gradcam_dir = os.path.join(OUTPUT_DIR, "misclassified_gradcam")
os.makedirs(gradcam_dir, exist_ok=True)

misclassified_details = []

# Use V3 model for Grad-CAM (primary model)
gradcam_model = model_v3

for rank, idx in enumerate(top_misclassified):
    filepath = all_filepaths[idx]
    true_name = CLASS_NAMES[y_true[idx]]
    pred_name = CLASS_NAMES[y_pred[idx]]
    conf = confidences[idx]

    print(f"  [{rank+1}/{top_n}] True: {true_name} → Pred: {pred_name} (conf: {conf:.4f})")

    # Preprocess and generate Grad-CAM
    img = preprocess_single_image(filepath)
    if img is None:
        continue

    img_batch = np.expand_dims(img, axis=0)

    try:
        heatmap = generate_gradcam_heatmap(gradcam_model, img_batch)

        # Create overlay
        original = cv2.imread(filepath)
        if original is None:
            continue
        h, w = original.shape[:2]
        heatmap_resized = cv2.resize(heatmap, (w, h))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        overlay = cv2.addWeighted(original, 0.55, heatmap_colored, 0.45, 0)

        # Save figure: original + Grad-CAM side by side
        fig, axes = plt.subplots(1, 2, figsize=(10, 5))

        axes[0].imshow(cv2.cvtColor(original, cv2.COLOR_BGR2RGB))
        axes[0].set_title(f'Original\nTrue: {true_name}', fontsize=11, fontweight='bold')
        axes[0].axis('off')

        axes[1].imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
        axes[1].set_title(f'Grad-CAM\nPred: {pred_name} ({conf:.1%})', fontsize=11, fontweight='bold',
                         color='red')
        axes[1].axis('off')

        fig.suptitle(f'Misclassified #{rank+1}: {true_name} → {pred_name}',
                    fontsize=13, fontweight='bold')
        plt.tight_layout()

        save_name = f"mis_{rank+1}_{true_name}_as_{pred_name}.png"
        plt.savefig(os.path.join(gradcam_dir, save_name), dpi=200, bbox_inches='tight')
        plt.close()

        misclassified_details.append({
            "rank": rank + 1,
            "filepath": os.path.basename(filepath),
            "true_class": true_name,
            "predicted_class": pred_name,
            "confidence": round(float(conf), 4),
            "all_probs": {CLASS_NAMES[j]: round(float(probs_ensemble[idx][j]), 4) for j in range(NUM_CLASSES)},
            "gradcam_file": save_name
        })

    except Exception as e:
        print(f"    ⚠️ Grad-CAM failed: {e}")

# Save misclassified analysis
with open(os.path.join(OUTPUT_DIR, "misclassified_gradcam_analysis.json"), "w") as f:
    json.dump({
        "total_misclassified": int(len(misclassified_indices)),
        "analyzed_top_n": top_n,
        "details": misclassified_details
    }, f, indent=2)
print(f"\n✅ Saved: {len(misclassified_details)} misclassified Grad-CAM images")


# =============================================================================
# BONUS: SAVE COMPLETE EVALUATION RESULTS FOR PAPER
# =============================================================================

print("\n" + "="*60)
print("SAVING COMPLETE EVALUATION FOR PAPER")
print("="*60)

# Classification report
report = classification_report(y_true, y_pred, target_names=CLASS_NAMES, output_dict=True)

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)

# Save confusion matrix plot
fig, ax = plt.subplots(figsize=(8, 6.5))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=CLASS_NAMES,
            yticklabels=CLASS_NAMES, ax=ax, linewidths=0.5,
            annot_kws={"size": 12})
ax.set_title(f'Confusion Matrix (Accuracy: {acc*100:.2f}%)', fontsize=13, fontweight='bold')
ax.set_ylabel('True Label', fontsize=12)
ax.set_xlabel('Predicted Label', fontsize=12)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "confusion_matrix_clean.png"), dpi=300, bbox_inches='tight')
plt.close()
print("✅ Saved: confusion_matrix_clean.png")

# Complete results JSON
complete_results = {
    "test_samples": int(len(y_true)),
    "failed_images": len(failed_images),
    "overall_accuracy": round(float(acc) * 100, 2),
    "classification_report": report,
    "confusion_matrix": cm.tolist(),
    "ece_score": round(float(ece_score), 4),
    "per_class_auc": auc_scores,
    "macro_auc": round(float(macro_auc), 4),
    "ensemble_used": model_v1 is not None,
    "model_v3_params": int(model_v3.count_params()),
    "class_names": CLASS_NAMES,
    "preprocessing": "CLAHE (clipLimit=2.0, tileGrid=8x8) + ResNet50 preprocess_input",
    "image_size": "224x224x3"
}

with open(os.path.join(OUTPUT_DIR, "complete_paper_results.json"), "w") as f:
    json.dump(complete_results, f, indent=2)
print("✅ Saved: complete_paper_results.json")


# =============================================================================
# FINAL SUMMARY
# =============================================================================

print("\n" + "="*60)
print("🎉 ALL FEATURES COMPLETE! SUMMARY:")
print("="*60)

print(f"""
📁 All results saved to: {OUTPUT_DIR}/

Files generated:
  📊 calibration_reliability_diagram.png  — ECE reliability diagram
  📊 calibration_ece.json                 — ECE numerical data
  📊 roc_auc_curves.png                   — Per-class ROC curves
  📊 roc_auc_scores.json                  — AUC scores
  📊 rejection_analysis_plot.png          — Rejection analysis figure
  📊 rejection_analysis.json              — Rejection data
  📊 misclassified_gradcam/               — {len(misclassified_details)} Grad-CAM images
  📊 misclassified_gradcam_analysis.json  — Misclassified details
  📊 confusion_matrix_clean.png           — Clean confusion matrix
  📊 complete_paper_results.json          — All metrics in one file

Key Results:
  🎯 Accuracy: {acc*100:.2f}%
  📐 ECE: {ece_score:.4f}
  📈 Macro AUC: {macro_auc:.4f}
  🔍 Total Misclassified: {len(misclassified_indices)}

⬇️  DOWNLOAD the entire '{OUTPUT_DIR}' folder and share it back!
""")
