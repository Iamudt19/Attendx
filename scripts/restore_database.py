import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DEFAULT_DB_URL = "postgresql://postgres.vffgjjlucktyrfjhbqbp:doctordoom1812@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

def restore_backup(backup_file=None, replace_existing=False):
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
    if "doctorvondoom" in db_url:
        db_url = db_url.replace("doctorvondoom", "doctordoom1812")
    print(f"[CONNECT] Connecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    tables_order = [
        'institutions',
        'users', 
        'classes', 
        'subjects', 
        'students', 
        'enrollments', 
        'face_embeddings', 
        'immutable_face_vault',
        'attendance_sessions', 
        'attendance_records',
        'attendance_audit_logs',
        'system_heartbeats'
    ]
    
    # Ensure all newer schema columns exist before restoring
    print("[MIGRATION] Ensuring all table schema columns exist...")
    schema_migrations = [
        "CREATE TABLE IF NOT EXISTS institutions (id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, code VARCHAR(30) UNIQUE NOT NULL, official_email VARCHAR(120) UNIQUE NOT NULL, domain VARCHAR(100), address TEXT, status VARCHAR(30) DEFAULT 'APPROVED' NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, approved_at TIMESTAMP, approved_by VARCHAR(100))",
        "CREATE TABLE IF NOT EXISTS system_heartbeats (id SERIAL PRIMARY KEY, worker_id VARCHAR(50) DEFAULT 'keep-alive-daemon', pinged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status VARCHAR(20) DEFAULT 'HEALTHY', latency_ms FLOAT)",
        "CREATE TABLE IF NOT EXISTS immutable_face_vault (id SERIAL PRIMARY KEY, student_id VARCHAR(50) NOT NULL, student_db_id INTEGER, student_name VARCHAR(100) NOT NULL, roll_number VARCHAR(50), class_id INTEGER, institution_id INTEGER, embedding JSON NOT NULL, image_base64 TEXT, source_image VARCHAR(255), angle_label VARCHAR(50), source VARCHAR(50) DEFAULT 'portal_scan', is_active BOOLEAN DEFAULT TRUE, archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_classes JSON DEFAULT '[]'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'APPROVED'",
        "ALTER TABLE classes ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL",
        "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'APPROVED'",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS approved_by_teacher_id INTEGER REFERENCES users(id)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS face_registration_complete BOOLEAN DEFAULT FALSE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS angle_label VARCHAR(50)",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'portal_scan'",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS image_base64 TEXT",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
        "ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP",
        "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'AUTO'",
        "ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
    ]
    for mig in schema_migrations:
        try:
            cur.execute(mig)
        except Exception:
            conn.rollback()
    conn.commit()

    # Non-destructive merge by default; only truncate when explicitly requested
    if replace_existing:
        print("[PREPARE] Clearing old/conflicting records before restoration (--replace)...")
        for table in reversed(tables_order):
            try:
                cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
            except Exception:
                conn.rollback()
        conn.commit()
        print("[PREPARE] Clean state prepared.")
    else:
        print("[PREPARE] Merge mode active (preserving existing records, skipping conflicts)...")

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
    replace_flag = "--replace" in sys.argv
    restore_backup(replace_existing=replace_flag)
