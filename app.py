"""
AttendX — Hugging Face Spaces Entrypoint (Docker SDK)

Starts the FastAPI application via uvicorn on port 7860 (required by HF Spaces).
Auto-seeds the database on first boot if no users exist.
"""
import os
import sys

# ── Fix module collision ─────────────────────────────────────────────────────
# This file is named app.py, which collides with the backend/app/ package.
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# ── Add backend to sys.path ──────────────────────────────────────────────────
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# ── Import FastAPI app ───────────────────────────────────────────────────────
from app.main import app  # noqa: E402

# ── Auto-seed on first boot ─────────────────────────────────────────────────
def auto_seed_if_empty():
    """Seed database with demo data if no users exist (first boot)."""
    try:
        from app.database.session import SessionLocal
        from app.models.models import User
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        if user_count == 0:
            print("No users found — running database seed for demo data...")
            from seed import seed_db
            seed_db()
        else:
            print(f"Database already has {user_count} users — skipping seed.")
    except Exception as e:
        print(f"Auto-seed check skipped: {e}")

auto_seed_if_empty()

# ── Start uvicorn server on port 7860 ────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=7860,
        log_level="info",
    )
