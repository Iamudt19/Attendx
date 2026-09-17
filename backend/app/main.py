import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.database.session import Base, engine, get_db
from app.api import auth, classes, subjects, students, attendance, export, student_portal

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AttendX — AI-Powered Classroom Attendance System API",
    version="1.0.0"
)

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
                <a href="/redoc">📄 API Reference (ReDoc)</a>
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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

