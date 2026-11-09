import os
import psycopg2
import json

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.vffgjjlucktyrfjhbqbp:doctordoom1812@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
)

print(f"[VAULT MIGRATE] Connecting to Supabase...")
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# 1. Update columns
print("[VAULT MIGRATE] Applying schema updates for indestructible persistence...")
cur.execute("""
    ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS image_base64 TEXT;
    ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

    ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

    ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
""")

# 2. Create immutable_face_vault table
print("[VAULT MIGRATE] Creating immutable_face_vault table...")
cur.execute("""
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
    CREATE INDEX IF NOT EXISTS idx_vault_student_id ON immutable_face_vault(student_id);
    CREATE INDEX IF NOT EXISTS idx_vault_student_db_id ON immutable_face_vault(student_db_id);
""")

# 3. Populate immutable_face_vault from existing face_embeddings
print("[VAULT MIGRATE] Rehydrating immutable_face_vault from existing face embeddings...")
cur.execute("""
    INSERT INTO immutable_face_vault (
        student_id, student_db_id, student_name, roll_number, class_id, institution_id,
        embedding, source_image, image_base64, angle_label, source, is_active, archived_at
    )
    SELECT 
        s.student_id,
        s.id AS student_db_id,
        s.name AS student_name,
        s.roll_number,
        s.class_id,
        s.institution_id,
        fe.embedding,
        fe.source_image,
        fe.image_base64,
        COALESCE(fe.angle_label, 'front'),
        COALESCE(fe.source, 'portal_scan'),
        TRUE,
        COALESCE(fe.created_at, CURRENT_TIMESTAMP)
    FROM face_embeddings fe
    JOIN students s ON s.id = fe.student_id
    WHERE NOT EXISTS (
        SELECT 1 FROM immutable_face_vault ifv 
        WHERE ifv.student_db_id = fe.student_id 
          AND ifv.angle_label = COALESCE(fe.angle_label, 'front')
    );
""")

conn.commit()

# 4. Verify counts
cur.execute("SELECT COUNT(*) FROM students;")
student_count = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM face_embeddings;")
embedding_count = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM immutable_face_vault;")
vault_count = cur.fetchone()[0]

print(f"\n[VAULT MIGRATE SUCCESS]")
print(f"  Students:        {student_count}")
print(f"  Face Embeddings: {embedding_count}")
print(f"  Vault Records:   {vault_count}")

cur.close()
conn.close()
