from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.clean_database_url

connect_args = {}
pool_pre_ping = True

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    pool_pre_ping = False

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=pool_pre_ping
    )
except Exception as e:
    print(f"Warning: Failed to create engine for '{db_url}': {e}. Falling back to SQLite.")
    engine = create_engine(
        "sqlite:///./attendx.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
