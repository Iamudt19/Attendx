from sqlalchemy import create_engine, text

url = "postgresql://postgres:doctorvondoom1812@db.vffgjjlucktyrfjhbqbp.supabase.co:5432/postgres"
eng = create_engine(url)

with eng.connect() as conn:
    embs = conn.execute(text("SELECT id, student_id, angle_label, source, created_at FROM face_embeddings WHERE student_id = 26")).fetchall()
    print(f"Udit's Face Embeddings in Supabase (Student 26): {len(embs)}")
    for e in embs:
        print(f"  - Embedding ID: {e[0]} | Angle: {e[2]} | Source: {e[3]} | Created: {e[4]}")
