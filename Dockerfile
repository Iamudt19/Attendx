FROM python:3.10-slim

# ── System dependencies for OpenCV ───────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ──────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy application source ─────────────────────────────────────────────────
COPY . .

# ── Create runtime directories ──────────────────────────────────────────────
RUN mkdir -p storage exports storage/models storage/students storage/classroom_photos

# ── HF Spaces requires port 7860 ────────────────────────────────────────────
EXPOSE 7860

# ── Start the FastAPI server ─────────────────────────────────────────────────
CMD ["python", "app.py"]
