# Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-FF6F00.svg?logo=tensorflow&logoColor=white)](https://tensorflow.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Test Suite](https://img.shields.io/badge/Tests-94%20Passed-brightgreen.svg)]()

An end-to-end deep learning diagnostic assistance platform that classifies clinical chest radiographs into 5 pulmonary conditions: **COVID-19, Lung Opacity, Normal, Viral/Bacterial Pneumonia, and Tuberculosis**, augmented with **Grad-CAM visual explainability overlays**, **clinician authentication**, **prediction history tracking**, and **enterprise-grade upload security**.

---

## 1. Project Overview & Problem Statement

Pulmonary diseases account for millions of hospital admissions annually. While digital chest radiography is the most widely accessible first-line screening tool, interpreting subtle opacities, consolidations, and infiltrates requires specialized radiologist expertise. Misclassifications between viral pneumonia, COVID-19, and non-specific lung opacities remain a major diagnostic challenge.

This project delivers an interpretable, secure, and production-ready deep learning system designed to:
1. Provide probabilistic 5-class differential assessment on uploaded chest X-rays.
2. Render visual heatmaps highlighting exact spatial regions influencing the AI's predictions (Grad-CAM).
3. Offer clinicians a secure, user-isolated dashboard with longitudinal diagnostic history and audit trails.

---

## 2. Key Features

* **Multi-Class Differential Classification**: Classifies frontal chest X-rays into 5 distinct categories with full softmax probability distributions.
* **Grad-CAM Visual Explainability**: Real-time activation mapping using the final convolutional block of ResNet50 (`conv5_block3_3_conv`) overlaid on the original scan.
* **Clinician Authentication & Security**: Secure bcrypt password hashing and stateless JWT Bearer token authentication.
* **Longitudinal History & Isolation**: User-isolated MongoDB persistence ensuring clinicians only see their own prediction records.
* **Multi-Layer Upload Security**: Rejection of empty/corrupted files, 10 MB payload limits, 16 MP / 4096px decompression bomb protection, file extension allowlists, magic-byte validation, and UUIDv4 isolation.
* **Automatic Storage Management**: Background lifecycle engine that prunes stale orphan files while **permanently preserving all files referenced by MongoDB records**.
* **Modern Web Dashboard**: Responsive single-page interface with drag-and-drop uploads, side-by-side radiograph comparisons, interactive probability meters, and performance metrics modals.
* **Production Docker Readiness**: Pre-configured `Dockerfile`, `docker-compose.yml`, and healthcheck architecture.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Deep Learning Engine** | TensorFlow / Keras (ResNet50 Backbone), OpenCV, Pillow, NumPy |
| **Backend & Web API** | FastAPI, Uvicorn, Pydantic v2, Python-Multipart |
| **Database & Persistence** | MongoDB Community 7.0, PyMongo |
| **Authentication & Crypto** | PyJWT / Python-Jose, Passlib, BCrypt |
| **Frontend Dashboard** | HTML5, Vanilla Modern CSS, JavaScript (ES6+), JetBrains Mono & Plus Jakarta Sans |
| **Containerization** | Docker, Docker Compose, Linux Slim Base |
| **Testing & Verification** | Pytest, AnyIO, Starlette TestClient, HTTPX |

---

## 4. Machine Learning Model & Evaluation

### Model Architecture & Ensemble Strategy
The production inference engine employs a dual-model ensemble averaging two independently fine-tuned ResNet50 backbones:
* **Model V3 (Fine-Tuned)**: `models/final_super_model_v3.keras` (Stand-alone test accuracy: 97.18%, Macro F1: 0.9597)
* **Model V1 (Original Backbone)**: `models/final_super_model_old.keras` (Stand-alone test accuracy: 96.08%, Macro F1: 0.9365)
* **Ensemble Fusion**: Uniform softmax probability averaging:
  $$\text{preds}_{\text{ensemble}} = \frac{\text{preds}_{\text{V1}} + \text{preds}_{\text{V3}}}{2.0}$$
* **Input Preprocessing**: Two-stage area-preserving resizing: $(H, W) \to (256, 256) \to (224, 224)$ via `cv2.INTER_AREA`, followed by $[0, 1]$ floating-point rescaling (`/ 255.0`). *Note: CLAHE is not applied during production inference to preserve training intensity distributions.*
* **Explainability Layer**: `conv5_block3_3_conv` ($7 \times 7 \times 1024$ feature activation map).

### The 5 Canonical Disease Classes
1. `COVID` (COVID-19 viral pneumonia manifestations)
2. `Lung_Opacity` (Non-COVID lung opacities, atelectasis, non-specific infiltrates)
3. `Normal` (Clear lung fields, no active focal disease)
4. `Pneumonia` (Bacterial and other viral pneumonias)
5. `Tuberculosis` (Active pulmonary tuberculosis lesions and cavitations)

### Verified Evaluation Results (Clean Held-Out Test Set, $N = 2,730$)
Evaluated on the persistent clean test split (`dataset/clean/test.csv`, 2,730 scans):

| Metric | Model V1 (Original) | Model V3 (Fine-Tuned) | Production Ensemble (V1 + V3) |
| :--- | :---: | :---: | :---: |
| **Accuracy** | 96.08% (2,623 / 2,730) | 97.18% (2,653 / 2,730) | **97.40% (2,659 / 2,730)** |
| **Macro F1-Score** | 0.9365 | 0.9597 | **0.9668** |
| **Weighted F1-Score** | 0.9604 | 0.9719 | **0.9740** |
| **Macro Precision** | 0.9656 | 0.9489 | **0.9653** |
| **Macro Recall** | 0.9142 | 0.9717 | **0.9682** |
| **Macro ROC-AUC (OvR)** | 0.9973 | 0.9985 | **0.9986** |
| **Weighted ROC-AUC (OvR)** | 0.9967 | 0.9979 | **0.9982** |

*Scientific Note: The 97.40% figure represents empirical performance on the specific 2,730-image held-out test manifest. It must not be interpreted as clinically certified accuracy or a guaranteed generalization rate on uncurated external hospital data.*

### Explainability Asymmetry: Ensemble vs. Grad-CAM
* **Prediction Output**: Softmax probabilities displayed to clinicians represent the uniform arithmetic ensemble of both models: $(p_{\text{V1}} + p_{\text{V3}}) / 2.0$.
* **Grad-CAM Visualization**: The heatmap overlay is generated exclusively from the primary **Model V3 (Fine-Tuned)** targeting layer `conv5_block3_3_conv`.
* **Important Interpretation**: The Grad-CAM heatmap highlights spatial regions of interest that influenced Model V3's internal activations. It does **not** visualize Model V1, does not represent a composite ensemble activation, and does not establish medical or diagnostic correctness.

---

## 5. Dataset Information & Audit Findings

The system was evaluated on a cleaned and deduplicated dataset of **18,200 radiographs** partitioned into stratified splits:

* **Train Set**: 12,740 images (70%)
* **Validation Set**: 2,730 images (15%)
* **Held-Out Test Set**: 2,730 images (15%)
* **Split Path Integrity**: Zero filename or path overlap across splits ($\text{Train} \cap \text{Test} = \emptyset, \text{Val} \cap \text{Test} = \emptyset$).
* **Manifests**: Stored permanently in `dataset/clean/train.csv`, `dataset/clean/val.csv`, and `dataset/clean/test.csv`.

### Read-Only Content Hash Audit (9 Exact Cross-Split Duplicates Identified)
A complete MD5 hash audit of all 18,200 images revealed that **9 images in the held-out test split are byte-for-byte identical to images in the training set**, having received different filenames due to adjacent numbering in the public source repositories:
1. `COVID`: `Train: COVID-2942.png` $\leftrightarrow$ `Test: COVID-2941.png`
2. `COVID`: `Train: COVID-2719.png` $\leftrightarrow$ `Test: COVID-2716.png`
3. `COVID`: `Train: COVID-3376.png` $\leftrightarrow$ `Test: COVID-3375.png`
4. `COVID`: `Train: COVID-3574.png` $\leftrightarrow$ `Test: COVID-3573.png`
5. `COVID`: `Train: COVID-52.png` $\leftrightarrow$ `Test: COVID-49.png`
6. `Pneumonia`: `Train: Viral Pneumonia-75.png` $\leftrightarrow$ `Test: Viral Pneumonia-74.png`
7. `Pneumonia`: `Train: Viral Pneumonia-596.png` $\leftrightarrow$ `Test: Viral Pneumonia-595.png`
8. `Tuberculosis`: `Train: tb_ds_Tuberculosis-509.png` $\leftrightarrow$ `Test: tb_ds_Tuberculosis-510.png`
9. `Tuberculosis`: `Train: tb_ds_Tuberculosis-346.png` $\leftrightarrow$ `Test: tb_ds_Tuberculosis-348.png`

*These 9 images account for 0.33% of the test set. To preserve the exact, reproducible evaluation benchmark, the split manifests were intentionally left untouched and are transparently disclosed here for academic review.*

---

## 6. Medical Safety, Scope & Limitations

> [!IMPORTANT]
> **Research & Academic Prototype Notice**:
> This software is strictly an academic demonstration prototype. It is **not a certified medical device** and has not been cleared by regulatory bodies (FDA, CE, CDSCO). Performance metrics describe results on the current held-out dataset split and must **not be interpreted as clinical validation or proof of real-world diagnostic accuracy**. All predictions must be reviewed by certified medical professionals alongside clinical history and laboratory findings.

### Known Limitations
1. **Unverifiable Patient-Level Independence**: Public multi-source datasets (COVID-QU-Ex, Kaggle Chest X-Ray) do not provide unique patient identifiers. Consequently, multi-view or longitudinal patient-level leakage across splits cannot be ruled out.
2. **Frontal Projections Only**: Optimized strictly for standard frontal (PA/AP) chest radiographs; lateral projections and non-thoracic scans are invalid.
3. **Fixed Input Resolution**: Inputs are resized to $224 \times 224$ pixels, which may obscure subtle sub-millimeter micro-nodules or early apical tuberculosis infiltrates.
4. **Single-Scan Context**: Inference operates on isolated static images without access to longitudinal patient history, clinical symptoms, or laboratory biomarkers.

---

## 7. Project Structure

```text
Backend chest x ray/
├── Dockerfile                   # Production container definition
├── docker-compose.yml           # Microservices container orchestrator
├── .dockerignore                # Image optimization manifest
├── .env.example                 # Environment configuration template
├── config.py                    # Centralized settings & retention constants
├── schemas.py                   # Pydantic data schemas & response contracts
├── requirements.txt             # Python dependency manifest
├── main.py                      # FastAPI application entrypoint & routing
├── dataset/                     # Primary dataset (train.csv, val.csv, test.csv)
├── models/
│   ├── final_model.h5           # Trained ResNet50 model weights
│   └── class_labels.json        # 5-class canonical mapping
├── evaluation/
│   ├── metrics.json             # Verified evaluation metrics
│   └── evaluation_metadata.json # Evaluation execution metadata
├── src/
│   ├── auth.py                  # JWT creation, token decoding, bcrypt hashing
│   ├── cleanup.py               # Automatic storage lifecycle management
│   ├── database.py              # MongoDB client & collection handlers
│   ├── gradcam.py               # Grad-CAM heatmap generation engine
│   ├── predict.py               # Model singleton & forward-pass inference
│   ├── preprocess.py            # Image decoding, validation, & resizing
│   └── utils.py                 # Safe extensions, UUID generation, path guards
├── static/
│   ├── index.html               # Single-page diagnostic dashboard
│   ├── uploads/                 # Storage for incoming scans
│   └── heatmaps/                # Storage for generated Grad-CAM overlays
├── docs/                        # Complete technical documentation suite
│   ├── API_DOCUMENTATION.md     # Full REST API endpoints & contracts
│   ├── DOCKER_DEPLOYMENT.md     # Container setup & deployment guide
│   ├── FILE_CLEANUP.md          # Storage cleanup lifecycle specifications
│   ├── GRADCAM.md               # Mathematical Grad-CAM formulation
│   ├── MODEL_EVALUATION.md      # Test metrics, confusion matrix & ROC
│   ├── MODEL_LIMITATIONS.md     # Clinical safety & limitations guide
│   ├── PROJECT_COMPLETION.md    # Comprehensive engineering roadmap audit
│   ├── TESTING.md               # 94-test verification suite documentation
│   └── UPLOAD_SECURITY.md       # Decompression bomb & upload defense guide
└── tests/                       # Automated pytest test suites (94 tests)
    ├── test_auth.py
    ├── test_cleanup.py
    ├── test_database.py
    ├── test_evaluation.py
    ├── test_gradcam.py
    ├── test_history.py
    ├── test_predict.py
    ├── test_robustness_integration.py
    ├── test_safety.py
    └── test_upload_security.py
```

---

## 8. Local Installation & Startup

### Step 1: Clone and Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 3: Run the FastAPI Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
* **Diagnostic Web UI:** [`http://localhost:8000/`](http://localhost:8000/)
* **Interactive Swagger Docs:** [`http://localhost:8000/docs`](http://localhost:8000/docs)
* **ReDoc Documentation:** [`http://localhost:8000/redoc`](http://localhost:8000/redoc)

---

## 9. Running Automated Tests

Run the complete 94-test regression and robustness test suite:
```bash
pytest tests/ -v
```
*(All 94 tests execute in ~1 minute).*

---

## 10. Docker Deployment

### Start All Services (FastAPI + MongoDB)
```bash
docker compose up --build -d
```

### View Live Logs
```bash
docker compose logs -f app
```

### Stop Containers (Preserving Database & Upload Volumes)
```bash
docker compose down
```

---

## 11. Future Research Opportunities (Optional)

* Integration of vision transformers (ViT / Swin Transformer) for multi-resolution feature extraction.
* Multi-label classification heads for co-occurring pulmonary comorbidities.
* DICOM format ingestion with full PACS workstation integration.
