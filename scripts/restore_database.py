import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DEFAULT_DB_URL = "postgresql://postgres.vffgjjlucktyrfjhbqbp:doctorvondoom1812@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

def restore_backup(backup_file=None):
    db_url = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not backup_file:
        backup_file = os.path.join(backend_root, "backups", "attendx_backup_latest.json")
        
    if not os.path.exists(backup_file):
        print(f"[ERROR] Backup file not found: {backup_file}")
        return False

    print(f"[RESTORE] Loading backup from: {backup_file}")
    with open(backup_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Sanitize URL: if port is 5432 and host is direct, ensure pooler host is used
    print(f"[CONNECT] Connecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    tables_order = [
        'users', 
        'classes', 
        'subjects', 
        'students', 
        'enrollments', 
        'face_embeddings', 
        'attendance_sessions', 
        'attendance_records',
        'attendance_audit_logs'
    ]
    
    # Ensure all newer schema columns exist before restoring
    print("[MIGRATION] Ensuring all table schema columns exist...")
    schema_migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_classes JSON DEFAULT '[]'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS face_registration_complete BOOLEAN DEFAULT FALSE",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS angle_label VARCHAR(50)",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'portal_scan'",
        "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'AUTO'",
    ]
    for mig in schema_migrations:
        try:
            cur.execute(mig)
        except Exception:
            pass
    conn.commit()

    # Clean tables first in reverse dependency order to prevent duplicate key / unique constraint collisions
    print("[PREPARE] Clearing old/conflicting records before restoration...")
    for table in reversed(tables_order):
        try:
            cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
        except Exception as e:
            # Table might not exist or empty
            pass
    conn.commit()
    print("[PREPARE] Clean state prepared.")

    # Insert records table by table
    total_restored = 0
    for table in tables_order:
        if table not in data.get("tables", {}):
            continue
        rows = data["tables"][table].get("records", [])
        if not rows:
            continue
            
        print(f"  - Restoring {len(rows)} records into {table}...")
        for row in rows:
            cols = list(row.keys())
            vals = []
            for c in cols:
                v = row[c]
                if isinstance(v, (list, dict)):
                    v = json.dumps(v)
                vals.append(v)

            col_names = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))
            
            sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            cur.execute(sql, vals)
            total_restored += 1

        # Synchronize PostgreSQL auto-increment sequence with highest restored ID
        try:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1) + 1, false) FROM {table}")
        except Exception:
            pass
        conn.commit()

    cur.close()
    conn.close()
    print(f"\n[SUCCESS] Successfully restored {total_restored} total records across {len(tables_order)} tables into Supabase PostgreSQL!")
    return True

if __name__ == "__main__":
    restore_backup()
