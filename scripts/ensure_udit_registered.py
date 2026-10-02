import sys
import os
import sqlite3
import shutil

backend_dir = os.path.abspath("backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.session import SessionLocal, Base, engine
from app.models.models import User, Class, Subject, Student, Enrollment, FaceEmbedding
from app.core.security import get_password_hash

def register_udit_permanently():
    db = SessionLocal()
    try:
        # 1. Get or create CSE Section A class
        cse_class = db.query(Class).filter(Class.name == "CSE").first()
        if not cse_class:
            cse_class = Class(name="CSE", section="Section A", academic_year="2026-27")
            db.add(cse_class)
            db.commit()
            db.refresh(cse_class)

        # 2. Check if student Udit exists by email or student_id
        student = db.query(Student).filter(
            (Student.student_id == "UDIT01") | 
            (Student.email == "iamudt19@gmail.com") |
            (Student.name == "Udit")
        ).first()

        if not student:
            print("[INFO] Creating permanent student profile for Udit...")
            student = Student(
                student_id="UDIT01",
                name="Udit",
                roll_number="2026CSE00",
                class_id=cse_class.id,
                email="iamudt19@gmail.com",
                password_hash=get_password_hash("udit123"),
                face_registration_complete=False,
                active=True
            )
            db.add(student)
            db.commit()
            db.refresh(student)
            print(f"[OK] Registered Student: Udit (ID: {student.id}, Student ID: {student.student_id})")
        else:
            print(f"[OK] Student Udit already exists in database (ID: {student.id}, Student ID: {student.student_id})")
            student.password_hash = get_password_hash("udit123")
            student.active = True
            db.commit()

        # 3. Enroll Udit in all subjects of CSE
        subjects = db.query(Subject).filter(Subject.class_id == cse_class.id).all()
        for sub in subjects:
            existing_enr = db.query(Enrollment).filter(
                Enrollment.student_id == student.id,
                Enrollment.subject_id == sub.id
            ).first()
            if not existing_enr:
                enr = Enrollment(student_id=student.id, subject_id=sub.id)
                db.add(enr)
        db.commit()

        # 4. Check existing embeddings
        embs = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).all()
        print(f"Udit stored embeddings count: {len(embs)}")

        print("\n[SUCCESS] Student Udit is permanently saved in the database.")
        print("Login credentials for student portal:")
        print("  Student ID: UDIT01 (or email: iamudt19@gmail.com)")
        print("  Password:   udit123 (or student ID)")

    finally:
        db.close()

    # Sync databases
    src_db = os.path.abspath('backend/attendx.db')
    backup_db = os.path.abspath('backend/attendx_backup_safety.db')
    root_db = os.path.abspath('attendx.db')
    if os.path.exists(src_db):
        shutil.copy2(src_db, backup_db)
        shutil.copy2(src_db, root_db)
        print("Databases synchronized across backend, root, and safety backup.")

if __name__ == "__main__":
    register_udit_permanently()
