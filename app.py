"""
AttendX — Hugging Face Spaces Entrypoint (Gradio SDK)

Runs the FastAPI app with uvicorn on port 7860.
With sdk:gradio, HF just runs `python app.py` — we control the server lifecycle.
"""
import os
import sys

# ── Fix module collision ─────────────────────────────────────────────────────
# This file is named app.py which collides with backend/app/ package.
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# ── Add backend to sys.path ──────────────────────────────────────────────────
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# ── Import FastAPI application ───────────────────────────────────────────────
from app.main import app as fastapi_app  # noqa: E402

# ── Auto-seed on first boot ─────────────────────────────────────────────────
def _auto_seed_if_empty():
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

_auto_seed_if_empty()

# ── Start uvicorn on port 7860 (required by HF Spaces) ──────────────────────
import uvicorn  # noqa: E402
uvicorn.run(fastapi_app, host="0.0.0.0", port=7860, log_level="info")
