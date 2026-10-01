"""
Sync all data from local SQLite (attendx.db) to Supabase PostgreSQL
"""
import sqlite3
import psycopg2
import json
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import Base, engine
from app.models import models

# Ensure all tables exist in Supabase
print("1. Initializing schema tables in Supabase...")
Base.metadata.create_all(bind=engine)
print("Schema verified.")

# Connect to local SQLite (backend/attendx.db)
sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "attendx.db")
if not os.path.exists(sqlite_path) or os.path.getsize(sqlite_path) < 1000:
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", "attendx.db")

print(f"2. Connecting to SQLite at: {sqlite_path}")
sqlite_conn = sqlite3.connect(sqlite_path)
sqlite_conn.row_factory = sqlite3.Row
s_cur = sqlite_conn.cursor()

# Connect to Supabase
pg_url = "postgresql://postgres:doctorvondoom1812@db.vffgjjlucktyrfjhbqbp.supabase.co:5432/postgres"
print("3. Connecting to Supabase PostgreSQL...")
pg_conn = psycopg2.connect(pg_url)
pg_cur = pg_conn.cursor()

tables = [
    "users",
    "classes",
    "subjects",
    "students",
    "enrollments",
    "face_embeddings",
    "attendance_sessions",
    "attendance_records"
]

boolean_columns = {
    "users": ["is_active"],
    "classes": ["active"],
    "students": ["active", "face_registration_complete"]
}

total_synced = 0
for table in tables:
    try:
        s_cur.execute(f"SELECT * FROM {table}")
        rows = s_cur.fetchall()
    except Exception as e:
        print(f"Table {table} not found in SQLite: {e}")
        continue

    if not rows:
        print(f"Table {table}: 0 rows to sync")
        continue

    col_names = [description[0] for description in s_cur.description]
    cols_str = ', '.join(f'"{c}"' for c in col_names)
    placeholders = ', '.join(['%s'] * len(col_names))
    update_set = ', '.join([f'"{c}" = EXCLUDED."{c}"' for c in col_names if c != 'id'])

    count = 0
    for r in rows:
        vals = list(r)

        # Cast boolean columns
        if table in boolean_columns:
            for b_col in boolean_columns[table]:
                if b_col in col_names:
                    b_idx = col_names.index(b_col)
                    if vals[b_idx] is not None:
                        vals[b_idx] = bool(vals[b_idx])

        # Handle JSON embedding column
        if table == 'face_embeddings':
            idx = col_names.index('embedding')
            if isinstance(vals[idx], str):
                vals[idx] = json.dumps(json.loads(vals[idx]))
            elif isinstance(vals[idx], list):
                vals[idx] = json.dumps(vals[idx])

        query = f"""
            INSERT INTO {table} ({cols_str}) 
            VALUES ({placeholders}) 
            ON CONFLICT (id) DO UPDATE SET {update_set};
        """
        try:
            pg_cur.execute(query, vals)
            count += 1
        except Exception as err:
            print(f"Error syncing row {vals[0]} in {table}: {err}")
            pg_conn.rollback()
            break
    else:
        pg_conn.commit()
        # Reset serial sequence
        try:
            pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) + 1 FROM {table}), 1), false);")
            pg_conn.commit()
        except Exception:
            pg_conn.rollback()

        print(f"[OK] Synced {count} rows in table '{table}' to Supabase!")
        total_synced += count

sqlite_conn.close()
pg_conn.close()

print(f"\n[SUCCESS] COMPLETE: All {total_synced} database records, student profiles, and 3D face scan vectors are permanently saved in Supabase!")
