import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.lwyrhqgfnlzhbvnezcyd:doctorvondoom1812@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
)

def restore_backup(backup_file=None):
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not backup_file:
        backup_file = os.path.join(backend_root, "backups", "attendx_backup_latest.json")
        
    if not os.path.exists(backup_file):
        print(f"[ERROR] Backup file not found: {backup_file}")
        return False

    print(f"[RESTORE] Loading backup from: {backup_file}")
    with open(backup_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    tables_order = ['users', 'classes', 'subjects', 'students', 'enrollments', 'face_embeddings', 'attendance_sessions', 'attendance_records']
    
    for table in tables_order:
        if table not in data.get("tables", {}):
            continue
        rows = data["tables"][table].get("records", [])
        print(f"  - Restoring {len(rows)} records into {table}...")
        for row in rows:
            cols = list(row.keys())
            vals = [row[c] for c in cols]
            col_names = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))
            update_clause = ", ".join([f"{c} = EXCLUDED.{c}" for c in cols if c != "id"])
            
            if update_clause:
                sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO UPDATE SET {update_clause}"
            else:
                sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
                
            cur.execute(sql, vals)

        # Update ID sequence
        try:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1) + 1, false) FROM {table}")
        except Exception:
            pass

    conn.commit()
    cur.close()
    conn.close()
    print("[SUCCESS] Full restore completed successfully into Supabase PostgreSQL!")
    return True

if __name__ == "__main__":
    restore_backup()
