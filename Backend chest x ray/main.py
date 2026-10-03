import asyncio
import json
import os
import sys
import shutil
from typing import Optional
from contextlib import asynccontextmanager

# Ensure base directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pymongo.errors import DuplicateKeyError

from config import (
    UPLOAD_FOLDER,
    HEATMAP_FOLDER,
    ALLOWED_EXTENSIONS,
    ALLOWED_ORIGINS,
    MAX_FILE_SIZE_MB,
    MAX_FILE_SIZE_BYTES,
    BASE_DIR,
    CLEANUP_ENABLED,
)
from src.preprocess import is_valid_image_file, validate_image_file_content
from src.predict import predict_image, get_model
from src.gradcam import generate_gradcam
from src.utils import (
    generate_unique_filename,
    ensure_folders_exist,
    is_safe_path,
    cleanup_file,
)
from src.cleanup import run_periodic_cleanup_loop
from src.database import (
    save_prediction,
    close_mongo_connection,
    create_user,
    get_user_by_email,
    get_user_prediction_history,
    get_user_prediction_by_id,
)
from src.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_optional,
    get_current_user_required,
)
from schemas import (
    PredictionResponse,
    HealthResponse,
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    PredictionHistoryItem,
    PredictionHistoryResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure static folders exist and warm up the deep learning model
    ensure_folders_exist(UPLOAD_FOLDER, HEATMAP_FOLDER)
    try:
        get_model()
        print("Medical Classification Model loaded successfully on startup.")
    except Exception as e:
        print(f"Warning on startup model preloading: {e}")

    # Launch background periodic file cleanup worker
    cleanup_task = None
    if CLEANUP_ENABLED:
        cleanup_task = asyncio.create_task(run_periodic_cleanup_loop())

    yield

    # Shutdown: cancel cleanup background worker and close MongoDB connection
    if cleanup_task and not cleanup_task.done():
        cleanup_task.cancel()
        try:
            await cleanup_task
        except (asyncio.CancelledError, Exception):
            pass

    close_mongo_connection()



app = FastAPI(
    title="Chest X-ray Multi-Disease Detection API",
    description="Classifies chest X-rays into Normal, Pneumonia, Tuberculosis, COVID, and Lung Opacity, with Grad-CAM explainability and secure user management.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allows web/mobile frontends (React, Vue, Streamlit, etc.) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_folders_exist(UPLOAD_FOLDER, HEATMAP_FOLDER)

# Serve uploaded images and heatmaps as static files
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")
app.mount("/static/heatmaps", StaticFiles(directory=HEATMAP_FOLDER), name="heatmaps")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


@app.get("/")
def home():
    """Serves the interactive Web Application for Drag & Drop image analysis and Grad-CAM viewing."""
    index_path = os.path.join(BASE_DIR, "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "Chest X-ray Detection API is running", "model_loaded": True}


@app.get("/health", response_model=HealthResponse)
def health_check():
    try:
        get_model()
        return {"status": "ok", "model_loaded": True}
    except Exception:
        return {"status": "model not loaded", "model_loaded": False}


@app.get("/model/metrics")
def get_model_metrics():
    """Returns the verified evaluation metrics and confusion matrix data for the trained ResNet50 model."""
    metrics_path = os.path.join(BASE_DIR, "evaluation", "metrics.json")
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read metrics: {str(e)}")
    raise HTTPException(
        status_code=404,
        detail="Model evaluation metrics not found. Please run scripts/evaluate_model.py first."
    )


# ==========================================
# Authentication Endpoints
# ==========================================

@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: UserRegisterRequest):
    """Registers a new clinician/user account, hashes password, and returns a JWT access token."""
    normalized_email = request.email.strip().lower()

    try:
        password_hash = hash_password(request.password)
        user_doc = create_user(
            name=request.name,
            email=normalized_email,
            password_hash=password_hash,
        )

        user_id_str = str(user_doc["_id"])
        access_token = create_access_token(data={"sub": user_id_str, "email": normalized_email})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id_str,
                "name": user_doc["name"],
                "email": user_doc["email"],
                "created_at": user_doc["created_at"],
            },
        }

    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@app.post("/auth/login", response_model=TokenResponse)
def login(request: UserLoginRequest):
    """Authenticates a user via email & password and returns a JWT access token."""
    normalized_email = request.email.strip().lower()

    try:
        user = get_user_by_email(normalized_email)
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {str(e)}",
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id_str, "email": normalized_email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id_str,
            "name": user["name"],
            "email": user["email"],
            "created_at": user.get("created_at"),
        },
    }


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user_required)):
    """Returns the authenticated profile of the currently logged-in user."""
    return current_user


# ==========================================
# Prediction History Endpoints
# ==========================================

@app.get("/predictions/history", response_model=PredictionHistoryResponse)
async def get_history(
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user_required),
):
    """
    Retrieves the prediction history belonging exclusively to the authenticated user.
    Results are sorted descending by timestamp (newest first) and paginated.
    """
    # Validate pagination bounds
    limit = max(1, min(100, limit))
    skip = max(0, skip)

    try:
        items, total = get_user_prediction_history(
            user_id=current_user["id"],
            limit=limit,
            skip=skip,
        )
        return {
            "items": items,
            "total": total,
            "limit": limit,
            "skip": skip,
        }
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection unavailable: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch prediction history: {str(e)}",
        )


@app.get("/predictions/{prediction_id}", response_model=PredictionHistoryItem)
async def get_single_prediction(
    prediction_id: str,
    current_user: dict = Depends(get_current_user_required),
):
    """
    Retrieves a single prediction by ID.
    Enforces strict user-isolation: Returns 404 if prediction does not exist or belongs to another user.
    """
    try:
        prediction = get_user_prediction_by_id(
            prediction_id=prediction_id,
            user_id=current_user["id"],
        )
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction record not found or access denied.",
            )
        return prediction
    except HTTPException:
        raise
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection unavailable: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch prediction: {str(e)}",
        )


# ==========================================
# Diagnostic / Prediction Endpoint
# ==========================================

@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(
        ...,
        description="Chest X-ray image file (PNG, JPG, JPEG, WEBP)",
    ),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    # 1. Validate file extension strictly
    if not is_valid_image_file(file.filename, ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Only {', '.join('.' + ext for ext in sorted(ALLOWED_EXTENSIONS))} files are allowed."
        )

    # 2. Validate file size and reject empty or oversized payloads before processing
    file.file.seek(0, os.SEEK_END)
    file_bytes = file.file.tell()
    file.file.seek(0)

    if file_bytes == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty (0 bytes). Please upload a valid image file."
        )

    if file_bytes > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB} MB."
        )

    # 3. Generate sanitized, cryptographically random UUID filename
    unique_name = generate_unique_filename(file.filename, ALLOWED_EXTENSIONS)
    upload_path = os.path.join(UPLOAD_FOLDER, unique_name)
    heatmap_filename = f"heatmap_{unique_name}"
    heatmap_path = os.path.join(HEATMAP_FOLDER, heatmap_filename)

    # Path traversal protection
    if not is_safe_path(UPLOAD_FOLDER, upload_path):
        raise HTTPException(status_code=400, detail="Invalid upload destination path.")
    if not is_safe_path(HEATMAP_FOLDER, heatmap_path):
        raise HTTPException(status_code=400, detail="Invalid heatmap destination path.")

    # 4. Stream write file to disk
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 5. Deep content validation (format detection, dimension limits, corruption checks)
    try:
        validate_image_file_content(upload_path, min_dimension=32)
    except ValueError as val_err:
        cleanup_file(upload_path)
        raise HTTPException(status_code=400, detail=str(val_err))

    try:
        # 6. Run model inference
        result = predict_image(upload_path)

        # 7. Generate Grad-CAM heatmap overlay
        generate_gradcam(upload_path, heatmap_path)
        result["heatmap_url"] = f"/static/heatmaps/{heatmap_filename}"

        # 8. Persist prediction record to MongoDB (gracefully degrades on database outage)
        user_id = current_user["id"] if current_user else None
        save_prediction(
            image_filename=unique_name,
            image_path=upload_path,
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            probabilities=result["all_class_probabilities"],
            heatmap_path=heatmap_path,
            user_id=user_id,
        )

        return result

    except HTTPException:
        cleanup_file(upload_path)
        cleanup_file(heatmap_path)
        raise
    except (ValueError, FileNotFoundError) as ve:
        cleanup_file(upload_path)
        cleanup_file(heatmap_path)
        raise HTTPException(
            status_code=400,
            detail=f"Unable to process the uploaded image: {str(ve)}"
        )
    except Exception as e:
        # Clean sanitized error response without exposing internal server paths or stack traces
        cleanup_file(upload_path)
        cleanup_file(heatmap_path)
        print(f"[ERROR] Inference or processing error: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail="Unable to process the uploaded image."
        )



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
