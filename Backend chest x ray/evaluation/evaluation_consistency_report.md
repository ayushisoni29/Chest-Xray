# Test Split Evaluation Artifacts: Consistency & Verification Report

**Date:** 2026-10-21  
**Project:** Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability System  
**Target:** Read-only mathematical recalculation & architectural audit of test evaluation artifacts  
**Artifact Evaluated:** `Backend chest x ray/evaluation/test_set_evaluation_results.json`  
**Evaluation Script:** `Backend chest x ray/evaluate_test_set.py`  

---

## 1. Executive Summary

A strict consistency audit was executed on the artifacts generated from evaluating the held-out test split (2,730 images).

* **Mathematical Recalculation:** All accuracy, per-class precision, recall, F1-scores, macro averages, and weighted averages were independently re-derived from the raw 5×5 confusion matrices. **The discrepancy between recalculated and saved metrics is 0.000000** (maximum floating-point variance $< 5 \times 10^{-7}$).
* **Sample Accounting:** Evaluated samples = **2,730**, ground-truth support sum = **2,730**, confusion matrix total sum = **2,730**, skipped/corrupted samples = **0**.
* **Model Parity:** Confirmed 100% parity with the production application. The evaluation script directly loaded the application's active models (`final_super_model_v3.keras` and `final_super_model_old.keras`), imported the identical preprocessing pipeline from `src.preprocess`, and applied exact ensemble averaging `(p1 + p3) / 2.0`.
* **API Endpoint Audit:** The `/model/metrics` endpoint in `main.py` serves `evaluation/metrics.json`. Currently, `metrics.json` still holds the obsolete **21,070-sample / 98.15%** evaluation, which contradicts the actual held-out test split and causes assertion failures in `tests/test_evaluation.py` (which expects 3,276 samples).

---

## 2. Independent Mathematical Recalculation

All metrics below were recalculated directly from the raw cell values of each 5×5 confusion matrix:

$$\text{Precision}_i = \frac{C_{ii}}{\sum_{k} C_{ki}}, \quad \text{Recall}_i = \frac{C_{ii}}{\sum_{k} C_{ik}}, \quad \text{F1}_i = \frac{2 \cdot P_i \cdot R_i}{P_i + R_i}, \quad \text{Accuracy} = \frac{\sum_i C_{ii}}{\sum_{j,k} C_{jk}}$$

### 2.1 Model V1 (Original Model)
* **Total Samples:** 2,730 | **Correct Predictions:** 2,623
* **Recalculated Accuracy:** $2623 / 2730 = \mathbf{0.960806}$ (96.08%) | Saved: 0.960806 (**Diff: 0.0**)
* **Per-Class Breakdown:**
  * **COVID:** $TP=522, ColSum=577, RowSum=543 \implies P=0.904679, R=0.961326, F1=0.932143$ (Saved $F1=0.932143$)
  * **Lung Opacity:** $TP=352, ColSum=352, RowSum=352 \implies P=1.000000, R=1.000000, F1=1.000000$ (Saved $F1=1.000000$)
  * **Normal:** $TP=1494, ColSum=1540, RowSum=1529 \implies P=0.970130, R=0.977109, F1=0.973607$ (Saved $F1=0.973607$)
  * **Pneumonia:** $TP=175, ColSum=179, RowSum=201 \implies P=0.977654, R=0.870647, F1=0.921053$ (Saved $F1=0.921053$)
  * **Tuberculosis:** $TP=80, ColSum=82, RowSum=105 \implies P=0.975610, R=0.761905, F1=0.855615$ (Saved $F1=0.855615$)
* **Macro Average:** Precision = 0.965615, Recall = 0.914197, F1-Score = **0.936484** (Matches Saved)
* **Weighted Average:** Precision = 0.961728, Recall = 0.960806, F1-Score = **0.960355** (Matches Saved)
* **ROC-AUC (One-vs-Rest):** Macro = **0.997297**, Weighted = **0.996745**

---

### 2.2 Model V3 (Fine-Tuned Model)
* **Total Samples:** 2,730 | **Correct Predictions:** 2,653
* **Recalculated Accuracy:** $2653 / 2730 = \mathbf{0.971795}$ (97.18%) | Saved: 0.971795 (**Diff: 0.0**)
* **Per-Class Breakdown:**
  * **COVID:** $TP=507, ColSum=530, RowSum=543 \implies P=0.956604, R=0.933702, F1=0.945014$ (Saved $F1=0.945014$)
  * **Lung Opacity:** $TP=352, ColSum=352, RowSum=352 \implies P=1.000000, R=1.000000, F1=1.000000$ (Saved $F1=1.000000$)
  * **Normal:** $TP=1495, ColSum=1519, RowSum=1529 \implies P=0.984200, R=0.977763, F1=0.980971$ (Saved $F1=0.980971$)
  * **Pneumonia:** $TP=198, ColSum=214, RowSum=201 \implies P=0.925234, R=0.985075, F1=0.954217$ (Saved $F1=0.954217$)
  * **Tuberculosis:** $TP=101, ColSum=115, RowSum=105 \implies P=0.878261, R=0.961905, F1=0.918182$ (Saved $F1=0.918182$)
* **Macro Average:** Precision = 0.948860, Recall = 0.971689, F1-Score = **0.959677** (Matches Saved)
* **Weighted Average:** Precision = 0.972332, Recall = 0.971795, F1-Score = **0.971888** (Matches Saved)
* **ROC-AUC (One-vs-Rest):** Macro = **0.998509**, Weighted = **0.997872**

---

### 2.3 Ensemble (V1 + V3 Average) — Production Pipeline
* **Total Samples:** 2,730 | **Correct Predictions:** 2,659
* **Recalculated Accuracy:** $2659 / 2730 = \mathbf{0.973993}$ (97.40%) | Saved: 0.973993 (**Diff: 0.0**)
* **Per-Class Breakdown:**
  * **COVID:** $TP=515, ColSum=545, RowSum=543 \implies P=0.944954, R=0.948435, F1=0.946691$ (Saved $F1=0.946691$)
  * **Lung Opacity:** $TP=352, ColSum=352, RowSum=352 \implies P=1.000000, R=1.000000, F1=1.000000$ (Saved $F1=1.000000$)
  * **Normal:** $TP=1498, ColSum=1525, RowSum=1529 \implies P=0.982295, R=0.979725, F1=0.981009$ (Saved $F1=0.981009$)
  * **Pneumonia:** $TP=195, ColSum=202, RowSum=201 \implies P=0.965347, R=0.970149, F1=0.967742$ (Saved $F1=0.967742$)
  * **Tuberculosis:** $TP=99, ColSum=106, RowSum=105 \implies P=0.933962, R=0.942857, F1=0.938389$ (Saved $F1=0.938389$)
* **Macro Average:** Precision = 0.965312, Recall = 0.968233, F1-Score = **0.966766** (Matches Saved)
* **Weighted Average:** Precision = 0.974044, Recall = 0.973993, F1-Score = **0.974015** (Matches Saved)
* **ROC-AUC (One-vs-Rest):** Macro = **0.998624**, Weighted = **0.998217**

---

## 3. Confusion Matrix Row & Column Integrity Check

| Metric Check | Model V1 | Model V3 | Ensemble | Expected Ground Truth | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Row 0 (COVID) Sum | 543 | 543 | 543 | 543 | **PASS** |
| Row 1 (Lung_Opacity) Sum | 352 | 352 | 352 | 352 | **PASS** |
| Row 2 (Normal) Sum | 1,529 | 1,529 | 1,529 | 1,529 | **PASS** |
| Row 3 (Pneumonia) Sum | 201 | 201 | 201 | 201 | **PASS** |
| Row 4 (Tuberculosis) Sum | 105 | 105 | 105 | 105 | **PASS** |
| **Total Matrix Sum** | **2,730** | **2,730** | **2,730** | **2,730** | **PASS** |
| Diagonal Sum (TP) | 2,623 | 2,653 | 2,659 | — | **PASS** |
| Errors / Skipped | 0 | 0 | 0 | 0 | **PASS** |

---

## 4. Pipeline & Model Parity Verification

1. **Active Weights Loaded:**
   * `final_super_model_v3.keras` (120.24 MB, SHA-compatible, loaded via `tf.keras.models.load_model`)
   * `final_super_model_old.keras` (240.10 MB, SHA-compatible, loaded via `tf.keras.models.load_model`)
   * Matches `MODEL_PATH` and `MODEL_PATH_V1` defined in `config.py`.
2. **Preprocessing Parity:**
   * Uses `src.preprocess.preprocess_image`: `cv2.imread` $\to$ BGR2RGB $\to$ resize(256, 256, `cv2.INTER_AREA`) $\to$ resize(224, 224, `cv2.INTER_AREA`) $\to$ rescale by $1 / 255.0$.
   * No CLAHE is applied in this inference step, identically matching `src/predict.py`.
3. **Ensemble Fusion Parity:**
   * Softmax output from Model V1 and Model V3 are linearly averaged: `p_ens = (p_v1 + p_v3) / 2.0`.
   * Class prediction index is obtained via `argmax(p_ens)`.
   * Exactly matches `src/predict.py:83`.

---

## 5. API Endpoint & Test File Cross-Check

* **Endpoint `/model/metrics` in `main.py` (Line 138–151):**
  * Opens and returns `evaluation/metrics.json`.
* **State of `evaluation/metrics.json`:**
  * Currently reports `test_samples: 21070` and `accuracy: 0.9815`.
  * **Critical Observation:** This file was generated from the entire dataset before cleaning, creating data leakage.
* **State of `tests/test_evaluation.py` (Lines 77 & 102):**
  * Contains hardcoded assertion: `assert om["total_test_samples"] == 3276` and `assert total_cm_sum == 3276`.
  * This is an older legacy test split count. Running `pytest tests/test_evaluation.py` would currently fail because `metrics.json` has 21,070 and the current clean test set has 2,730.

---

## 6. Reproducibility Assessment

* The evaluation is **100% reproducible**:
  * Running `python evaluate_test_set.py` reads exclusively `dataset/clean/test.csv`.
  * The inference execution is purely deterministic forward passes on frozen weights.
  * Runtime on CPU is ~5.5 minutes (334.3 seconds) for 2,730 images.

---

## 7. Next Steps for User Review

No files have been modified or deleted. Before making any changes to production files, please review and confirm whether you would like to proceed with the following updates:

1. Update `evaluation/metrics.json` with the verified 2,730-sample ensemble metrics (97.40% accuracy, 0.9668 Macro F1, 0.9986 ROC-AUC).
2. Regenerate `evaluation/confusion_matrix.png` and `static/confusion_matrix.png` to display the verified 2,730 test matrix.
3. Update `tests/test_evaluation.py` to assert 2,730 test samples instead of 3,276.
4. Align `README.md` and project documentation to accurately state 97.40% test accuracy.
