import os, glob
from app.cv.detector import face_detector
from app.cv.embedder import face_embedder
from app.database.session import SessionLocal
from app.models.models import Student
import cv2, numpy as np

db = SessionLocal()
udit = db.query(Student).filter(Student.name.ilike('%udit%')).first()
piyush = db.query(Student).filter(Student.name.ilike('%piyush%')).first()

files = sorted(glob.glob('storage/classroom_photos/*.jpg'), key=os.path.getmtime)
print(f'Found {len(files)} photos in storage')

for f in files[-4:]:
    print(f'\n=== Photo: {os.path.basename(f)} ===')
    img = cv2.imread(f)
    if img is None:
        continue
    faces = face_detector.detect_faces(img)
    cand_embs = face_embedder.compute_embeddings_batch(faces, full_image_bgr=img)
    print(f'Detected {len(faces)} faces')
    
    for idx, (face, emb) in enumerate(zip(faces, cand_embs)):
        emb_arr = np.array(emb)
        u_sim = max([float(np.dot(emb_arr, np.array(e.embedding))) for e in udit.embeddings]) if udit and udit.embeddings else 0
        p_sim = max([float(np.dot(emb_arr, np.array(e.embedding))) for e in piyush.embeddings]) if piyush and piyush.embeddings else 0
        b = face['box']
        print(f"  Face #{idx+1} box=({b['x']},{b['y']},{b['w']},{b['h']}): Udit={u_sim:.4f}, Piyush={p_sim:.4f}")
