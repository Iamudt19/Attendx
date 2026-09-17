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

# Import the FastAPI application from backend/app/main.py
from app.main import app as fastapi_app

try:
    import gradio as gr
    with gr.Blocks(title="AttendX AI API", theme=gr.themes.Soft()) as demo:
        gr.Markdown("""
        # 📸 AttendX — AI Facial Attendance API
        > Production facial recognition attendance system running on OpenCV YuNet + SFace.
        
        - 📖 **Interactive Swagger API Docs**: [/docs](/docs)
        - 🩺 **Health Check**: [/api/health](/api/health)
        - 🚀 **Status**: `Online & Ready for Vercel Frontend`
        """)
    app = gr.mount_gradio_app(fastapi_app, demo, path="/")
except Exception as e:
    print(f"Gradio mount note: {e}")
    app = fastapi_app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
