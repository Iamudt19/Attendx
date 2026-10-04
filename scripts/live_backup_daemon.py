import os
import sys
import time
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.lwyrhqgfnlzhbvnezcyd:doctorvondoom1812@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
)

INTERVAL_SECONDS = int(os.getenv("BACKUP_INTERVAL_SECONDS", "300"))  # Default: every 5 minutes

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

def perform_snapshot(backup_dir: str, prev_checksum: int = 0):
    try:
        conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        
        tables = [
            'users', 'classes', 'subjects', 'students', 
            'enrollments', 'face_embeddings', 
            'attendance_sessions', 'attendance_records', 'attendance_audit_logs'
        ]
        
        backup_data = {
            "backup_timestamp": datetime.utcnow().isoformat() + "Z",
            "database_provider": "Supabase PostgreSQL",
            "tables": {}
        }
        
        current_checksum = 0
        total_records = 0
        for table in tables:
            cur.execute(f"SELECT * FROM {table} ORDER BY id ASC")
            rows = [dict(r) for r in cur.fetchall()]
            backup_data["tables"][table] = {
                "count": len(rows),
                "records": rows
            }
            total_records += len(rows)
            current_checksum += len(rows)
            
        cur.close()
        conn.close()

        # Always update latest mirror
        latest_file = os.path.join(backup_dir, "attendx_backup_latest.json")
        with open(latest_file, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, indent=2, cls=DateTimeEncoder)

        # If data changed or first run, write timestamped file
        if current_checksum != prev_checksum:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            timestamped_file = os.path.join(backup_dir, f"attendx_backup_{timestamp}.json")
            with open(timestamped_file, "w", encoding="utf-8") as f:
                json.dump(backup_data, f, indent=2, cls=DateTimeEncoder)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [CHANGE DETECTED] New snapshot saved: {total_records} records across {len(tables)} tables.")
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [HEARTBEAT] Database in sync ({total_records} records).")

        return current_checksum
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [BACKUP ERROR] {e}")
        return prev_checksum

def run_daemon():
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backup_dir = os.path.join(backend_root, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    print("=" * 60)
    print("🚀 AttendX Live Supabase Backup Daemon Active")
    print(f"📁 Backup Directory: {backup_dir}")
    print(f"⏱️  Sync Interval:   Every {INTERVAL_SECONDS} seconds")
    print("=" * 60)

    prev_checksum = 0
    while True:
        prev_checksum = perform_snapshot(backup_dir, prev_checksum)
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    run_daemon()
