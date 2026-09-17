"""
AttendX — Production Entrypoint (FastAPI + ZeroGPU + Gradio)
"""
# 1. ZeroGPU REQUIRES 'import spaces' at the absolute top of the entrypoint file
try:
    import spaces
except ImportError:
    class spaces:
        @staticmethod
        def GPU(fn=None, *args, **kwargs):
            if fn is None:
                return lambda f: f
            if callable(fn):
                return fn
            return lambda f: f

import os
import sys

# Patch Gradio schema parser for Pydantic v2 compatibility
try:
    import gradio_client.utils as gc_utils
    orig_get_type = getattr(gc_utils, "get_type", None)
    if orig_get_type:
        def safe_get_type(schema):
            if isinstance(schema, bool):
                return "bool"
            if not isinstance(schema, dict):
                return "str"
            return orig_get_type(schema)
        gc_utils.get_type = safe_get_type

    orig_json_schema_to_python_type = getattr(gc_utils, "_json_schema_to_python_type", None)
    if orig_json_schema_to_python_type:
        def safe_json_schema_to_python_type(schema, defs=None):
            if isinstance(schema, bool):
                return "bool"
            if not isinstance(schema, dict):
                return "str"
            return orig_json_schema_to_python_type(schema, defs)
        gc_utils._json_schema_to_python_type = safe_json_schema_to_python_type
except Exception as e:
    print(f"Gradio patch note: {e}")

# Fix module collision
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# Add backend to sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
import gradio as gr
from fastapi.middleware.cors import CORSMiddleware
from app.main import app as fastapi_app
from app.core.config import settings

# Ensure CORS is permissive for Vercel frontends
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-seed on first boot if DB is empty
def _auto_seed_if_empty():
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

# ZeroGPU functions bound directly to Gradio UI events
@spaces.GPU
def gpu_health_check() -> str:
    """ZeroGPU check function required during Hugging Face startup scan."""
    try:
        import torch
        if torch.cuda.is_available():
            return f"✅ AttendX API Online | GPU: {torch.cuda.get_device_name(0)}"
        return "✅ AttendX API Online | Mode: CPU / Ready"
    except Exception:
        return "✅ AttendX API Online | Status: Healthy"

@spaces.GPU
def demo_face_detect(image):
    """ZeroGPU-accelerated face detection test."""
    if image is None:
        return "⚠️ Please upload an image to analyze."
    try:
        from app.cv.detector import face_detector
        faces = face_detector.detect_faces(image)
        if not faces:
            return "🔍 No faces detected in the provided image."
        return f"🎯 Detection complete! Found {len(faces)} face(s) using OpenCV YuNet."
    except Exception as e:
        return f"❌ Detection error: {str(e)}"

# Build Gradio Blocks interface
with gr.Blocks(title="AttendX — AI Attendance API") as demo:
    gr.Markdown("""
    # 📸 AttendX — AI Facial Attendance API
    > Production-grade facial recognition attendance system powered by OpenCV YuNet + SFace.
    """)
    
    with gr.Tabs():
        with gr.TabItem("🩺 API Status & Docs"):
            gr.Markdown("""
            ### 🔗 Direct API Endpoints
            - 📖 [**Interactive API Documentation (Swagger UI)**](/docs)
            - 📄 [**Alternative API Reference (ReDoc)**](/redoc)
            - 🩺 [**System Health Check Endpoint**](/api/health)
            
            *(Direct API Base URL: `https://iamudit02-attendx-api.hf.space`)*

            ### 🔐 Demo Credentials
            | Role | Email | Password |
            |---|---|---|
            | **Teacher** | `teacher@attendx.edu` | `teacher123` |
            | **Admin** | `admin@attendx.edu` | `admin123` |
            | **Student** | `STU001` | `STU001` |
            """)
            status_btn = gr.Button("🔍 Verify System & ZeroGPU Status", variant="primary")
            status_box = gr.Textbox(label="Status Output", interactive=False)
            status_btn.click(fn=gpu_health_check, inputs=None, outputs=status_box)

        with gr.TabItem("🧪 Face Recognition Quick Test"):
            gr.Markdown("Upload a photo to test YuNet ONNX face detection in real time:")
            with gr.Row():
                img_in = gr.Image(type="numpy", label="Input Image")
                result_box = gr.Textbox(label="Recognition Result", lines=3)
            test_btn = gr.Button("🚀 Detect Faces", variant="primary")
            test_btn.click(fn=demo_face_detect, inputs=img_in, outputs=result_box)

# Configure queue for ZeroGPU event streaming
demo.queue()

# Mount Gradio demo onto FastAPI master app
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
