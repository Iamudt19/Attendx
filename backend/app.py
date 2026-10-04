import gradio as gr
import spaces
from app.main import app as fastapi_app

# ---------------------------------------------------------------------------
# ZeroGPU: Hugging Face requires at least one @spaces.GPU decorated function
# to be present at startup, or the runtime immediately kills the container.
# This wraps the core face-embedding call so GPU acceleration is available
# during recognition requests when a GPU is allocated by the scheduler.
# ---------------------------------------------------------------------------
@spaces.GPU
def run_face_embedding(embedder, frame):
    """GPU-accelerated face embedding inference entry point."""
    return embedder.get_embedding(frame)

# Create a clean monitoring landing interface for Hugging Face Spaces
with gr.Blocks(title="AttendX AI API Gateway") as demo:
    gr.Markdown("""
    # 📸 AttendX AI API Gateway
    **Production biometric classroom attendance engine active.**
    
    * **Interactive API Documentation (Swagger)**: [/docs](/docs)
    * **Health & Diagnostics**: [/api/health](/api/health)
    """)

# Mount Gradio into FastAPI so all /api endpoints, Swagger UI, and auth work without path conflicts
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(fastapi_app, host="0.0.0.0", port=7860)
