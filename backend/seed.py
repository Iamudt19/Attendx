import os
import cv2
import numpy as np
from app.database.session import SessionLocal, Base, engine
from app.models.models import User, Class, Subject, Student, Enrollment, FaceEmbedding
from app.core.security import get_password_hash
from app.cv.embedder import face_embedder
from app.core.storage import storage_service

def seed_db():
    print("Initializing Database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Creating Users...")
        teacher = User(
            name="Prof. Alan Turing",
            email="teacher@attendx.edu",
            password_hash=get_password_hash("teacher123"),
            role="TEACHER"
        )
        admin = User(
            name="Dr. Ada Lovelace",
            email="admin@attendx.edu",
            password_hash=get_password_hash("admin123"),
            role="ADMIN"
        )
        db.add_all([teacher, admin])
        db.commit()

        print("Creating Classes...")
        class_cse = Class(name="CSE", section="Section A", academic_year="2026-27")
        class_ece = Class(name="ECE", section="Section B", academic_year="2026-27")
        db.add_all([class_cse, class_ece])
        db.commit()
        db.refresh(class_cse)
        db.refresh(class_ece)

        print("Creating Subjects...")
        sub_dbms = Subject(name="Database Management Systems", code="DBMS101", class_id=class_cse.id)
        sub_os = Subject(name="Operating Systems", code="OS201", class_id=class_cse.id)
        sub_ds = Subject(name="Data Structures & Algorithms", code="DS102", class_id=class_cse.id)
        sub_vlsi = Subject(name="VLSI Design", code="ECE301", class_id=class_ece.id)
        db.add_all([sub_dbms, sub_os, sub_ds, sub_vlsi])
        db.commit()
        db.refresh(sub_dbms)
        db.refresh(sub_os)

        print("Creating 25 Students & Reference Face Embeddings...")
        student_names = [
            "Rahul Sharma", "Amit Patel", "Priya Verma", "Sneha Rao", "Rohan Gupta",
            "Ananya Singh", "Vikram Malhotra", "Kavya Nair", "Aditya Joshi", "Neha Kapoor",
            "Siddharth Kumar", "Pooja Reddy", "Manish Iyer", "Divya Saxena", "Arjun Das",
            "Meera Pillai", "Karan Mehta", "Riya Sen", "Deepak Chopra", "Shruti Agarwal",
            "Nikhil Trivedi", "Tanvi Bhatia", "Yash Wardhan", "Simran Gill", "Varun Choudhary"
        ]

        for idx, name in enumerate(student_names, 1):
            stu_code = f"STU{idx:03d}"
            roll_no = f"2026CSE{idx:02d}"
            email = f"{name.lower().replace(' ', '.')}@student.attendx.edu"
            
            student = Student(
                student_id=stu_code,
                name=name,
                roll_number=roll_no,
                class_id=class_cse.id,
                email=email
            )
            db.add(student)
            db.commit()
            db.refresh(student)

            # Enroll in CSE subjects
            for sub in [sub_dbms, sub_os, sub_ds]:
                enr = Enrollment(student_id=student.id, subject_id=sub.id)
                db.add(enr)

            # Generate distinct, unit-normalized 128-d reference embedding
            rng = np.random.RandomState(42 + idx * 100)
            raw_vec = rng.randn(128).astype(np.float32)
            emb_vector = (raw_vec / np.linalg.norm(raw_vec)).tolist()
            
            # Save a placeholder avatar to storage
            face_img = np.zeros((112, 112, 3), dtype=np.uint8)
            cv2.circle(face_img, (56, 56), 40, (180 + (idx*7)%70, 140 + (idx*11)%90, 190), -1)
            cv2.circle(face_img, (42, 45), 6, (40, 40, 40), -1)
            cv2.circle(face_img, (70, 45), 6, (40, 40, 40), -1)
            cv2.ellipse(face_img, (56, 75), (16, 10), 0, 0, 180, (20, 20, 180), 3)

            storage_subfolder = os.path.join(storage_service.base_dir, f"students/{student.id}")
            os.makedirs(storage_subfolder, exist_ok=True)
            img_rel_path = f"students/{student.id}/ref_1.jpg"
            full_img_path = os.path.join(storage_service.base_dir, img_rel_path)
            cv2.imwrite(full_img_path, face_img)

            face_emb = FaceEmbedding(
                student_id=student.id,
                embedding=emb_vector,
                source_image=img_rel_path,
                angle_label="front",
                source="seed"
            )
            db.add(face_emb)

        db.commit()
        print("Database Seeding Completed Successfully!")
        print("\nDemo Credentials:")
        print("Teacher Login -> Email: teacher@attendx.edu | Password: teacher123")
        print("Admin Login   -> Email: admin@attendx.edu   | Password: admin123")

    except Exception as e:
        db.rollback()
        print(f"Seeding Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
