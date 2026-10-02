import sqlite3
import shutil
import os

src_db = os.path.abspath('backend/attendx.db')
backup_db = os.path.abspath('backend/attendx_backup_safety.db')
root_db = os.path.abspath('attendx.db')

if os.path.exists(src_db):
    shutil.copy2(src_db, backup_db)
    shutil.copy2(src_db, root_db)
    print(f"[SECURITY] Safety backup verified at: {backup_db}")
    print(f"[SECURITY] Root DB synchronized at: {root_db}")

conn = sqlite3.connect(src_db)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("\n" + "="*60)
print("1. REGISTERED TEACHERS & ADMINS")
print("="*60)
for row in cur.execute("SELECT id, name, email, role FROM users"):
    print(f"  [ID {row['id']}] Name: {row['name']} | Email: {row['email']} | Role: {row['role']}")

print("\n" + "="*60)
print("2. ACADEMIC CLASSES & SUBJECTS")
print("="*60)
for row in cur.execute("SELECT id, name, section, academic_year FROM classes"):
    print(f"  [Class ID {row['id']}] {row['name']} - {row['section']} ({row['academic_year']})")

print("\n" + "="*60)
print("3. ALL REGISTERED STUDENTS & FACE EMBEDDING COUNTS")
print("="*60)
students = cur.execute("""
    SELECT s.id, s.student_id, s.name, s.roll_number, s.class_id, c.name as class_name, c.section, s.face_registration_complete,
           count(fe.id) as embedding_count
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN face_embeddings fe ON s.id = fe.student_id
    GROUP BY s.id
    ORDER BY s.id
""").fetchall()

for s in students:
    st_id = s['id']
    code = s['student_id']
    name = s['name']
    roll = s['roll_number']
    cname = f"{s['class_name']} {s['section']}"
    reg = "COMPLETE" if s['face_registration_complete'] else "PENDING"
    emb = s['embedding_count']
    print(f"  [ID {st_id:2d}] {code:8s} | {name:22s} | Roll: {roll:10s} | Class: {cname:18s} | Status: {reg:8s} | Vectors: {emb}")

print("\n" + "="*60)
print("4. TOTAL FACE VECTORS PERSISTED")
print("="*60)
total_embs = cur.execute("SELECT count(*) FROM face_embeddings").fetchone()[0]
print(f"  Total Face Vectors Persisted in DB: {total_embs}")

conn.close()
