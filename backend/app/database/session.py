import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.clean_database_url
connect_args = {}
pool_pre_ping = True

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    pool_pre_ping = False

def create_safe_engine(target_url: str):
    is_sqlite = target_url.startswith("sqlite")
    c_args = {"check_same_thread": False} if is_sqlite else {}
    
    eng = create_engine(
        target_url,
        connect_args=c_args,
        pool_pre_ping=not is_sqlite
    )
    
    # Eagerly test connection if remote
    if not is_sqlite:
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully.")
            return eng
        except Exception as conn_err:
            print(f"⚠️ Remote Database Connection Failed ({target_url}): {conn_err}")
            # Try connecting directly to the resilient Supabase pooler
            fallback_remote = "postgresql+psycopg2://postgres.vffgjjlucktyrfjhbqbp:doctordoom1812@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
            if target_url != fallback_remote:
                try:
                    print("🔄 Retrying with primary Supabase pooler resilience endpoint...")
                    fb_eng = create_engine(fallback_remote, pool_pre_ping=True)
                    with fb_eng.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    print("✅ Successfully recovered connection via primary Supabase pooler!")
                    return fb_eng
                except Exception as fb_err:
                    print(f"⚠️ Primary pooler retry also failed: {fb_err}")

            print("🔄 Falling back to local SQLite engine (attendx.db) to ensure high availability.")
            return create_engine(
                "sqlite:///./attendx.db",
                connect_args={"check_same_thread": False}
            )
    return eng

engine = create_safe_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def run_auto_migrations(target_engine):
    """Safely apply non-destructive schema additions to existing databases without dropping tables."""
    try:
        with target_engine.connect() as conn:
            # Check users table columns
            if target_engine.dialect.name == "sqlite":
                res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                existing_cols = {row[1] for row in res}
                if "is_approved" not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1"))
                    conn.commit()
                if "approved_by" not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approved_by INTEGER"))
                    conn.commit()
                if "approved_at" not in existing_cols and len(existing_cols) > 0:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approved_at TIMESTAMP"))
                    conn.commit()
                # Face embeddings & students in SQLite
                res_f = conn.execute(text("PRAGMA table_info(face_embeddings)")).fetchall()
                f_cols = {row[1] for row in res_f}
                if "image_base64" not in f_cols and len(f_cols) > 0:
                    conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN image_base64 TEXT"))
                if "is_deleted" not in f_cols and len(f_cols) > 0:
                    conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS immutable_face_vault (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id VARCHAR(50) NOT NULL,
                        student_db_id INTEGER,
                        student_name VARCHAR(100) NOT NULL,
                        roll_number VARCHAR(50),
                        class_id INTEGER,
                        institution_id INTEGER,
                        embedding TEXT NOT NULL,
                        image_base64 TEXT,
                        source_image VARCHAR(255),
                        angle_label VARCHAR(50),
                        source VARCHAR(50) DEFAULT 'portal_scan',
                        is_active BOOLEAN DEFAULT 1,
                        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.commit()
            elif target_engine.dialect.name == "postgresql":
                # Ensure institutions table exists
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS institutions (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(150) NOT NULL,
                        code VARCHAR(30) UNIQUE NOT NULL,
                        official_email VARCHAR(120) UNIQUE NOT NULL,
                        domain VARCHAR(100),
                        address TEXT,
                        status VARCHAR(30) DEFAULT 'APPROVED' NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        approved_at TIMESTAMP,
                        approved_by VARCHAR(100)
                    );
                """))
                # Ensure heartbeats table exists
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS system_heartbeats (
                        id SERIAL PRIMARY KEY,
                        worker_id VARCHAR(50) DEFAULT 'keep-alive-daemon',
                        pinged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(20) DEFAULT 'HEALTHY',
                        latency_ms FLOAT
                    );
                """))
                # Seed default institution if not exists
                conn.execute(text("""
                    INSERT INTO institutions (id, name, code, official_email, status, created_at, approved_at, approved_by)
                    VALUES (1, 'AttendX Primary Institution', 'ATTENDX', 'admin@attendx.edu', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM')
                    ON CONFLICT (id) DO NOTHING;
                """))
                # Synchronize institution id sequence
                conn.execute(text("SELECT setval(pg_get_serial_sequence('institutions', 'id'), COALESCE(MAX(id), 1) + 1, false) FROM institutions;"))

                # User columns
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_classes JSON DEFAULT '[]'"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'APPROVED'"))
                conn.execute(text("UPDATE users SET institution_id = 1 WHERE institution_id IS NULL"))

                # Class & Subject columns
                conn.execute(text("ALTER TABLE classes ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL"))
                conn.execute(text("UPDATE classes SET institution_id = 1 WHERE institution_id IS NULL"))
                conn.execute(text("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL"))
                conn.execute(text("UPDATE subjects SET institution_id = 1 WHERE institution_id IS NULL"))

                # Student columns
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL"))
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'APPROVED'"))
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS approved_by_teacher_id INTEGER REFERENCES users(id)"))
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"))
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS face_registration_complete BOOLEAN DEFAULT FALSE"))
                conn.execute(text("UPDATE students SET institution_id = 1 WHERE institution_id IS NULL"))
                conn.execute(text("UPDATE students SET approval_status = 'APPROVED' WHERE approval_status IS NULL"))

                # Face Embeddings & Records
                conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS angle_label VARCHAR(50)"))
                conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'portal_scan'"))
                conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS image_base64 TEXT"))
                conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
                conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP"))
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
                conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP"))
                conn.execute(text("ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'AUTO'"))
                conn.execute(text("ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))

                # Indestructible Face Biometric Vault
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS immutable_face_vault (
                        id SERIAL PRIMARY KEY,
                        student_id VARCHAR(50) NOT NULL,
                        student_db_id INTEGER,
                        student_name VARCHAR(100) NOT NULL,
                        roll_number VARCHAR(50),
                        class_id INTEGER,
                        institution_id INTEGER,
                        embedding JSON NOT NULL,
                        image_base64 TEXT,
                        source_image VARCHAR(255),
                        angle_label VARCHAR(50),
                        source VARCHAR(50) DEFAULT 'portal_scan',
                        is_active BOOLEAN DEFAULT TRUE,
                        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_vault_student_id ON immutable_face_vault(student_id);"))

                # Backfill vault from existing face_embeddings if vault is empty
                res_v = conn.execute(text("SELECT COUNT(*) FROM immutable_face_vault")).fetchone()
                if res_v and res_v[0] == 0:
                    conn.execute(text("""
                        INSERT INTO immutable_face_vault (student_id, student_db_id, student_name, roll_number, class_id, institution_id, embedding, source_image, angle_label, source, is_active, archived_at)
                        SELECT 
                            s.student_id,
                            s.id AS student_db_id,
                            s.name AS student_name,
                            s.roll_number,
                            s.class_id,
                            s.institution_id,
                            fe.embedding,
                            fe.source_image,
                            COALESCE(fe.angle_label, 'front'),
                            COALESCE(fe.source, 'portal_scan'),
                            TRUE,
                            COALESCE(fe.created_at, CURRENT_TIMESTAMP)
                        FROM face_embeddings fe
                        JOIN students s ON s.id = fe.student_id
                        ON CONFLICT DO NOTHING;
                    """))
                conn.commit()
    except Exception as e:
        print(f"Auto-migration notice (non-fatal): {e}")

# Run schema sync safely
try:
    run_auto_migrations(engine)
except Exception:
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
