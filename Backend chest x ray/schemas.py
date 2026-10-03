from pydantic import BaseModel, EmailStr, Field
from typing import Dict, Optional
from datetime import datetime


class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float
    all_class_probabilities: Dict[str, float]
    heatmap_url: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of user/clinician")
    email: str = Field(..., min_length=5, max_length=150, description="User email address")
    password: str = Field(..., min_length=6, max_length=100, description="Account password (min 6 chars)")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PredictionHistoryItem(BaseModel):
    id: str
    image_filename: str
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    heatmap_url: Optional[str] = None
    image_url: Optional[str] = None
    timestamp: datetime


class PredictionHistoryResponse(BaseModel):
    items: list[PredictionHistoryItem]
    total: int
    limit: int
    skip: int
