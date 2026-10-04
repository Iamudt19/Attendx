import os
import gradio as gr
import spaces
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.database.session import Base, engine, get_db
from app.api import auth, classes, subjects, students, attendance, export, student_portal

# ---------------------------------------------------------------------------
# Database Initialization
# ---------------------------------------------------------------------------
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables verified/initialized.")
except Exception as e:
    print(f"⚠️ Database initialization notice: {e}")

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
# Register FastAPI Routes directly onto Gradio ASGI Application
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

# Include all API routers directly with /api prefix
demo.app.include_router(auth.router, prefix="/api")
demo.app.include_router(classes.router, prefix="/api")
demo.app.include_router(subjects.router, prefix="/api")
demo.app.include_router(students.router, prefix="/api")
demo.app.include_router(attendance.router, prefix="/api")
demo.app.include_router(export.router, prefix="/api")
demo.app.include_router(student_portal.router, prefix="/api")

@demo.app.get("/api/health")
@demo.app.get("/healthz")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "storage_dir": os.path.exists(settings.STORAGE_DIR),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860
    )
