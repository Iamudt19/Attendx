import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendX"
    SECRET_KEY: str = "attendx_super_secret_jwt_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    DATABASE_URL: str = "sqlite:///./attendx.db"
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")
    EXPORTS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "exports")

    # ── CORS Configuration ────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # ── Database URL normalization & cleaning ─────────────────────────────────────
    @property
    def clean_database_url(self) -> str:
        raw = self.DATABASE_URL
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        canonical_sqlite = os.path.join(backend_dir, "attendx.db").replace("\\", "/")
        
        if not raw or not isinstance(raw, str):
            return f"sqlite:///{canonical_sqlite}"
        
        url = raw.strip().strip("'\"").strip()
        if url.startswith("psql "):
            url = url[5:].strip().strip("'\"").strip()
        
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        
        if url in ["sqlite:///./attendx.db", "sqlite:///attendx.db", "sqlite://attendx.db"]:
            return f"sqlite:///{canonical_sqlite}"
            
        if not (url.startswith("sqlite") or url.startswith("postgresql") or url.startswith("mysql")):
            return f"sqlite:///{canonical_sqlite}"
            
        return url


    # ── Face Recognition Pipeline Configuration ──────────────────────────────────
    # Calibrated for OpenCV SFace Deep Neural 128-d Cosine Metric
    FACE_MATCH_THRESHOLD: float = 0.52       # Similarity >= 0.52 + Margin >= 0.06 → PRESENT
    FACE_REVIEW_THRESHOLD: float = 0.42      # 0.42 <= Similarity < 0.52 or Low Margin → NEEDS_REVIEW (<0.42 is UNKNOWN)
    FACE_MIN_MARGIN: float = 0.06            # Minimum gap between Top-1 and Top-2 match
    FACE_MIN_SIZE: int = 20                  # Minimum face bounding box size (pixels)
    FACE_BLUR_THRESHOLD: float = 40.0        # Minimum Laplacian variance for sharpness
    FACE_DETECTION_THRESHOLD: float = 0.40   # YuNet face detector confidence threshold

    # Backward-compatible aliases
    CONFIDENCE_HIGH_THRESHOLD: float = 0.52
    CONFIDENCE_MEDIUM_THRESHOLD: float = 0.42

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"),
            ".env"
        ),
        extra="ignore"
    )

settings = Settings()

os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)


