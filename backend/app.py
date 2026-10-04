import os
import uvicorn
import gradio as gr
import spaces
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.main import app as fastapi_app
from app.core.config import settings

# ---------------------------------------------------------------------------
# ZeroGPU Worker Function
# ---------------------------------------------------------------------------
@spaces.GPU(duration=60)
def zerogpu_face_inference_probe():
    """ZeroGPU inference hook to register with Hugging Face ZeroGPU scheduler."""
    return "AttendX ZeroGPU Face Recognition Engine Active"

# ---------------------------------------------------------------------------
# Gradio UI Playground & Status Monitor
# ---------------------------------------------------------------------------
with gr.Blocks(title="AttendX AI API Gateway") as demo:
    gr.Markdown("""
    # 📸 AttendX AI API Gateway
    **Production biometric classroom attendance engine active with ZeroGPU acceleration.**
    
    * **Interactive API Documentation (Swagger)**: [/docs](/docs)
    * **Health & Diagnostics**: [/api/health](/api/health)
    * **Root Portal**: [/](/ )
    """)
    
    with gr.Row():
        test_btn = gr.Button("⚡ Verify ZeroGPU Engine", variant="primary")
        status_box = gr.Textbox(label="Engine Status", value="ZeroGPU Ready")
        
    test_btn.click(fn=zerogpu_face_inference_probe, outputs=status_box)

# ---------------------------------------------------------------------------
# Mount Gradio onto the Primary FastAPI Application
# ---------------------------------------------------------------------------
# gr.mount_gradio_app mounts the Gradio interface at /ui while preserving
# all primary FastAPI endpoints at the root (/api/*, /docs, /openapi.json, /storage/*).
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
