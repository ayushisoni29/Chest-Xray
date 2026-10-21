import os
import sys
import json
import time
import numpy as np
import pandas as pd

# Set base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import tensorflow as tf
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from src.preprocess import preprocess_image
from config import MODEL_PATH, MODEL_PATH_V1, CLASS_LABELS_PATH, load_class_names


def main():
    print("=" * 70)
    print("CHEST X-RAY TEST SPLIT EVALUATION")
    print("=" * 70)

    # 1. Load class labels
    class_names = load_class_names()
    print(f"Loaded class names ({len(class_names)}): {class_names}")
    label_to_idx = {name: i for i, name in enumerate(class_names)}
    print(f"Label to index mapping: {label_to_idx}")

    # 2. Verify model files
    print(f"\n[Model 1] V3 Path: {MODEL_PATH}")
    print(f"  Exists: {os.path.exists(MODEL_PATH)}")
    print(f"[Model 2] V1 Path: {MODEL_PATH_V1}")
    print(f"  Exists: {os.path.exists(MODEL_PATH_V1)}")

    if not os.path.exists(MODEL_PATH) or not os.path.exists(MODEL_PATH_V1):
        raise FileNotFoundError("One or both model files are missing.")

    print("\nLoading Model V3 (fine-tuned)...")
    t0 = time.time()
    model_v3 = tf.keras.models.load_model(MODEL_PATH)
    print(f"Model V3 loaded in {time.time() - t0:.2f}s")

    print("\nLoading Model V1 (original)...")
    t0 = time.time()
    model_v1 = tf.keras.models.load_model(MODEL_PATH_V1)
    print(f"Model V1 loaded in {time.time() - t0:.2f}s")

    # 3. Read test.csv
    test_csv_path = os.path.join(BASE_DIR, "dataset", "clean", "test.csv")
    print(f"\nReading test CSV from: {test_csv_path}")
    if not os.path.exists(test_csv_path):
        raise FileNotFoundError(f"test.csv not found at {test_csv_path}")

    df_test = pd.read_csv(test_csv_path)
    total_samples = len(df_test)
    print(f"Total samples in test.csv: {total_samples}")
    if total_samples != 2730:
        print(f"WARNING: Expected 2,730 samples, found {total_samples}!")

    print("\nClass distribution in test.csv:")
    for label, count in df_test["class_name"].value_counts().items():
        print(f"  {label:15s}: {count:5d}")

    # 4. Prepare batches and evaluate
    batch_size = 32
    num_batches = int(np.ceil(total_samples / batch_size))

    y_true = []
    probs_v3_list = []
    probs_v1_list = []
    probs_ens_list = []
    errors = []

    print(f"\nStarting inference on {total_samples} test images ({num_batches} batches of size {batch_size})...")
    start_eval_time = time.time()

    for b in range(num_batches):
        batch_start_idx = b * batch_size
        batch_end_idx = min(batch_start_idx + batch_size, total_samples)
        batch_df = df_test.iloc[batch_start_idx:batch_end_idx]

        batch_imgs = []
        batch_labels = []

        for _, row in batch_df.iterrows():
            rel_path = row["filepath"].replace("/", os.sep)
            img_path = os.path.join(BASE_DIR, rel_path)
            label_name = str(row["class_name"]).strip()

            if label_name not in label_to_idx:
                err_msg = f"Unknown label '{label_name}' in row for {rel_path}"
                print(f"ERROR: {err_msg}")
                errors.append({"filepath": rel_path, "error": err_msg})
                continue

            try:
                # Preprocess image exactly using app preprocessing
                img_tensor = preprocess_image(img_path)  # shape (1, 224, 224, 3), range [0, 1]
                batch_imgs.append(img_tensor[0])
                batch_labels.append(label_to_idx[label_name])
            except Exception as e:
                err_msg = f"Preprocessing failed for {rel_path}: {e}"
                print(f"ERROR: {err_msg}")
                errors.append({"filepath": rel_path, "error": err_msg})

        if not batch_imgs:
            continue

        batch_x = np.array(batch_imgs, dtype=np.float32)

        # Forward pass on Model V3
        p_v3 = model_v3(batch_x, training=False).numpy()
        # Forward pass on Model V1
        p_v1 = model_v1(batch_x, training=False).numpy()
        # Ensemble average
        p_ens = (p_v1 + p_v3) / 2.0

        probs_v3_list.append(p_v3)
        probs_v1_list.append(p_v1)
        probs_ens_list.append(p_ens)
        y_true.extend(batch_labels)

        if (b + 1) % 10 == 0 or (b + 1) == num_batches:
            elapsed = time.time() - start_eval_time
            processed = len(y_true)
            speed = processed / elapsed if elapsed > 0 else 0
            print(f"  Batch {b+1:3d}/{num_batches:3d} processed ({processed:4d}/{total_samples} samples, {speed:.1f} samples/sec)")

    total_eval_time = time.time() - start_eval_time
    print(f"\nInference completed in {total_eval_time:.2f} seconds ({len(y_true)} samples evaluated).")
    print(f"Total errors/skipped samples: {len(errors)}")

    if len(errors) > 0:
        print("Skipped samples detail:")
        for err in errors:
            print(f"  {err}")

    # 5. Concatenate predictions
    y_true = np.array(y_true)
    all_probs_v3 = np.vstack(probs_v3_list)
    all_probs_v1 = np.vstack(probs_v1_list)
    all_probs_ens = np.vstack(probs_ens_list)

    y_pred_v3 = np.argmax(all_probs_v3, axis=1)
    y_pred_v1 = np.argmax(all_probs_v1, axis=1)
    y_pred_ens = np.argmax(all_probs_ens, axis=1)

    # 6. Calculate metrics function
    def compute_metrics(name, y_true, y_pred, y_probs):
        acc = accuracy_score(y_true, y_pred)
        report = classification_report(
            y_true,
            y_pred,
            target_names=class_names,
            output_dict=True,
            zero_division=0,
        )
        cm = confusion_matrix(y_true, y_pred).tolist()

        try:
            # One-vs-Rest ROC-AUC
            roc_macro = roc_auc_score(
                y_true, y_probs, multi_class="ovr", average="macro"
            )
            roc_weighted = roc_auc_score(
                y_true, y_probs, multi_class="ovr", average="weighted"
            )
        except Exception as e:
            print(f"ROC-AUC calculation error for {name}: {e}")
            roc_macro = None
            roc_weighted = None

        return {
            "model_name": name,
            "accuracy": round(float(acc), 6),
            "accuracy_pct": round(float(acc) * 100, 2),
            "macro_avg": {
                "precision": round(float(report["macro avg"]["precision"]), 6),
                "recall": round(float(report["macro avg"]["recall"]), 6),
                "f1-score": round(float(report["macro avg"]["f1-score"]), 6),
            },
            "weighted_avg": {
                "precision": round(float(report["weighted avg"]["precision"]), 6),
                "recall": round(float(report["weighted avg"]["recall"]), 6),
                "f1-score": round(float(report["weighted avg"]["f1-score"]), 6),
            },
            "per_class": {
                cls: {
                    "precision": round(float(report[cls]["precision"]), 6),
                    "recall": round(float(report[cls]["recall"]), 6),
                    "f1-score": round(float(report[cls]["f1-score"]), 6),
                    "support": int(report[cls]["support"]),
                }
                for cls in class_names
            },
            "confusion_matrix": cm,
            "roc_auc_ovr_macro": round(float(roc_macro), 6) if roc_macro is not None else None,
            "roc_auc_ovr_weighted": round(float(roc_weighted), 6) if roc_weighted is not None else None,
        }

    results = {
        "evaluation_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "test_csv_path": test_csv_path,
        "total_test_samples": total_samples,
        "evaluated_samples": len(y_true),
        "skipped_errors_count": len(errors),
        "skipped_errors": errors,
        "class_names": class_names,
        "label_mapping": label_to_idx,
        "models": {
            "model_v3_finetuned": compute_metrics("Model V3 (Fine-Tuned)", y_true, y_pred_v3, all_probs_v3),
            "model_v1_original": compute_metrics("Model V1 (Original)", y_true, y_pred_v1, all_probs_v1),
            "ensemble_v1_plus_v3": compute_metrics("Ensemble (V1 + V3 Average)", y_true, y_pred_ens, all_probs_ens),
        },
    }

    # 7. Print summary tables
    print("\n" + "=" * 70)
    print("EVALUATION RESULTS ON 2,730 TEST SAMPLES")
    print("=" * 70)

    for mkey, mdata in results["models"].items():
        print(f"\n>>> {mdata['model_name']} <<<")
        print(f"Accuracy: {mdata['accuracy_pct']}% ({mdata['accuracy']:.4f})")
        print(f"Macro F1: {mdata['macro_avg']['f1-score']:.4f} | Weighted F1: {mdata['weighted_avg']['f1-score']:.4f}")
        if mdata["roc_auc_ovr_macro"] is not None:
            print(f"ROC-AUC (Macro OVR): {mdata['roc_auc_ovr_macro']:.4f} | (Weighted OVR): {mdata['roc_auc_ovr_weighted']:.4f}")
        print("\nPer-class breakdown:")
        print(f"  {'Class':15s} {'Precision':10s} {'Recall':10s} {'F1-Score':10s} {'Support':10s}")
        print("  " + "-" * 55)
        for cls in class_names:
            pc = mdata["per_class"][cls]
            print(f"  {cls:15s} {pc['precision']:10.4f} {pc['recall']:10.4f} {pc['f1-score']:10.4f} {pc['support']:10d}")

        print("\nConfusion Matrix (Rows: Ground Truth, Cols: Predicted):")
        print(f"  Classes: {class_names}")
        for r_idx, row in enumerate(mdata["confusion_matrix"]):
            print(f"  {class_names[r_idx]:15s} {row}")

    # 8. Save results to a dedicated NEW file (keeping existing files completely safe)
    output_json_path = os.path.join(BASE_DIR, "evaluation", "test_set_evaluation_results.json")
    with open(output_json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[Saved] Detailed results saved to: {output_json_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
