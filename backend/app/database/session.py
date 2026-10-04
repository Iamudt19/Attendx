import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.clean_database_url
connect_args = {}
pool_pre_ping = True

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    pool_pre_ping = False

def create_safe_engine(target_url: str):
    is_sqlite = target_url.startswith("sqlite")
    c_args = {"check_same_thread": False} if is_sqlite else {}
    
    eng = create_engine(
        target_url,
        connect_args=c_args,
        pool_pre_ping=not is_sqlite
    )
    
    # Eagerly test connection if remote
    if not is_sqlite:
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully.")
            return eng
        except Exception as conn_err:
            print(f"⚠️ Remote Database Connection Failed ({target_url}): {conn_err}")
            print("🔄 Falling back to local SQLite engine (attendx.db) to ensure high availability.")
            return create_engine(
                "sqlite:///./attendx.db",
                connect_args={"check_same_thread": False}
            )
    return eng

engine = create_safe_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def run_auto_migrations(target_engine):
    """Safely apply non-destructive schema additions to existing databases without dropping tables."""
    try:
        with target_engine.connect() as conn:
            # Check users table columns
            if target_engine.dialect.name == "sqlite":
                res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                existing_cols = {row[1] for row in res}
                if "is_approved" not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1"))
                    conn.commit()
                if "approved_by" not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approved_by INTEGER"))
                    conn.commit()
                if "approved_at" not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approved_at TIMESTAMP"))
                    conn.commit()
            elif target_engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP"))
                conn.commit()
    except Exception as e:
        print(f"Auto-migration notice (non-fatal): {e}")

# Run schema sync safely
try:
    run_auto_migrations(engine)
except Exception:
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
