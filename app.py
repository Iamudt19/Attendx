"""
AttendX — Hugging Face Spaces Entrypoint (Gradio SDK + ZeroGPU)

Uses Gradio as the primary host (required by ZeroGPU), then mounts all
FastAPI API routes alongside the Gradio landing page.
"""
import os
import sys

# ── Fix module collision ─────────────────────────────────────────────────────
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# ── Add backend to sys.path ──────────────────────────────────────────────────
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# ── Import FastAPI application ───────────────────────────────────────────────
from app.main import app as fastapi_app  # noqa: E402

# ── Auto-seed on first boot ─────────────────────────────────────────────────
def _auto_seed_if_empty():
    """Seed database with demo data if no users exist (first boot)."""
    try:
        from app.database.session import SessionLocal
        from app.models.models import User
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        if user_count == 0:
            print("No users found — running database seed for demo data...")
            from seed import seed_db
            seed_db()
        else:
            print(f"Database already has {user_count} users — skipping seed.")
    except Exception as e:
        print(f"Auto-seed check skipped: {e}")

_auto_seed_if_empty()

# ── Gradio UI + ZeroGPU decorated function ───────────────────────────────────
import gradio as gr  # noqa: E402
import spaces  # noqa: E402

@spaces.GPU(duration=5)
def gpu_health_check(input_text: str) -> str:
    """
    Minimal GPU function required by ZeroGPU scheduler.
    Verifies GPU is accessible and reports status.
    """
    import torch
    gpu_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if gpu_available else "CPU-only"
    return f"✅ AttendX API Online | GPU: {device_name} | Status: Healthy"

with gr.Blocks(title="AttendX — AI Attendance API") as demo:
    gr.Markdown("""
    # 📸 AttendX — AI Facial Attendance API
    > Production-grade facial recognition attendance system powered by OpenCV YuNet + SFace.

    ### 🔗 API Endpoints
    | Endpoint | Description |
    |----------|-------------|
    | [📖 Swagger Docs](/docs) | Interactive API Documentation |
    | [📄 ReDoc](/redoc) | API Reference |
    | [🩺 Health Check](/api/health) | System Status |

    ### 🔐 Demo Credentials
    | Role | Email | Password |
    |------|-------|----------|
    | Teacher | `teacher@attendx.edu` | `teacher123` |
    | Admin | `admin@attendx.edu` | `admin123` |

    ---
    """)

    with gr.Row():
        check_btn = gr.Button("🔍 Check GPU Status", variant="primary")
        status_output = gr.Textbox(label="System Status", interactive=False)

    check_btn.click(fn=gpu_health_check, inputs=gr.Textbox(value="check", visible=False), outputs=status_output)

# ── Mount all FastAPI routes onto the Gradio app ─────────────────────────────
# This makes /api/*, /docs, /redoc, /storage/* all available alongside Gradio UI at /
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

# ── Launch Gradio (handles serving on port 7860) ────────────────────────────
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False, ssr_mode=False)
