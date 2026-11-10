"""
AttendX database keep-alive daemon.
Runs a periodic transaction every 4 hours to prevent Supabase free-tier inactivity pauses
and logs latency to system_heartbeats.
"""
import os
import sys
import time
import argparse
from datetime import datetime, timedelta, timezone
import psycopg2
from psycopg2.extras import RealDictCursor

DEFAULT_DB_URL = "postgresql://postgres.vffgjjlucktyrfjhbqbp:doctordoom1812@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

def execute_heartbeat(db_url: str):
    start = time.time()
    try:
        conn = psycopg2.connect(db_url, connect_timeout=10)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Measure roundtrip latency
        cur.execute("SELECT 1 as ping;")
        cur.fetchone()
        latency = round((time.time() - start) * 1000, 2)
        
        # 2. Touch database with persistent heartbeat entry
        cur.execute("""
            INSERT INTO system_heartbeats (worker_id, pinged_at, status, latency_ms)
            VALUES (%s, CURRENT_TIMESTAMP, %s, %s)
            RETURNING id, pinged_at;
        """, ("keep-alive-daemon", "HEALTHY", latency))
        rec = cur.fetchone()
        
        # 3. Clean up heartbeats older than 14 days to prevent storage bloat
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=14)
        cur.execute("DELETE FROM system_heartbeats WHERE pinged_at < %s;", (cutoff,))
        
        # 4. Read counts to keep query cache warm
        cur.execute("SELECT COUNT(*) as student_count FROM students;")
        scnt = cur.fetchone()['student_count']
        
        conn.commit()
        cur.close()
        conn.close()
        
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] [OK] Heartbeat ping - Latency: {latency}ms | Active Students: {scnt} | Ping ID: {rec['id']}")
        return True, latency
    except Exception as e:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] [FAIL] Heartbeat ping: {e}", file=sys.stderr)
        return False, None

def main():
    parser = argparse.ArgumentParser(description="AttendX database keep-alive daemon")
    parser.add_argument("--once", action="store_true", help="Execute single heartbeat and exit")
    parser.add_argument("--interval", type=int, default=14400, help="Interval in seconds between heartbeats (default: 14400 = 4 hours)")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
    
    print("=" * 60)
    print(" AttendX Keep-Alive Daemon")
    print(f" Target Database: {db_url.split('@')[-1]}")
    print(f" Mode: {'Single Execution' if args.once else f'Continuous Loop ({args.interval}s interval)'}")
    print("=" * 60)

    if args.once:
        success, _ = execute_heartbeat(db_url)
        sys.exit(0 if success else 1)

    # Continuous daemon mode
    while True:
        execute_heartbeat(db_url)
        print(f"Sleeping for {args.interval} seconds until next heartbeat...")
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
