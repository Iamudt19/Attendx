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
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "One Photo. Complete Attendance.",
        "status": "online",
        "docs": "/docs"
    }

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

