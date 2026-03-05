# ── Data Alchemy — Dockerfile for HuggingFace Spaces ──────────────
# HuggingFace Spaces expects the app to listen on port 7860.
# This is a two-stage build: Node builds the React frontend,
# then Python serves everything with Flask + Gunicorn.

# ── Stage 1: Build React frontend ─────────────────────────────────
FROM node:18-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build
# Output: /build/frontend/dist/

# ── Stage 2: Python backend ────────────────────────────────────────
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
COPY app.py bot_logic.py ./

# Copy built frontend into Flask static folder
COPY --from=frontend-builder /build/frontend/dist/ ./static/dist/

# Create projects directory (ephemeral — wiped on each restart)
RUN mkdir -p static/projects

# HuggingFace Spaces runs as a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# HuggingFace Spaces uses port 7860
EXPOSE 7860

# Environment defaults (override via Space secrets)
ENV FLASK_ENV=production \
    PYTHONUNBUFFERED=1 \
    PROJECTS_DIR=/app/static/projects \
    PROJECT_TTL_HOURS=2 \
    PORT=7860

# Start with Gunicorn — 2 workers, 4 threads each
CMD ["gunicorn", \
     "--bind", "0.0.0.0:7860", \
     "--workers", "2", \
     "--threads", "4", \
     "--timeout", "900", \
     "--keep-alive", "5", \
     "--log-level", "info", \
     "app:app"]
