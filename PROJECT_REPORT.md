# Chest X-Ray Multi-Disease Detection & Explainability System
**Comprehensive End-to-End Project Report**

## 1. Project Objective
The primary goal of this project is to provide a robust, AI-powered diagnostic aid for radiologists and healthcare professionals. The system analyzes Chest X-Ray (CXR) scans to detect and classify 5 major pulmonary conditions:
- **COVID-19**
- **Lung Opacity** (Non-COVID)
- **Normal** (Healthy Lungs)
- **Viral/Bacterial Pneumonia**
- **Tuberculosis (TB)**

Additionally, to build trust and transparency in clinical settings, the system integrates **Grad-CAM (Gradient-weighted Class Activation Mapping)** to visually highlight the exact regions of the lung that led the AI to its diagnostic conclusion.

---

## 2. Technology Stack
* **Deep Learning Framework:** TensorFlow 2.x / Keras
* **Core Architecture:** Fine-Tuned **ResNet50** (Pre-trained on ImageNet)
* **Backend Framework:** FastAPI (Python) for ultra-fast, asynchronous API routing.
* **Frontend UI:** Vanilla HTML/CSS/JS with Jinja2 Templating for a premium, responsive user experience.
* **Image Processing:** OpenCV (CLAHE Enhancement), NumPy, Pillow.
* **Quality Assurance:** `pytest` (94 automated test cases ensuring system robustness).

---

## 3. Dataset & Preprocessing
The dataset underwent a strict auditing and deduplication process to prevent data leakage and ensure pure evaluation.

**Final Clean Split (21,635 Total Images):**
* **Training Set:** 15,099 images
* **Validation Set:** 3,260 images
* **Test Set:** 3,276 images (Strictly held-out, never seen during training)

**Inference Preprocessing Pipeline:**
1. Image is loaded and converted to 3-channel RGB.
2. Resized to `(224, 224)` pixels.
3. **CLAHE (Contrast Limited Adaptive Histogram Equalization)** is applied to enhance bone structures and lung tissue contrast.
4. Standardized using ResNet50 specific ImageNet zero-centered scaling.

---

## 4. Model Performance (ResNet50)
The model was rigorously evaluated on the clean, held-out Test Set of 3,276 images.

### Overall Benchmark:
* **Test Accuracy:** **93.04%**
* **Macro F1-Score:** **94.60%**
* **Macro Precision:** 94.59%
* **Macro Recall:** 94.67%

### Class-Wise F1-Scores:
* **Tuberculosis:** 98.59% *(Highest Reliability)*
* **COVID-19:** 96.30%
* **Pneumonia:** 95.52%
* **Normal:** 93.32%
* **Lung Opacity:** 89.28%

---

## 5. Key System Features
1. **Singleton Model Loading:** The heavy 100MB+ ResNet50 model is loaded into RAM exactly once when the server starts. Subsequent predictions are blazingly fast without memory leaks.
2. **Thread-Safe Inference:** The prediction engine is locked with thread mechanisms, allowing multiple doctors/users to query the API concurrently without crashing the TensorFlow graph.
3. **Clinical Transparency (Grad-CAM):** Instead of a "black box" prediction, the system extracts gradients from the `conv5_block3_3_conv` layer of ResNet50 to generate a heatmap over the X-Ray, pointing precisely to the anomaly.
4. **Optimized Codebase:** The project contains zero dead code. All historical, duplicate, and temporary scripts have been purged. The repository strictly contains production-ready active logic.
5. **Security:** File upload endpoints rigorously check for MIME types, file sizes, and malicious extensions.

---

## 6. Optimized Project Structure
```text
D:\MINOR NEW 1\
│
├── app.py                # Main FastAPI entry point and HTML rendering
├── config.py             # System configuration, paths, and metadata
├── PROJECT_REPORT.md     # This comprehensive documentation
├── README.md             # Developer setup and execution guide
│
├── src/                  # Core Backend Logic
│   ├── predict.py        # Singleton model loading & prediction execution
│   ├── gradcam.py        # Heatmap generator
│   ├── preprocess.py     # CLAHE & ResNet50 scaling
│   ├── database.py       # User and history database handlers
│   ├── auth.py           # JWT Authentication
│   └── cleanup.py        # Async file cleanup
│
├── models/               # Model Artifacts
│   └── experiments/resnet50_step5_best.keras (Active Model)
│
├── static/               # Frontend Assets (CSS, JS, Metrics Cache)
├── templates/            # HTML Views (index, dashboard, login)
└── tests/                # 94 Pytest scripts for continuous integration
```

---

## 7. Future Scope (Scalability)
While currently operating at a robust 93%+ accuracy, future iterations of this system could implement:
* **Ensemble Architectures** (combining ResNet50 with DenseNet121) to push accuracy beyond 95%.
* **Higher Resolution Training** (`512x512`) to detect micro-opacities better.
* **Cloud Deployment** using Docker and AWS/GCP for global hospital access.
