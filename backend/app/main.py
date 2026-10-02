import os
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.database.session import Base, engine, get_db
from app.api import auth, classes, subjects, students, attendance, export, student_portal

# Create DB tables
Base.metadata.create_all(bind=engine)

# Optimization #6: allow up to 100 MB multipart upload for bulk photo batches
_MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds the configured max."""
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > _MAX_UPLOAD_BYTES:
            return Response(
                content=f"Request body too large. Maximum allowed: {_MAX_UPLOAD_BYTES // (1024*1024)} MB.",
                status_code=413
            )
        return await call_next(request)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AttendX — AI-Powered Classroom Attendance System API",
    version="1.0.0"
)

# Optimization #6: Gzip compression on API responses (reduces JSON payload size)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Optimization #6: upload body size guard
app.add_middleware(LimitUploadSizeMiddleware)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directory for stored images & uploads
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(student_portal.router, prefix="/api")

@app.get("/")
def root():
    from fastapi.responses import HTMLResponse
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AttendX — AI Attendance API</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                   background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                   color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .card { background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px; padding: 48px; max-width: 520px; text-align: center; }
            h1 { font-size: 2rem; margin-bottom: 8px; background: linear-gradient(135deg, #667eea, #764ba2);
                 -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .tagline { color: #aaa; font-size: 0.95rem; margin-bottom: 28px; }
            .status { display: inline-block; background: #22c55e22; color: #4ade80; padding: 6px 16px;
                      border-radius: 20px; font-size: 0.85rem; margin-bottom: 28px; }
            .status::before { content: '●'; margin-right: 6px; }
            .links { display: flex; flex-direction: column; gap: 10px; }
            .links a { display: block; padding: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                       border-radius: 12px; color: #c4b5fd; text-decoration: none; transition: all 0.2s; }
            .links a:hover { background: rgba(255,255,255,0.14); transform: translateY(-1px); }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>📸 AttendX API</h1>
            <p class="tagline">AI-Powered Facial Recognition Attendance System</p>
            <div class="status">Online &amp; Ready</div>
            <div class="links">
                <a href="/docs">📖 Interactive API Docs (Swagger)</a>
                <a href="/gradio">🧪 Face Recognition &amp; GPU Playground</a>
                <a href="/api/health">🩺 Health Check</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/healthz")
@app.get("/api/health")
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
    import uvicorn
    # Optimization #6: generous timeout for large multi-photo batches
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        timeout_keep_alive=120,  # keep connection alive for slow uploads
        limit_concurrency=50,
    )

