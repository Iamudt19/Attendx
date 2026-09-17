import os
import cv2
import numpy as np
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import AttendanceSession, AttendanceRecord, Student, Class, Subject, FaceEmbedding, User
from app.schemas.schemas import (
    AttendanceAnalysisResponse, SaveAttendanceSessionRequest, AttendanceSessionOut, AttendanceRecordOut
)
from app.core.config import settings
from app.core.security import get_current_user_token
from app.core.storage import storage_service
from app.cv.pipeline import pipeline
from app.cv.embedder import face_embedder
from app.services.excel_service import excel_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/analyze", response_model=AttendanceAnalysisResponse)
def analyze_classroom_photo(
    class_id: int = Form(...),
    subject_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Read image contents
    image_bytes = file.file.read()

    # Query all active enrolled students in this class
    students = db.query(Student).filter(Student.class_id == class_id, Student.active == True).order_by(Student.roll_number).all()
    enrolled_list = [
        {
            "id": s.id,
            "student_id": s.student_id,
            "name": s.name,
            "roll_number": s.roll_number
        }
        for s in students
    ]

    # Build student embeddings map: { student_db_id: [list of embedding vectors] }
    student_embeddings_map = {}
    for s in students:
        embs = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == s.id).all()
        if embs:
            student_embeddings_map[s.id] = [e.embedding for e in embs]

    # Save uploaded classroom image temporarily/permanently
    file.file.seek(0)
    saved_rel_path = storage_service.save_file(file, subfolder="classroom_photos")

    # Run CV pipeline
    try:
        pipeline_res = pipeline.process_classroom_image(
            image_bytes=image_bytes,
            enrolled_students=enrolled_list,
            student_embeddings_map=student_embeddings_map
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return AttendanceAnalysisResponse(
        image_url=f"/storage/{saved_rel_path}",
        total_detected_faces=pipeline_res["total_detected_faces"],
        recognized_faces=pipeline_res["recognized_faces"],
        proposed_attendance=pipeline_res["proposed_attendance"],
        present_count=pipeline_res["present_count"],
        absent_count=pipeline_res["absent_count"],
        needs_review_count=pipeline_res["needs_review_count"]
    )

@router.post("/sessions", response_model=AttendanceSessionOut)
def save_attendance_session(
    req: SaveAttendanceSessionRequest,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    teacher_id = int(token.get("sub"))

    # Check for duplicate session on same date, class, subject
    existing = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == req.class_id,
        AttendanceSession.subject_id == req.subject_id,
        AttendanceSession.date == req.date
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Attendance for this class and subject has already been recorded for date {req.date}."
        )

    # Create session
    session = AttendanceSession(
        class_id=req.class_id,
        subject_id=req.subject_id,
        teacher_id=teacher_id,
        date=req.date,
        start_time=req.start_time,
        image_path=req.image_path
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Save attendance records
    present_cnt = 0
    absent_cnt = 0

    for rec in req.records:
        r = AttendanceRecord(
            session_id=session.id,
            student_id=rec.student_id,
            status=rec.status,
            confidence=rec.confidence,
            verification_status=rec.verification_status
        )
        db.add(r)
        if rec.status == "PRESENT":
            present_cnt += 1
        else:
            absent_cnt += 1

        # Record teacher decision audit log if verified / overridden
        if rec.verification_status in ["TEACHER_VERIFIED", "MANUAL"]:
            audit = AttendanceAuditLog(
                session_id=session.id,
                student_id=rec.student_id,
                teacher_id=teacher_id,
                original_status="PRESENT" if rec.status == "ABSENT" else "ABSENT",
                original_score=rec.confidence,
                final_status=rec.status,
                reason=f"Teacher decision: marked {rec.status}"
            )
            db.add(audit)

    db.commit()

    # ── Online Active Learning: Learn from teacher-verified / corrected faces ──
    try:
        if req.image_path and req.recognized_faces:
            clean_rel_path = req.image_path.replace("/storage/", "").lstrip("/")
            full_img_path = os.path.join(settings.STORAGE_DIR, clean_rel_path)
            if os.path.exists(full_img_path):
                img = cv2.imread(full_img_path)
                if img is not None:
                    h_img, w_img = img.shape[:2]
                    student_status_map = {r.student_id: r.status for r in req.records}
                    
                    for face in req.recognized_faces:
                        if face.student_id and student_status_map.get(face.student_id) == "PRESENT":
                            bx = max(0, min(w_img - 1, face.box.x))
                            by = max(0, min(h_img - 1, face.box.y))
                            bw = max(10, min(w_img - bx, face.box.w))
                            bh = max(10, min(h_img - by, face.box.h))
                            cropped = img[by:by+bh, bx:bx+bw]
                            
                            if cropped.size > 0:
                                new_emb = face_embedder.compute_embedding(cropped)
                                if new_emb and any(v != 0.0 for v in new_emb):
                                    existing_embs = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == face.student_id).all()
                                    should_add = True
                                    for ex in existing_embs:
                                        if ex.embedding:
                                            sim = float(np.dot(np.array(new_emb), np.array(ex.embedding)))
                                            if sim > 0.93:
                                                should_add = False
                                                break
                                    
                                    if should_add:
                                        new_rec = FaceEmbedding(
                                            student_id=face.student_id,
                                            embedding=new_emb,
                                            source_image=clean_rel_path,
                                            angle_label="classroom_verified",
                                            source="teacher_verified"
                                        )
                                        db.add(new_rec)
                                        
                                        if len(existing_embs) >= 12:
                                            oldest_tv = db.query(FaceEmbedding).filter(
                                                FaceEmbedding.student_id == face.student_id,
                                                FaceEmbedding.source == "teacher_verified"
                                            ).order_by(FaceEmbedding.created_at.asc()).first()
                                            if oldest_tv:
                                                db.delete(oldest_tv)
                                                
                    db.commit()
    except Exception as e:
        print(f"Warning: Teacher active learning feedback loop error: {e}")

    # Generate/Update Excel report automatically
    try:
        excel_service.generate_class_attendance_excel(db, req.class_id, req.subject_id)
    except Exception as e:
        print(f"Warning: Excel generation error: {e}")

    db.refresh(session)

    # Return output schema
    records_out = []
    for r in session.records:
        r_out = AttendanceRecordOut.model_validate(r)
        if r.student:
            r_out.student_name = r.student.name
            r_out.student_code = r.student.student_id
            r_out.roll_number = r.student.roll_number
        records_out.append(r_out)

    cls = db.query(Class).filter(Class.id == session.class_id).first()
    sub = db.query(Subject).filter(Subject.id == session.subject_id).first()
    tch = db.query(User).filter(User.id == session.teacher_id).first()

    return AttendanceSessionOut(
        id=session.id,
        class_id=session.class_id,
        class_name=f"{cls.name} {cls.section}" if cls else "N/A",
        subject_id=session.subject_id,
        subject_name=f"{sub.name} ({sub.code})" if sub else "N/A",
        teacher_id=session.teacher_id,
        teacher_name=tch.name if tch else "N/A",
        date=session.date,
        start_time=session.start_time,
        image_path=session.image_path,
        present_count=present_cnt,
        absent_count=absent_cnt,
        total_enrolled=len(records_out),
        records=records_out
    )

@router.get("/sessions", response_model=List[AttendanceSessionOut])
def get_attendance_sessions(
    class_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    query = db.query(AttendanceSession)
    if class_id:
        query = query.filter(AttendanceSession.class_id == class_id)
    if subject_id:
        query = query.filter(AttendanceSession.subject_id == subject_id)
    if date:
        query = query.filter(AttendanceSession.date == date)

    sessions = query.order_by(AttendanceSession.created_at.desc()).all()
    results = []

    for s in sessions:
        present_cnt = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id, AttendanceRecord.status == "PRESENT").count()
        absent_cnt = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id, AttendanceRecord.status == "ABSENT").count()
        total_cnt = present_cnt + absent_cnt

        cls = db.query(Class).filter(Class.id == s.class_id).first()
        sub = db.query(Subject).filter(Subject.id == s.subject_id).first()
        tch = db.query(User).filter(User.id == s.teacher_id).first()

        results.append(AttendanceSessionOut(
            id=s.id,
            class_id=s.class_id,
            class_name=f"{cls.name} {cls.section}" if cls else "N/A",
            subject_id=s.subject_id,
            subject_name=f"{sub.name} ({sub.code})" if sub else "N/A",
            teacher_id=s.teacher_id,
            teacher_name=tch.name if tch else "N/A",
            date=s.date,
            start_time=s.start_time,
            image_path=s.image_path,
            present_count=present_cnt,
            absent_count=absent_cnt,
            total_enrolled=total_cnt,
            records=[]
        ))
    return results

@router.get("/sessions/{session_id}", response_model=AttendanceSessionOut)
def get_attendance_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    s = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    present_cnt = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id, AttendanceRecord.status == "PRESENT").count()
    absent_cnt = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id, AttendanceRecord.status == "ABSENT").count()

    cls = db.query(Class).filter(Class.id == s.class_id).first()
    sub = db.query(Subject).filter(Subject.id == s.subject_id).first()
    tch = db.query(User).filter(User.id == s.teacher_id).first()

    records_out = []
    for r in s.records:
        r_out = AttendanceRecordOut.model_validate(r)
        if r.student:
            r_out.student_name = r.student.name
            r_out.student_code = r.student.student_id
            r_out.roll_number = r.student.roll_number
        records_out.append(r_out)

    return AttendanceSessionOut(
        id=s.id,
        class_id=s.class_id,
        class_name=f"{cls.name} {cls.section}" if cls else "N/A",
        subject_id=s.subject_id,
        subject_name=f"{sub.name} ({sub.code})" if sub else "N/A",
        teacher_id=s.teacher_id,
        teacher_name=tch.name if tch else "N/A",
        date=s.date,
        start_time=s.start_time,
        image_path=s.image_path,
        present_count=present_cnt,
        absent_count=absent_cnt,
        total_enrolled=len(records_out),
        records=records_out
    )

@router.get("/students/{student_id}")
def get_student_attendance_log(
    student_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    logs = []
    for r in records:
        sess = r.session
        logs.append({
            "session_id": sess.id,
            "date": sess.date,
            "subject_name": sess.subject.name if sess.subject else "N/A",
            "subject_code": sess.subject.code if sess.subject else "N/A",
            "status": r.status,
            "confidence": r.confidence,
            "verification_status": r.verification_status
        })

    return {
        "student_id": student.id,
        "name": student.name,
        "roll_number": student.roll_number,
        "custom_id": student.student_id,
        "total_classes": len(records),
        "present_count": sum(1 for r in records if r.status == "PRESENT"),
        "absent_count": sum(1 for r in records if r.status == "ABSENT"),
        "logs": logs
    }
