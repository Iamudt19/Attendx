import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Configure database URL from env or fallback
DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.lwyrhqgfnlzhbvnezcyd:doctorvondoom1812@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
)

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

def run_backup():
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backup_dir = os.path.join(backend_root, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    timestamped_file = os.path.join(backup_dir, f"attendx_backup_{timestamp}.json")
    latest_file = os.path.join(backup_dir, "attendx_backup_latest.json")
    
    print(f"[BACKUP] Starting AttendX Database Backup from Supabase...")
    conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    # Get all tables in public schema
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    tables = [r['table_name'] for r in cur.fetchall()]
    
    backup_data = {
        "backup_created_at": datetime.now().isoformat(),
        "database_provider": "Supabase PostgreSQL",
        "tables": {}
    }
    
    total_records = 0
    for table in tables:
        cur.execute(f"SELECT * FROM {table} ORDER BY id ASC")
        rows = [dict(r) for r in cur.fetchall()]
        backup_data["tables"][table] = {
            "count": len(rows),
            "records": rows
        }
        total_records += len(rows)
        print(f"  - {table}: {len(rows)} records backed up")
        
    cur.close()
    conn.close()
    
    # Write to files
    with open(timestamped_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, indent=2, cls=DateTimeEncoder)
        
    with open(latest_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, indent=2, cls=DateTimeEncoder)
        
    print(f"\n[SUCCESS] Backup Complete! {total_records} total records across {len(tables)} tables.")
    print(f"Timestamped Backup: {timestamped_file}")
    print(f"Latest Mirror:      {latest_file}")
    return timestamped_file

if __name__ == "__main__":
    run_backup()
