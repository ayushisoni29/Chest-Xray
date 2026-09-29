# Production Dockerfile for Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability API
FROM python:3.11-slim

# Set environment variables for production execution
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000

# Install essential system dependencies (libgl for OpenCV, curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency manifest and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code and verified artifacts
COPY main.py config.py schemas.py ./
COPY src/ ./src/
COPY models/ ./models/
COPY static/ ./static/
COPY evaluation/ ./evaluation/

# Ensure runtime storage directories exist
RUN mkdir -p /app/static/uploads /app/static/heatmaps

# Expose standard FastAPI application port
EXPOSE 8000

# Docker healthcheck querying the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production startup command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
