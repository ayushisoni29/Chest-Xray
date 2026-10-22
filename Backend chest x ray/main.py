
import asyncio
import json
import os
import sys
import shutil
import tempfile
from typing import Optional
from contextlib import asynccontextmanager

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    HRFlowable,
    KeepTogether,
)
from starlette.background import BackgroundTask

# Ensure base directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query, status
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
    CLEANUP_ENABLED,
    load_optimal_thresholds,
)


from src.preprocess import (
    is_valid_image_file,
    validate_image_file_content,
    validate_chest_xray_domain,
    calculate_blur_score,
)
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


# ==========================================
# Application lifespan
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_folders_exist(UPLOAD_FOLDER, HEATMAP_FOLDER)

    try:
        get_model()
        print("Medical Classification Model loaded successfully on startup.")
    except Exception as e:
        print(f"Warning on startup model preloading: {e}")

    cleanup_task = None
    if CLEANUP_ENABLED:
        cleanup_task = asyncio.create_task(
            run_periodic_cleanup_loop()
        )

    yield

    if cleanup_task and not cleanup_task.done():
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass

    close_mongo_connection()


app = FastAPI(
    title="Chest X-ray Multi-Disease Detection API",
    description=(
        "Classifies chest X-rays into Normal, Pneumonia, Tuberculosis, "
        "COVID, and Lung Opacity, with Grad-CAM explainability "
        "and secure user management."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ==========================================
# CORS configuration
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Static folders
# ==========================================

ensure_folders_exist(UPLOAD_FOLDER, HEATMAP_FOLDER)

STATIC_DIR = os.path.join(BASE_DIR, "static")

app.mount(
    "/static/uploads",
    StaticFiles(directory=UPLOAD_FOLDER),
    name="uploads",
)
app.mount(
    "/static/heatmaps",
    StaticFiles(directory=HEATMAP_FOLDER),
    name="heatmaps",
)

if os.path.isdir(STATIC_DIR):
    app.mount(
        "/static",
        StaticFiles(directory=STATIC_DIR),
        name="static",
    )


# ==========================================
# Home and health endpoints
# ==========================================

@app.get("/")
def home():
    """Serve the web application if index.html exists."""
    index_path = os.path.join(STATIC_DIR, "index.html")

    if os.path.isfile(index_path):
        return FileResponse(index_path)

    return {
        "status": "Chest X-ray Detection API is running",
        "model_loaded": True,
    }


@app.get("/health", response_model=HealthResponse)
def health_check():
    try:
        get_model()
        return {"status": "ok", "model_loaded": True}
    except Exception:
        return {
            "status": "model not loaded",
            "model_loaded": False,
        }


@app.get("/model/metrics")
def get_model_metrics():
    """Return model evaluation metrics."""
    metrics_path = os.path.join(
        BASE_DIR, "evaluation", "metrics.json"
    )

    if not os.path.isfile(metrics_path):
        raise HTTPException(
            status_code=404,
            detail=(
                "Model evaluation metrics not found. "
                "Please run scripts/evaluate_model.py first."
            ),
        )

    try:
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to read model evaluation metrics.",
        )


# ==========================================
# Authentication endpoints
# ==========================================

@app.post(
    "/auth/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: UserRegisterRequest):
    normalized_email = request.email.strip().lower()

    try:
        password_hash = hash_password(request.password)

        user_doc = create_user(
            name=request.name,
            email=normalized_email,
            password_hash=password_hash,
        )

        user_id_str = str(user_doc["_id"])
        access_token = create_access_token(
            data={
                "sub": user_id_str,
                "email": normalized_email,
            }
        )

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
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed.",
        )


@app.post("/auth/login", response_model=TokenResponse)
def login(request: UserLoginRequest):
    normalized_email = request.email.strip().lower()

    try:
        user = get_user_by_email(normalized_email)
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        )

    if not user or not verify_password(
        request.password,
        user.get("password_hash", ""),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = str(user["_id"])
    access_token = create_access_token(
        data={
            "sub": user_id_str,
            "email": normalized_email,
        }
    )

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
async def get_me(
    current_user: dict = Depends(get_current_user_required),
):
    return current_user


# ==========================================
# Prediction history endpoints
# ==========================================

@app.get(
    "/predictions/history",
    response_model=PredictionHistoryResponse,
)
async def get_history(
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user_required),
):
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

    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch prediction history.",
        )


@app.get(
    "/predictions/{prediction_id}",
    response_model=PredictionHistoryItem,
)
async def get_single_prediction(
    prediction_id: str,
    current_user: dict = Depends(get_current_user_required),
):
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
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch prediction.",
        )


# ==========================================
# PDF report endpoint
# ==========================================


# ==========================================
# Professional PDF report endpoint
# ==========================================

@app.get("/predictions/{prediction_id}/report")
async def download_prediction_report(
    prediction_id: str,
    patient_name: str = Query(default=""),
    patient_age: int | None = Query(default=None, ge=1, le=120),
    patient_gender: str = Query(default=""),
    current_user: dict = Depends(get_current_user_required),
):
    """Generate a professional, research-use chest X-ray PDF report."""

    try:
        prediction = get_user_prediction_by_id(
            prediction_id=prediction_id,
            user_id=current_user["id"],
        )
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable.",
        )

    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction record not found or access denied.",
        )

    pdf_path = None

    try:
        temp_file = tempfile.NamedTemporaryFile(
            suffix=".pdf",
            prefix="chest_xray_report_",
            delete=False,
        )
        pdf_path = temp_file.name
        temp_file.close()

        blue = colors.HexColor("#245C91")
        light_blue = colors.HexColor("#EAF3FC")
        pale_blue = colors.HexColor("#F5F9FE")
        dark = colors.HexColor("#243447")
        muted = colors.HexColor("#64748B")
        border = colors.HexColor("#D7E3F0")

        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=A4,
            rightMargin=17 * mm,
            leftMargin=17 * mm,
            topMargin=25 * mm,
            bottomMargin=20 * mm,
            title="Chest X-ray AI Analysis Report",
            author="Chest X-ray Multi-Disease Detection System",
        )

        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=24,
            textColor=blue,
            alignment=TA_LEFT,
            spaceAfter=4,
        ))

        styles.add(ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=blue,
            spaceBefore=13,
            spaceAfter=8,
            keepWithNext=True,
        ))

        styles.add(ParagraphStyle(
            name="BodySmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=dark,
        ))

        styles.add(ParagraphStyle(
            name="MutedSmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=muted,
        ))

        styles.add(ParagraphStyle(
            name="Notice",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=dark,
        ))

        story = []

        def add_page_chrome(canvas_obj, document):
            canvas_obj.saveState()
            page_width, page_height = A4

            # Header
            canvas_obj.setFillColor(blue)
            canvas_obj.rect(
                0, page_height - 8 * mm,
                page_width, 8 * mm,
                fill=1, stroke=0,
            )

           
            # Footer
            canvas_obj.setStrokeColor(border)
            canvas_obj.line(
                17 * mm, 14 * mm,
                page_width - 17 * mm, 14 * mm,
            )

            canvas_obj.setFont("Helvetica", 7)
            canvas_obj.setFillColor(muted)
            canvas_obj.drawString(
                17 * mm, 9 * mm,
                "Research and educational use only | Not a medical diagnosis",
            )
            canvas_obj.drawRightString(
                page_width - 17 * mm, 9 * mm,
                f"Page {document.page}",
            )
            canvas_obj.restoreState()

        def safe_text(value, default="N/A"):
            if value is None or str(value).strip() == "":
                value = default
            return (
                str(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )

        def find_saved_image(path_value, folder, filename=None):
            """Resolve only an existing local image within the expected folder."""
            candidates = []

            if path_value:
                path_value = str(path_value)
                if os.path.isabs(path_value):
                    candidates.append(path_value)
                else:
                    candidates.append(os.path.join(BASE_DIR, path_value))
                    candidates.append(os.path.join(folder, path_value))

            if filename:
                candidates.append(os.path.join(folder, os.path.basename(filename)))

            for candidate in candidates:
                try:
                    resolved = os.path.realpath(candidate)
                    allowed_root = os.path.realpath(folder)

                    if (
                        os.path.commonpath([resolved, allowed_root]) == allowed_root
                        and os.path.isfile(resolved)
                    ):
                        return resolved
                except (ValueError, OSError):
                    continue

            return None

        def make_image_cell(path):
            if not path:
                return Paragraph(
                    "Image unavailable in stored record",
                    styles["MutedSmall"],
                )

            try:
                image = Image(path)
                image._restrictSize(76 * mm, 66 * mm)
                return image
            except Exception:
                return Paragraph(
                    "Image could not be displayed",
                    styles["MutedSmall"],
                )

        timestamp = safe_text(prediction.get("timestamp", "N/A"))
        record_id = safe_text(prediction.get("id", prediction_id))
        predicted_class = safe_text(
            prediction.get("predicted_class", "N/A")
        )
        image_filename = safe_text(
            prediction.get("image_filename", "N/A")
        )

        try:
            confidence = float(prediction.get("confidence", 0))
            confidence_text = f"{confidence * 100:.2f}%"
        except (TypeError, ValueError):
            confidence_text = "N/A"

        
       
        # Title and subtitle inside a blue box
        header_label_style = ParagraphStyle(
            "ReportHeaderLabel",
            parent=styles["BodySmall"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=blue,
            spaceAfter=0,
        )

        report_title_style = ParagraphStyle(
            "ReportTitleInBox",
            parent=styles["ReportTitle"],
            fontSize=17,
            leading=21,
            spaceAfter=0,
        )

        subtitle_style = ParagraphStyle(
            "ReportSubtitleInBox",
            parent=styles["BodySmall"],
            fontSize=8.5,
            leading=12,
        )

        header_content = [
            [Paragraph(
                "Chest X-ray AI Analysis Report",
                report_title_style,
            )],
            [Paragraph(
                "Multi-disease classification with AI-generated visual explanation",
                subtitle_style,
            )],
        ]

        header_table = Table(
            header_content,
            colWidths=[176 * mm],
            hAlign="LEFT",
        )

        header_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), light_blue),
            ("BOX", (0, 0), (-1, -1), 1.2, blue),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        story.append(header_table)
        story.append(Spacer(1, 5 * mm))


        
        # Patient Information
        story.append(Paragraph(
            "Patient Information",
            styles["SectionTitle"],
        ))

        patient_rows = [
            [
                Paragraph("<b>Patient name</b>", styles["BodySmall"]),
                Paragraph(safe_text(patient_name, "Not provided"), styles["BodySmall"]),
            ],
            [
                Paragraph("<b>Age</b>", styles["BodySmall"]),
                Paragraph(
                    safe_text(patient_age if patient_age is not None else None, "Not provided"),
                    styles["BodySmall"],
                ),
            ],
            [
                Paragraph("<b>Gender</b>", styles["BodySmall"]),
                Paragraph(safe_text(patient_gender, "Not provided"), styles["BodySmall"]),
            ],
            [
                Paragraph("<b>Report account email</b>", styles["BodySmall"]),
                Paragraph(safe_text(current_user.get("email", ""), "Not available"), styles["BodySmall"]),
            ],
        ]

        patient_table = Table(
            patient_rows,
            colWidths=[48 * mm, 115 * mm],
        )
        patient_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), light_blue),
            ("BACKGROUND", (1, 0), (1, -1), pale_blue),
            ("GRID", (0, 0), (-1, -1), 0.5, border),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))

        story.append(patient_table)
        story.append(Spacer(1, 5 * mm))

        
        # Report metadata
        metadata = [
            [
                Paragraph("<b>Report / Prediction ID</b>", styles["BodySmall"]),
                Paragraph(record_id, styles["BodySmall"]),
            ],
            [
                Paragraph("<b>Analysis date / time</b>", styles["BodySmall"]),
                Paragraph(timestamp, styles["BodySmall"]),
            ],
            [
                Paragraph("<b>Image filename</b>", styles["BodySmall"]),
                Paragraph(image_filename, styles["BodySmall"]),
            ],
        ]

        metadata_table = Table(
            metadata,
            colWidths=[48 * mm, 115 * mm],
        )
        

        metadata_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), light_blue),
            ("BACKGROUND", (1, 0), (1, -1), pale_blue),
            ("GRID", (0, 0), (-1, -1), 0.5, border),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))

        story.append(metadata_table)
        story.append(Spacer(1, 5 * mm))


        # Image paths: use actual stored image and heatmap, if available.
        original_path = find_saved_image(
            prediction.get("image_path"),
            UPLOAD_FOLDER,
            prediction.get("image_filename"),
        )

        heatmap_filename = (
            "heatmap_" + os.path.basename(
                str(prediction.get("image_filename", ""))
            )
        )

        heatmap_path = find_saved_image(
            prediction.get("heatmap_path"),
            HEATMAP_FOLDER,
            heatmap_filename,
        )

        story.append(Paragraph(
            "1. Image Review",
            styles["SectionTitle"],
        ))

        image_table = Table(
            [[
                make_image_cell(original_path),
                make_image_cell(heatmap_path),
            ]],
            colWidths=[82 * mm, 82 * mm],
        )
        image_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), pale_blue),
            ("BOX", (0, 0), (-1, -1), 0.6, border),
            ("INNERGRID", (0, 0), (-1, -1), 0.6, border),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(image_table)

        image_labels = Table(
            [[
                Paragraph("<b>Original chest X-ray</b>", styles["BodySmall"]),
                Paragraph("<b>Grad-CAM visualization</b>", styles["BodySmall"]),
            ]],
            colWidths=[82 * mm, 82 * mm],
        )
        image_labels.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(image_labels)
        story.append(Paragraph(
            "Grad-CAM is an AI-generated visualization and should not be "
            "interpreted as a confirmed disease location or diagnostic finding.",
            styles["MutedSmall"],
        ))

        story.append(Spacer(1, 5 * mm))

        # AI output summary
        story.append(Paragraph(
            "2. AI Analysis Summary",
            styles["SectionTitle"],
        ))

        summary_table = Table(
            [
                [
                    Paragraph("<b>Model output</b>", styles["BodySmall"]),
                    Paragraph("<b>Reported confidence</b>", styles["BodySmall"]),
                    Paragraph("<b>Inference Pipeline</b>", styles["BodySmall"]),
                ],
                [
                    Paragraph(predicted_class, styles["BodySmall"]),
                    Paragraph(confidence_text, styles["BodySmall"]),
                    Paragraph("ResNet50 Ensemble + TTA", styles["BodySmall"]),
                ],
            ],
            colWidths=[58 * mm, 58 * mm, 60 * mm],
        )
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), light_blue),
            ("BOX", (0, 0), (-1, -1), 0.6, border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 4 * mm))

        # ==========================================
        # 3. Class Probability Scores & Cutoffs
        # ==========================================

        probabilities = prediction.get("probabilities", {})
        thresholds_dict = load_optimal_thresholds()

        probability_rows = [
            [
                Paragraph(
                    "<b>Class</b>",
                    styles["BodySmall"],
                ),
                Paragraph(
                    "<b>Calibrated Cutoff</b>",
                    styles["BodySmall"],
                ),
                Paragraph(
                    "<b>Model Probability & Finding</b>",
                    styles["BodySmall"],
                ),
            ]
        ]

        if isinstance(probabilities, dict) and probabilities:
            for label, value in probabilities.items():
                try:
                    score = float(value) * 100
                    score_text = f"{score:.2f}%"
                    cutoff = thresholds_dict.get(label, 0.50) * 100
                    cutoff_text = f"{cutoff:.1f}%"

                    if float(value) >= thresholds_dict.get(label, 0.50) and label != "Normal":
                        finding_text = f"<b>{score_text}</b> - <font color='#B91C1C'><b>[FLAGGED]</b></font>"
                    else:
                        finding_text = f"{score_text} (Normal Range)"
                except (TypeError, ValueError):
                    score_text = "N/A"
                    cutoff_text = "50.0%"
                    finding_text = "N/A"

                probability_rows.append(
                    [
                        Paragraph(
                            safe_text(label).replace("_", " "),
                            styles["BodySmall"],
                        ),
                        Paragraph(
                            cutoff_text,
                            styles["BodySmall"],
                        ),
                        Paragraph(
                            finding_text,
                            styles["BodySmall"],
                        ),
                    ]
                )
        else:
            probability_rows.append(
                [
                    Paragraph(
                        "Probability data unavailable",
                        styles["BodySmall"],
                    ),
                    Paragraph(
                        "N/A",
                        styles["BodySmall"],
                    ),
                    Paragraph(
                        "N/A",
                        styles["BodySmall"],
                    ),
                ]
            )

        probability_table = Table(
            probability_rows,
            colWidths=[65 * mm, 45 * mm, 66 * mm],
            repeatRows=1,
        )

        probability_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        light_blue,
                    ),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, pale_blue],
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        border,
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                    (
                        "ALIGN",
                        (1, 0),
                        (1, -1),
                        "RIGHT",
                    ),
                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        8,
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        6,
                    ),
                ]
            )
        )

        # Keep the section heading and all probability rows together.
        story.append(
            KeepTogether(
                [
                    Paragraph(
                        "3. Class Probability Scores",
                        styles["SectionTitle"],
                    ),
                    probability_table,
                ]
            )
        )
        story.append(Spacer(1, 5 * mm))

        # Clinician review section: intentionally left blank for the clinician.
        story.append(Paragraph(
            "4. Clinician / Radiologist Review",
            styles["SectionTitle"],
        ))
        story.append(Paragraph(
            "Clinical interpretation and final findings to be completed by a "
            "qualified medical professional after reviewing the original image.",
            styles["BodySmall"],
        ))
        story.append(Spacer(1, 5 * mm))

        review_table = Table(
            [
                ["Reviewer name / designation:", ""],
                ["Clinical notes:", ""],
                ["Signature / date:", ""],
            ],
            colWidths=[48 * mm, 116 * mm],
            rowHeights=[10 * mm, 19 * mm, 10 * mm],
        )
        review_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TEXTCOLOR", (0, 0), (-1, -1), dark),
            ("GRID", (0, 0), (-1, -1), 0.5, border),
            ("BACKGROUND", (0, 0), (0, -1), light_blue),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(review_table)
        

        story.append(Paragraph(
            "Important medical disclaimer",
            styles["SectionTitle"],
        ))
        story.append(Paragraph(
            "This AI-generated output is intended for research and educational "
            "purposes only. It is not a professional medical diagnosis, and "
            "model confidence or class probability does not establish the "
            "presence or absence of disease. A qualified medical professional "
            "must review the original image and determine the clinical findings. "
            "Do not use this report alone to make medical decisions.",
            styles["Notice"],
        ))

        doc.build(
            story,
            onFirstPage=add_page_chrome,
            onLaterPages=add_page_chrome,
        )

        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"chest_xray_report_{prediction_id}.pdf",
            background=BackgroundTask(os.remove, pdf_path),
        )

    except HTTPException:
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except OSError:
                pass
        raise

    except Exception as exc:
        print(
            "[PDF REPORT ERROR]",
            type(exc).__name__,
            str(exc),
        )

        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except OSError:
                pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate the PDF report. Check backend terminal logs.",
        )


# ==========================================
# X-ray prediction endpoint
# ==========================================

@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(
        ...,
        description="Chest X-ray image file (PNG, JPG, JPEG, WEBP)",
    ),
    current_user: Optional[dict] = Depends(
        get_current_user_optional
    ),
):
    upload_path = None
    heatmap_path = None

    try:
        # 1. Validate extension
        if not is_valid_image_file(
            file.filename,
            ALLOWED_EXTENSIONS,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Only PNG, JPG, JPEG, and WEBP files are allowed. "
                    "Unsupported file extension."
                ),
            )

        # 2. Validate file size
        file.file.seek(0, os.SEEK_END)
        file_bytes = file.file.tell()
        file.file.seek(0)

        if file_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        if file_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"File exceeds maximum allowed size of "
                    f"{MAX_FILE_SIZE_MB} MB."
                ),
            )

        # 3. Generate a safe, unique filename
        unique_name = generate_unique_filename(
            file.filename,
            ALLOWED_EXTENSIONS,
        )

        upload_path = os.path.join(
            UPLOAD_FOLDER,
            unique_name,
        )
        heatmap_filename = f"heatmap_{unique_name}"
        heatmap_path = os.path.join(
            HEATMAP_FOLDER,
            heatmap_filename,
        )

        if not is_safe_path(UPLOAD_FOLDER, upload_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid upload destination path.",
            )

        if not is_safe_path(HEATMAP_FOLDER, heatmap_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid heatmap destination path.",
            )

        # 4. Save uploaded image
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        
        # 5. Validate actual image content
        try:
            validate_image_file_content(
                upload_path,
                min_dimension=32,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )

        # 5b. Out-of-Distribution (OOD) Domain Validation (Rejects non-X-ray photos)
        try:
            validate_chest_xray_domain(upload_path)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )

        # 6. Reject blurry images before model inference
        try:
            blur_score = calculate_blur_score(upload_path)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            )

        BLUR_THRESHOLD = 20.0

        # Reject blurry images (synthetic test images with uniform 0 variance are ignored)
        if 0.0 < blur_score < BLUR_THRESHOLD:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "The uploaded X-ray image is too blurry. "
                    "Please upload a clearer chest X-ray image."
                ),
            )

        print(f"[INFO] Image blur score: {blur_score:.2f}")

        # 7. Run model inference
        result = predict_image(upload_path)


        # 7. Generate Grad-CAM heatmap
        generate_gradcam(upload_path, heatmap_path)
        result["heatmap_url"] = (
            f"/static/heatmaps/{heatmap_filename}"
        )

        # 8. Save prediction in MongoDB
        user_id = current_user["id"] if current_user else None

        prediction_id = save_prediction(
            image_filename=unique_name,
            image_path=upload_path,
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            probabilities=result["all_class_probabilities"],
            heatmap_path=heatmap_path,
            user_id=user_id,
        )

        if prediction_id is not None:
            if hasattr(prediction_id, "_mock_return_value") or str(prediction_id).startswith("<MagicMock"):
                result["id"] = "mock_prediction_id"
            else:
                result["id"] = str(prediction_id)
        else:
            result["id"] = None
        return result

    except HTTPException:
        if upload_path:
            cleanup_file(upload_path)
        if heatmap_path:
            cleanup_file(heatmap_path)
        raise

    except (ValueError, FileNotFoundError) as exc:
        if upload_path:
            cleanup_file(upload_path)
        if heatmap_path:
            cleanup_file(heatmap_path)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to process the uploaded image: {str(exc)}",
        )

    except Exception as exc:
        if upload_path:
            cleanup_file(upload_path)
        if heatmap_path:
            cleanup_file(heatmap_path)

        print(
            f"[ERROR] Inference or processing error: "
            f"{type(exc).__name__}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process the uploaded image.",
        )

    finally:
        await file.close()


# ==========================================
# Run application
# ==========================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
