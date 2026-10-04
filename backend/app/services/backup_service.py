import os
import json
import threading
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

class LiveBackupService:
    def __init__(self):
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.backup_dir = os.path.join(backend_root, "backups")
        os.makedirs(self.backup_dir, exist_ok=True)
        self.last_backup_time = None
        self.last_backup_records = 0
        self._lock = threading.Lock()

    def generate_live_snapshot(self, db: Session) -> dict:
        """Extracts complete database tables and writes a live backup JSON file."""
        with self._lock:
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
            
            total_records = 0
            for tbl in tables:
                try:
                    result = db.execute(text(f"SELECT * FROM {tbl} ORDER BY id ASC"))
                    columns = result.keys()
                    rows = [dict(zip(columns, row)) for row in result.fetchall()]
                    backup_data["tables"][tbl] = {
                        "count": len(rows),
                        "records": rows
                    }
                    total_records += len(rows)
                except Exception as e:
                    backup_data["tables"][tbl] = {"count": 0, "error": str(e), "records": []}

            # Write latest mirror
            latest_path = os.path.join(self.backup_dir, "attendx_backup_latest.json")
            with open(latest_path, "w", encoding="utf-8") as f:
                json.dump(backup_data, f, indent=2, cls=DateTimeEncoder)

            self.last_backup_time = backup_data["backup_timestamp"]
            self.last_backup_records = total_records
            return backup_data

    def trigger_async_backup(self, db_factory):
        """Asynchronously triggers a live snapshot in background thread without blocking HTTP requests."""
        def _worker():
            try:
                db = db_factory()
                try:
                    self.generate_live_snapshot(db)
                finally:
                    db.close()
            except Exception as e:
                print(f"[LIVE BACKUP ERROR] Failed async backup: {e}")

        thread = threading.Thread(target=_worker, daemon=True)
        thread.start()

live_backup_service = LiveBackupService()
