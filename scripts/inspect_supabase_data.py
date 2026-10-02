import os
from sqlalchemy import create_engine, text

url = "postgresql://postgres:doctorvondoom1812@db.vffgjjlucktyrfjhbqbp.supabase.co:5432/postgres"
eng = create_engine(url)

with eng.connect() as conn:
    print("=== USERS IN SUPABASE ===")
    for u in conn.execute(text("SELECT id, name, email, role FROM users")).fetchall():
        print(f"  {u}")

    print("\n=== STUDENTS IN SUPABASE ===")
    for s in conn.execute(text("SELECT id, student_id, name, roll_number, class_id FROM students")).fetchall():
        print(f"  {s}")

    print("\n=== FACE EMBEDDINGS IN SUPABASE ===")
    embs = conn.execute(text("SELECT id, student_id, angle_label, source FROM face_embeddings")).fetchall()
    print(f"  Total face embeddings in Supabase: {len(embs)}")
    for e in embs[:10]:
        print(f"  {e}")
