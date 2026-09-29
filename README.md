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

### Model Architecture
* **Backbone**: ResNet50 pre-trained on ImageNet with customized classification head:
  * Global Average Pooling 2D
  * Batch Normalization
  * Dense Layer (256 units, ReLU, L2 regularization)
  * Dropout (0.4)
  * Dense Softmax Output (5 units)
* **Input Resolution**: $224 \times 224 \times 3$ RGB
* **Explainability Layer**: `conv5_block3_3_conv` ($7 \times 7 \times 1024$ feature map)

### The 5 Canonical Disease Classes
1. `COVID` (COVID-19 viral pneumonia manifestations)
2. `Lung_Opacity` (Non-COVID lung opacities, atelectasis, non-specific infiltrates)
3. `Normal` (Clear lung fields, no active focal disease)
4. `Pneumonia` (Bacterial and other viral pneumonias)
5. `Tuberculosis` (Active pulmonary tuberculosis lesions and cavitations)

### Verified Evaluation Results (Held-Out Test Set, $N = 3,280$)
* **Overall Test Accuracy**: **76.86%**
* **Macro Precision**: **79.37%**
* **Macro Recall**: **76.86%**
* **Macro F1-Score**: **77.70%**
* **Weighted F1-Score**: **77.70%**

---

## 5. Dataset Information

The model was trained, validated, and evaluated on a combined dataset of **21,865 clinical chest X-rays** with deterministic, non-overlapping stratified splits:

* **Train Set**: 15,305 images (70%)
* **Validation Set**: 3,280 images (15%)
* **Held-Out Test Set**: 3,280 images (15%)
* **Total**: 21,865 images across 5 balanced classes
* **Manifests**: Stored permanently in `dataset/train.csv`, `dataset/val.csv`, and `dataset/test.csv`.

---

## 6. Medical Safety & Limitations

> [!IMPORTANT]
> **Research & Educational Notice**:
> This software is intended strictly for research and educational purposes. It is **not a certified medical device** and has not been cleared by regulatory bodies (FDA, CE, CDSCO). It should never be used as a definitive diagnostic tool or as the sole basis for clinical decisions. All predictions must be reviewed by certified medical professionals alongside clinical history and laboratory findings.

### Known Limitations
1. **Frontal Projections Only**: Optimized for standard frontal (PA/AP) chest radiographs; lateral projections and non-thoracic scans are invalid.
2. **Fixed Input Resolution**: Inputs are resized to $224 \times 224$ pixels, which may obscure sub-millimeter micro-nodules.
3. **Single-Scan Context**: Inference is performed on isolated static images without access to patient longitudinal records or laboratory biomarkers.

---

## 7. Project Structure

```text
D:\MINOR NEW 1\
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
