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
        if not raw or not isinstance(raw, str):
            return "sqlite:///./attendx.db"
        
        url = raw.strip().strip("'\"").strip()
        if url.startswith("psql "):
            url = url[5:].strip().strip("'\"").strip()
        
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        if not (url.startswith("sqlite") or url.startswith("postgresql") or url.startswith("mysql")):
            return "sqlite:///./attendx.db"
            
        return url


    # ── Face Recognition Pipeline Configuration ──────────────────────────────────
    # Calibrated for OpenCV SFace Deep Neural 128-d Cosine Metric
    FACE_MATCH_THRESHOLD: float = 0.45       # Similarity >= 0.45 + Margin >= 0.08 → PRESENT
    FACE_REVIEW_THRESHOLD: float = 0.35      # 0.35 <= Similarity < 0.45 or Low Margin → NEEDS_REVIEW
    FACE_MIN_MARGIN: float = 0.08            # Minimum gap between Top-1 and Top-2 match
    FACE_MIN_SIZE: int = 24                  # Minimum face bounding box size (pixels)
    FACE_BLUR_THRESHOLD: float = 45.0        # Minimum Laplacian variance for sharpness
    FACE_DETECTION_THRESHOLD: float = 0.45   # YuNet face detector confidence threshold

    # Backward-compatible aliases
    CONFIDENCE_HIGH_THRESHOLD: float = 0.45
    CONFIDENCE_MEDIUM_THRESHOLD: float = 0.35

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)


