import os
import sqlite3
import cv2
import numpy as np

def run():
    db_path = "attendx.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(face_embeddings)")
    cols = [col[1] for col in cur.fetchall()]
    print("Existing face_embeddings columns:", cols)

    if "source" not in cols:
        print("Adding source column...")
        cur.execute("ALTER TABLE face_embeddings ADD COLUMN source VARCHAR(50) DEFAULT 'portal_scan'")
        conn.commit()

    if "angle_label" not in cols:
        print("Adding angle_label column...")
        cur.execute("ALTER TABLE face_embeddings ADD COLUMN angle_label VARCHAR(50)")
        conn.commit()

    conn.close()

    from app.database.session import SessionLocal
    from app.models.models import FaceEmbedding
    from app.cv.embedder import face_embedder
    from app.cv.detector import face_detector
    from app.core.config import settings

    db = SessionLocal()
    embeddings = db.query(FaceEmbedding).all()
    print(f"Total face embeddings in DB: {len(embeddings)}")

    updated = 0
    for emb in embeddings:
        if emb.source_image:
            full_path = os.path.join(settings.STORAGE_DIR, emb.source_image)
            if os.path.exists(full_path):
                img = cv2.imread(full_path)
                if img is not None:
                    detected = face_detector.detect_faces(img)
                    if detected:
                        new_vec = face_embedder.compute_embedding(
                            detected[0]["cropped_face"],
                            full_image_bgr=img,
                            raw_face=detected[0].get("raw_face")
                        )
                    else:
                        new_vec = face_embedder.compute_embedding(img)
                    emb.embedding = new_vec
                    updated += 1

    db.commit()
    print(f"Successfully migrated schema and re-embedded {updated} images with SFace deep embeddings!")

if __name__ == "__main__":
    run()
