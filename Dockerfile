# ── Data Alchemy — Dockerfile for HuggingFace Spaces (FastAPI v4.0) ──
# HuggingFace Spaces expects the app to listen on port 7860.
# Two-stage build: Node builds the React frontend,
# then Python serves everything with FastAPI + Gunicorn + Uvicorn workers.

# ── Stage 1: Build React frontend ─────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build
# Output: /build/frontend/dist/  (Vite builds to ../static/dist relative to frontend/)
# The Vite outDir is '../static/dist' so the actual output is at /build/static/dist/

# ── Stage 2: Python backend (FastAPI) ─────────────────────────────────
FROM python:3.10-slim

# System deps needed by AutoGluon, ydata-profiling, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY app.py ./
COPY workers.py ./

# Copy built frontend into the static folder served by FastAPI
COPY --from=frontend-builder /build/static/dist/ ./static/dist/

# Create projects directory (ephemeral — wiped on each restart)
RUN mkdir -p static/projects

# HuggingFace Spaces runs as a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# HuggingFace Spaces uses port 7860
EXPOSE 7860

# Environment defaults (override via Space secrets)
ENV PYTHONUNBUFFERED=1 \
    PROJECTS_DIR=/app/static/projects \
    PROJECT_TTL_HOURS=2 \
    PORT=7860

# Start with Gunicorn using Uvicorn ASGI workers.
# 1 worker because the app uses an in-memory project store —
# multiple workers would each hold separate state.
# Use --threads for I/O concurrency within the single worker.
CMD ["gunicorn", \
     "--bind", "0.0.0.0:7860", \
     "--workers", "1", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--threads", "8", \
     "--timeout", "900", \
     "--keep-alive", "5", \
     "--log-level", "info", \
     "app:app"]
