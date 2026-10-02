import os
from sqlalchemy import create_engine, text

url = "postgresql://postgres:doctorvondoom1812@db.vffgjjlucktyrfjhbqbp.supabase.co:5432/postgres"

print(f"Testing direct connection to Supabase ({url})...")
try:
    eng = create_engine(url, connect_args={"connect_timeout": 8})
    with eng.connect() as conn:
        print("[SUCCESS] Connected to Supabase directly on port 5432!")
        res = conn.execute(text("SELECT current_database(), current_user, version();")).fetchone()
        print(f"Database: {res[0]} | User: {res[1]}")
        tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).fetchall()
        print("Tables in Supabase public schema:", [t[0] for t in tables])
except Exception as e:
    print(f"[FAIL] Direct connection failed: {type(e).__name__}: {e}")
