"""
AttendX — Hugging Face Spaces Entrypoint (Gradio SDK + ZeroGPU)

Architecture:
  1. FastAPI app has all API routes (/api/*, /docs, /storage/*)
  2. Gradio Blocks provides the landing page UI + GPU health check
  3. gr.mount_gradio_app() merges both into a single ASGI app
  4. uvicorn serves the combined app on port 7860

We do NOT call demo.launch() — that creates a separate server without
our FastAPI routes. Instead, uvicorn.run() serves everything together.
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

# ── Gradio UI + ZeroGPU function ─────────────────────────────────────────────
import gradio as gr  # noqa: E402
import spaces  # noqa: E402

@spaces.GPU(duration=5)
def gpu_health_check(input_text: str) -> str:
    """GPU function required by ZeroGPU scheduler."""
    try:
        import torch
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            return f"✅ AttendX Online | GPU: {device_name}"
        return "✅ AttendX Online | Mode: CPU"
    except Exception:
        return "✅ AttendX Online | Mode: CPU (torch not available)"

# Build Gradio UI (intentionally NOT named 'demo' to prevent HF auto-launch)
gradio_ui = gr.Blocks(title="AttendX — AI Attendance API")
with gradio_ui:
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

    check_btn.click(
        fn=gpu_health_check,
        inputs=gr.Textbox(value="check", visible=False),
        outputs=status_output,
    )

# ── Merge Gradio + FastAPI into ONE app ──────────────────────────────────────
# Gradio UI lives at "/", FastAPI routes (/api/*, /docs, /storage/*) remain intact.
# Direct FastAPI routes take priority over the Gradio sub-app.
combined_app = gr.mount_gradio_app(fastapi_app, gradio_ui, path="/")

# ── Serve the combined app on port 7860 ──────────────────────────────────────
# We run uvicorn ourselves (NOT demo.launch) so both Gradio UI and FastAPI
# routes are served from the same process on the same port.
import uvicorn  # noqa: E402
uvicorn.run(combined_app, host="0.0.0.0", port=7860, log_level="info")
