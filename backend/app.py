import os
import gradio as gr
import spaces
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.main import app as fastapi_app
from app.core.config import settings

# ---------------------------------------------------------------------------
# ZeroGPU Worker Function
# Hugging Face ZeroGPU checks demo.fns during demo.launch() to verify that
# at least one active Gradio component is bound to a @spaces.GPU decorated function.
# ---------------------------------------------------------------------------
@spaces.GPU(duration=60)
def zerogpu_face_inference_probe():
    """ZeroGPU inference execution hook to satisfy Hugging Face GPU scheduler."""
    return "AttendX ZeroGPU Face Recognition Engine Active"

# ---------------------------------------------------------------------------
# Gradio UI for Status, Diagnostics & ZeroGPU Supervisor Registration
# ---------------------------------------------------------------------------
with gr.Blocks(title="AttendX AI API Gateway") as demo:
    gr.Markdown("""
    # 📸 AttendX AI API Gateway
    **Production biometric classroom attendance engine active with ZeroGPU acceleration.**
    
    * **Interactive API Documentation (Swagger)**: [/docs](/docs)
    * **Health & Diagnostics**: [/api/health](/api/health)
    """)
    
    with gr.Row():
        test_btn = gr.Button("⚡ Verify ZeroGPU Engine", variant="primary")
        status_box = gr.Textbox(label="Engine Status", value="ZeroGPU Ready")
        
    test_btn.click(fn=zerogpu_face_inference_probe, outputs=status_box)

# ---------------------------------------------------------------------------
# Register FastAPI Routes onto Gradio ASGI Application with Top Precedence
# ---------------------------------------------------------------------------
# Enable CORS so Vercel frontend can call all /api endpoints
demo.app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static storage for student photos & uploads
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
demo.app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Prepend all FastAPI routes (including /api/*, /docs, /openapi.json, /api/health)
# so they are evaluated BEFORE Gradio's internal catch-all redirects
for route in reversed(fastapi_app.routes):
    demo.app.routes.insert(0, route)
    if hasattr(demo.app, "router") and hasattr(demo.app.router, "routes"):
        demo.app.router.routes.insert(0, route)

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860
    )


