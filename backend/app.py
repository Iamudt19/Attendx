import gradio as gr
from app.main import app as fastapi_app

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
