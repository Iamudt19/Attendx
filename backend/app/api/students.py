import cv2
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Student, FaceEmbedding, AttendanceRecord, AttendanceSession
from app.schemas.schemas import StudentCreate, StudentOut, FaceRegistrationResult
from app.core.security import get_current_user_token
from app.core.storage import storage_service
from app.cv.detector import face_detector
from app.cv.embedder import face_embedder

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=List[StudentOut])
def list_students(class_id: Optional[int] = None, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    query = db.query(Student).filter(Student.active == True)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    
    students = query.order_by(Student.roll_number).all()
    results = []
    for s in students:
        s_out = StudentOut.model_validate(s)
        s_out.face_count = len(s.embeddings)
        
        # Calculate overall attendance %
        total = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).count()
        if total > 0:
            present = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id, AttendanceRecord.status == "PRESENT").count()
            s_out.attendance_percentage = round((present / total) * 100.0, 1)
        else:
            s_out.attendance_percentage = 100.0

        results.append(s_out)
    return results

@router.post("", response_model=StudentOut)
def create_student(req: StudentCreate, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    existing = db.query(Student).filter(Student.student_id == req.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student ID {req.student_id} already exists")

    from app.core.security import get_password_hash
    student = Student(
        student_id=req.student_id,
        name=req.name,
        roll_number=req.roll_number,
        class_id=req.class_id,
        email=req.email,
        # Default portal password = student_id (student must change on first login ideally)
        password_hash=get_password_hash(req.student_id)
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    s_out = StudentOut.model_validate(student)
    s_out.face_count = 0
    s_out.attendance_percentage = 100.0
    return s_out

@router.get("/{student_id}", response_model=StudentOut)
def get_student_detail(student_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    s_out = StudentOut.model_validate(student)
    s_out.face_count = len(student.embeddings)

    total = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).count()
    if total > 0:
        present = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id, AttendanceRecord.status == "PRESENT").count()
        s_out.attendance_percentage = round((present / total) * 100.0, 1)
    else:
        s_out.attendance_percentage = 100.0

    return s_out

@router.post("/{student_id}/face-images", response_model=FaceRegistrationResult)
def upload_student_face_images(
    student_id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db), 
    token: dict = Depends(get_current_user_token)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    registered_count = 0
    warnings = []

    for idx, file in enumerate(files):
        if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
            warnings.append(f"File '{file.filename}': Unsupported image format. Must be JPEG or PNG.")
            continue

        contents = file.file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            warnings.append(f"File '{file.filename}': Could not decode image.")
            continue

        detected = face_detector.detect_faces(img)
        if len(detected) == 0:
            warnings.append(f"File '{file.filename}': No face detected. Please use a clear front-facing photograph.")
            continue
        elif len(detected) > 1:
            warnings.append(f"File '{file.filename}': Multiple faces ({len(detected)}) detected. Reference photos must contain exactly one face.")
            continue

        # Extract face embedding from the detected face
        cropped = detected[0]["cropped_face"]
        raw_face = detected[0].get("raw_face")
        embedding = face_embedder.compute_embedding(
            face_image_bgr=cropped,
            full_image_bgr=img,
            raw_face=raw_face
        )

        # Reset file seek for saving
        file.file.seek(0)
        saved_rel_path = storage_service.save_file(file, subfolder=f"students/{student.id}")

        face_emb_record = FaceEmbedding(
            student_id=student.id,
            embedding=embedding,
            source_image=saved_rel_path
        )
        db.add(face_emb_record)
        registered_count += 1

    db.commit()
    db.refresh(student)

    total_faces = len(student.embeddings)
    return FaceRegistrationResult(
        student_id=student.id,
        registered_images=registered_count,
        message=f"Successfully registered {registered_count} face embedding(s). Total embeddings stored: {total_faces}.",
        warnings=warnings
    )

@router.delete("/{student_id}/face-data")
def delete_student_face_data(student_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    """
    Privacy compliance endpoint: delete all biometric face embeddings and source images for a student.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id).all()
    count = len(embeddings)

    for emb in embeddings:
        if emb.source_image:
            storage_service.delete_file(emb.source_image)
        db.delete(emb)

    db.commit()
    return {"message": f"Successfully deleted all {count} face biometric records for student {student.name}."}
