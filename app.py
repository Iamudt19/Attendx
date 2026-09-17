"""
AttendX — Hugging Face Spaces Entrypoint (Gradio SDK)

The HF Space supervisor discovers the `demo` variable in this file
and launches it automatically on port 7860.
We MUST NOT call demo.launch() or uvicorn.run() ourselves.
"""
import os
import sys

# ── Fix module collision ─────────────────────────────────────────────────────
# This file is named app.py, which collides with the backend/app/ package.
# Remove any stale 'app' reference from sys.modules so the real package loads.
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# ── Add backend to sys.path ──────────────────────────────────────────────────
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# ── Import FastAPI app from backend ──────────────────────────────────────────
from app.main import app as fastapi_app  # noqa: E402

# ── Build Gradio dashboard ───────────────────────────────────────────────────
import gradio as gr  # noqa: E402

with gr.Blocks(title="AttendX — AI Attendance", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 📸 AttendX — AI Facial Attendance System
    > Production-grade facial recognition attendance powered by OpenCV YuNet + SFace.

    ### 🔗 Live API Endpoints
    | Endpoint | Description |
    |----------|-------------|
    | [`/docs`](/docs) | Interactive Swagger API Documentation |
    | [`/api/health`](/api/health) | System Health Check |

    ### 🚀 Status: **Online & Ready**
    """)

# ── Mount FastAPI onto Gradio ────────────────────────────────────────────────
# This makes all FastAPI routes (/api/*, /docs, /storage/*) available
# alongside the Gradio UI at the root path.
app = gr.mount_gradio_app(fastapi_app, demo, path="/")
