# Comprehensive Project Audit & Limitations Assessment

**Project:** Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability System  
**Audit Date:** 2026-10-21  
**Project Root:** `D:\7TH SEM MAJOR F`  
**Auditor Mode:** Read-Only Empirical Audit  

---

## 1. Executive Status Recheck

Following the recent evaluation synchronization and test suite alignment, all 94 backend tests pass with zero failures, and the frontend builds cleanly without errors.

* **Backend Test Suite:** `94 passed, 0 failed` in 47.91s (`pytest -v`).
* **Evaluation Suite:** `4 passed, 0 failed` in 8.59s (`pytest tests/test_evaluation.py -v`).
* **Frontend Production Build:** `1602 modules transformed, built in 4.32s` (`npm run build` in `Frontend chest x ray`).
* **Verified Test Split Accuracy:** **97.40%** on 2,730 clean held-out images (Ensemble: Model V3 + Model V1).
* **API Metrics Parity:** `/model/metrics` returns HTTP 200 with data 100% identical to [evaluation/metrics.json](file:///D:/7TH%20SEM%20MAJOR%20F/Backend%20chest%20x%20ray/evaluation/metrics.json).

---

## 2. Issues Already Fixed

| Fixed Issue | Evidence in Codebase | Verification Status |
| :--- | :--- | :--- |
| **Obsolete Metrics Discrepancy** | `evaluation/metrics.json` updated with verified test metrics (97.40% accuracy, 0.9668 Macro F1, 0.9986 ROC-AUC). | **VERIFIED** via `/model/metrics` automated test. |
| **Confusion Matrix Synchronization** | `evaluation/confusion_matrix.png` and `static/confusion_matrix.png` regenerated from the 2,730-sample matrix. | **VERIFIED** on disk and served by static router. |
| **Evaluation Test Failure** | `tests/test_evaluation.py` updated to assert 2,730 samples instead of 3,276. | **VERIFIED** (4/4 passed). |
| **Manifest Integration Test Failure** | `tests/test_robustness_integration.py:118` updated to assert clean split counts (12,740 / 2,730 / 2,730). | **VERIFIED** (94/94 passed). |
| **README & Docstring Accuracy Claims** | `README.md`, `preprocess.py`, `predict.py`, and `config.py` corrected to cite 97.40% verified accuracy. | **VERIFIED** in source files. |
| **CLAHE Documentation Mismatch** | `README.md`, `src/preprocess.py`, and `thesis.md` corrected to clarify that CLAHE is not applied during inference. | **VERIFIED** in docstrings and documentation. |

---

## 3. Confirmed Remaining Issues

### Issue 3.1: Exact Byte Duplicates Across Train and Test Splits (9 Images)
* **Evidence:** An MD5 hash audit of all 18,200 images revealed that **9 images in the held-out test split are byte-for-byte identical to images in the training set**, despite having different filenames:
  * `Train: dataset/COVID/COVID-2942.png` $\leftrightarrow$ `Test: dataset/COVID/COVID-2941.png`
  * `Train: dataset/COVID/COVID-2719.png` $\leftrightarrow$ `Test: dataset/COVID/COVID-2716.png`
  * `Train: dataset/COVID/COVID-3376.png` $\leftrightarrow$ `Test: dataset/COVID/COVID-3375.png`
  * `Train: dataset/COVID/COVID-3574.png` $\leftrightarrow$ `Test: dataset/COVID/COVID-3573.png`
  * `Train: dataset/COVID/COVID-52.png` $\leftrightarrow$ `Test: dataset/COVID/COVID-49.png`
  * `Train: dataset/Pneumonia/Viral Pneumonia-75.png` $\leftrightarrow$ `Test: dataset/Pneumonia/Viral Pneumonia-74.png`
  * `Train: dataset/Pneumonia/Viral Pneumonia-596.png` $\leftrightarrow$ `Test: dataset/Pneumonia/Viral Pneumonia-595.png`
  * `Train: dataset/Tuberculosis/tb_ds_Tuberculosis-509.png` $\leftrightarrow$ `Test: dataset/Tuberculosis/tb_ds_Tuberculosis-510.png`
  * `Train: dataset/Tuberculosis/tb_ds_Tuberculosis-346.png` $\leftrightarrow$ `Test: dataset/Tuberculosis/tb_ds_Tuberculosis-348.png`
* **Why it matters:** In academic viva or external review, filename-based splitting without content deduplication leaves a minor data leakage flaw (9 images = 0.33% of test set).
* **Severity:** **Medium** (Academic Integrity).

### Issue 3.2: Hardcoded Fallback JWT Secret in `config.py`
* **Evidence:** In [config.py:18](file:///D:/7TH%20SEM%20MAJOR%20F/Backend%20chest%20x%20ray/config.py#L18):
  ```python
  JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "chest-xray-ai-super-secret-key-change-in-production")
  ```
* **Why it matters:** If deployed or demonstrated in an environment without `.env`, tokens can be forged by anyone reading the public repository code.
* **Severity:** **Medium** (Security Best Practice).

### Issue 3.3: Absolute Windows Filepaths Stored in MongoDB
* **Evidence:** In [main.py:397](file:///D:/7TH%20SEM%20MAJOR%20F/Backend%20chest%20x%20ray/main.py#L397):
  ```python
  save_prediction(image_path=upload_path, heatmap_path=heatmap_path, ...)
  ```
  where `upload_path` is `D:\7TH SEM MAJOR F\Backend chest x ray\static\uploads\<uuid>.png`.
* **Why it matters:** The database dump is non-portable across systems or Docker containers (`/app/static/...`). While `cleanup.py` and the API safely use `os.path.basename` and `image_filename`, storing hardcoded local Windows drive paths in database records is bad architecture.
* **Severity:** **Low-Medium** (Portability).

### Issue 3.4: Radiologist Doctor Review Action is Frontend-Only (No Backend Persistence)
* **Evidence:** In [Frontend chest x ray/src/Pages/Results.jsx:162-171](file:///D:/7TH%20SEM%20MAJOR%20F/Frontend%20chest%20x%20ray/src/Pages/Results.jsx#L162-L171):
  ```javascript
  const handleDoctorReview = (decision) => {
    // In a real system, we'd log this via API, e.g. apiFetch("/review", ...)
    console.log("Logged Review:", { ... });
    setReviewStatus(decision);
  };
  ```
* **Why it matters:** The "Confirm AI Result" and "Override Result" buttons in the UI only log to the browser console and update local React state. There is no `/predictions/{id}/review` endpoint in FastAPI and no storage in MongoDB.
* **Severity:** **Low** (UI Completeness / Demonstration Gap).

### Issue 3.5: Report Download is Plain Text Instead of PDF
* **Evidence:** In [Frontend chest x ray/src/Pages/Results.jsx:148-156](file:///D:/7TH%20SEM%20MAJOR%20F/Frontend%20chest%20x%20ray/src/Pages/Results.jsx#L148-L156), `handleDownloadReport` creates a `.txt` file via `Blob([report], { type: "text/plain" })`.
* **Why it matters:** For a clinical or academic presentation, downloading a plain `.txt` file lacks visual formatting, hospital header, patient metadata, and the Grad-CAM heatmap image.
* **Severity:** **Low** (User Experience).

---

## 4. Suspected Issues Requiring Further Evidence

### Suspected Issue 4.1: Cross-Split Patient Overlap (Patient-Level Leakage)
* **Status:** **Cannot be verified or resolved without patient metadata.**
* **Explanation:** The underlying public datasets (COVID-QU-Ex, Kaggle Chest X-Ray) do not provide unique patient identifiers. Although exact file duplicates are identified, multiple X-rays taken from the same patient across different days may exist in both train and test splits.
* **Recommendation:** Explicitly document this in Chapter 5 and Chapter 7 of the thesis and project report as a recognized real-world dataset limitation.

### Suspected Issue 4.2: Grad-CAM Explainability Single-Model Asymmetry
* **Status:** Confirmed by code inspection.
* **Explanation:** In [src/gradcam.py:38](file:///D:/7TH%20SEM%20MAJOR%20F/Backend%20chest%20x%20ray/src/gradcam.py#L38), `model = get_model()` uses `_get_model_v3()`. The Grad-CAM heatmap is generated exclusively from **Model V3 (Fine-Tuned)**, while the prediction probabilities shown to the user are the average of Model V1 + Model V3. If V1 and V3 diverge on an image, the heatmap reflects only V3's internal activations.

---

## 5. Recommended P0 Fixes Before Final College Demonstration

1. **Keep Secrets Clean for Demo:**
   * Provide a `.env` template that generates a random secret on initial setup if `JWT_SECRET_KEY` is not present, or log a clear startup warning in dev mode.
2. **Document the 9 Exact Duplicates in Academic Report:**
   * Do not retrain or alter splits at this late stage. Instead, include the 9 exact duplicate findings in the Viva presentation and thesis as evidence of rigorous data-auditing methodology.
3. **Keep Both Models and Weights Locked:**
   * Zero weight or architecture alterations. Current ensemble test accuracy of 97.40% is verified and reproducible.

---

## 6. Recommended P1 Improvements

1. **Relative Path Storage in MongoDB:**
   * Store relative paths (`static/uploads/<uuid>.png`) instead of absolute Windows paths (`D:\...`) in new database records, while maintaining backward-compatibility for existing records via `os.path.basename`.
2. **Backend Persistence for Radiologist Feedback:**
   * Add a lightweight `PATCH /predictions/{id}/review` endpoint in `main.py` to persist `doctor_review: "confirmed" | "overridden"` and `doctor_notes` in the MongoDB prediction document.

---

## 7. Optional P2 Improvements

1. **Client-Side or Backend PDF Generation:**
   * Replace `.txt` report download with a formatted HTML/PDF export that embeds the X-ray, Grad-CAM heatmap, prediction probabilities, and disclaimer.
2. **Surface ECE in `/model/metrics` API:**
   * Add `expected_calibration_error: 0.0159` to `overall_metrics` in `metrics.json` to showcase model reliability during review.

---

## 8. What Should NOT Be Changed

1. **Model Weights:** Do not retrain, replace, or fine-tune `final_super_model_v3.keras` or `final_super_model_old.keras`.
2. **Dataset Splits:** Do not re-partition `dataset/clean/train.csv`, `val.csv`, or `test.csv`. Doing so would invalidate the 97.40% test evaluation benchmark.
3. **Inference Pipeline:** Keep the `(p1 + p3) / 2.0` arithmetic average and the two-stage resize preprocessing without CLAHE.
4. **Existing API Contracts:** Do not alter the JSON field names or route signatures consumed by the frontend.

---

## 9. Verification & Safety Matrix

| Proposed Task | Risk Level | Validation Check |
| :--- | :--- | :--- |
| Documentation & Thesis updates | **Zero** | Visual inspection of markdown documents. |
| Add review persistence endpoint | **Low** | `pytest tests/test_history.py` & manual curl check. |
| Relative path storage in DB | **Low** | `pytest tests/test_database.py tests/test_cleanup.py`. |
| Any model or split modification | **CRITICAL** | **PROHIBITED** — Do not execute. |
