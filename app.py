import os
import sys

# Remove current app.py file collision from sys.modules
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# Add backend directory to Python sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import gradio as gr
from app.main import app as fastapi_app

# Create Gradio UI dashboard
with gr.Blocks(title="AttendX AI API", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 📸 AttendX — AI Facial Attendance API
    > Production-grade facial recognition attendance system running on OpenCV YuNet + SFace.
    
    ### 🔗 Live Endpoints:
    - 📖 **[Interactive Swagger API Docs](/docs)**
    - 🩺 **[System Health Check](/api/health)**
    - 🚀 **Status**: `Online & Ready for Vercel Frontend`
    """)

# Mount Gradio onto the FastAPI app (FastAPI handles all /api and /docs routes)
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, ssr_mode=False, show_api=False)

