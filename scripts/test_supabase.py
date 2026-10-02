import os
import sys

backend_dir = os.path.abspath("backend")
sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.database.session import create_safe_engine
from sqlalchemy import text

print(f"DATABASE_URL from config: {settings.clean_database_url}")
try:
    eng = create_safe_engine(settings.clean_database_url)
    with eng.connect() as conn:
        print("[SUCCESS] Connected to database successfully!")
        res = conn.execute(text("SELECT current_database(), current_user, version();")).fetchone()
        print(f"Database: {res[0]} | User: {res[1]}")
        print(f"PostgreSQL Version: {res[2]}")

        tables = conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)).fetchall()
        tbl_names = [t[0] for t in tables]
        print(f"Tables present in public schema: {tbl_names}")

        if "students" in tbl_names:
            cnt = conn.execute(text("SELECT count(*) FROM students")).fetchone()[0]
            print(f"Student count in database: {cnt}")
            rows = conn.execute(text("SELECT id, student_id, name FROM students")).fetchall()
            for r in rows:
                print(f"  - Student: {r[0]} | {r[1]} | {r[2]}")

        if "face_embeddings" in tbl_names:
            ecnt = conn.execute(text("SELECT count(*) FROM face_embeddings")).fetchone()[0]
            print(f"Face embeddings count in database: {ecnt}")
except Exception as e:
    print(f"[ERROR] Failed: {type(e).__name__}: {e}")
