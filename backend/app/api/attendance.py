import os
import cv2
import numpy as np
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import AttendanceSession, AttendanceRecord, Student, Class, Subject, FaceEmbedding, User, AttendanceAuditLog
from app.schemas.schemas import (
    AttendanceAnalysisResponse, SaveAttendanceSessionRequest, UpdateSessionRecordsRequest, AttendanceSessionOut, AttendanceRecordOut
)
from app.core.config import settings
from app.core.security import get_current_user_token
from app.core.storage import storage_service
from app.cv.pipeline import pipeline
from app.cv.embedder import face_embedder
from app.services.excel_service import excel_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/analyze", response_model=AttendanceAnalysisResponse)
async def analyze_classroom_photo(
    class_id: int = Form(...),
    subject_id: int = Form(...),
    files: Optional[List[UploadFile]] = File(default=None),
    file: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    uploaded_files: List[UploadFile] = []
    if files:
        for f in files:
            if hasattr(f, "filename") and f.filename:
                uploaded_files.append(f)
    # Only use 'file' as fallback if no files were provided via 'files' param
    if not uploaded_files and file and hasattr(file, "filename") and file.filename:
        uploaded_files.append(file)

    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No classroom photo uploaded. Please stage at least one photo.")

    # Read image contents, normalize EXIF orientation, and save files
    images_bytes_list = []
    image_urls = []
    import io
    from PIL import Image, ImageOps

    for f in uploaded_files:
        content = await f.read()
        if not content or len(content) == 0:
            continue

        # Transpose image to upright orientation based on EXIF
        try:
            pil_img = Image.open(io.BytesIO(content))
            pil_transposed = ImageOps.exif_transpose(pil_img)
            # Re-encode as clean upright JPEG
            buf = io.BytesIO()
            if pil_transposed.mode != 'RGB':
                pil_transposed = pil_transposed.convert('RGB')
            pil_transposed.save(buf, format='JPEG', quality=95)
            normalized_content = buf.getvalue()
        except Exception as e:
            print(f"Image EXIF normalization fallback: {e}")
            normalized_content = content

        images_bytes_list.append(normalized_content)
        saved_rel = storage_service.save_bytes(normalized_content, ext=".jpg", subfolder="classroom_photos")
        image_urls.append(f"/storage/{saved_rel}")

    if not images_bytes_list:
        raise HTTPException(status_code=400, detail="Uploaded photo files contained empty or unreadable byte streams.")

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

    # Run CV pipeline across all photos
    try:
        if len(images_bytes_list) == 1:
            pipeline_res = pipeline.process_classroom_image(
                image_bytes=images_bytes_list[0],
                enrolled_students=enrolled_list,
                student_embeddings_map=student_embeddings_map
            )
        else:
            pipeline_res = pipeline.process_multiple_classroom_images(
                images_bytes_list=images_bytes_list,
                enrolled_students=enrolled_list,
                student_embeddings_map=student_embeddings_map
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recognition pipeline error: {str(e)}")

    return AttendanceAnalysisResponse(
        image_url=image_urls[0],
        image_urls=image_urls,
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
    sub_val = token.get("sub")
    try:
        teacher_id = int(sub_val)
    except (ValueError, TypeError):
        user_rec = db.query(User).filter(User.email == str(sub_val)).first() if sub_val else None
        if not user_rec:
            user_rec = db.query(User).first()
        teacher_id = user_rec.id if user_rec else 1

    # Check for existing session on same date, class, subject — UPSERT logic
    existing = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == req.class_id,
        AttendanceSession.subject_id == req.subject_id,
        AttendanceSession.date == req.date
    ).first()

    if existing:
        # Delete old records so we can replace with new ones
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == existing.id).delete()
        db.query(AttendanceAuditLog).filter(AttendanceAuditLog.session_id == existing.id).delete()
        # Update session metadata
        existing.teacher_id = teacher_id
        existing.start_time = req.start_time
        if req.image_path:
            existing.image_path = req.image_path
        db.commit()
        session = existing
    else:

        # Create new session
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
            try:
                from app.models.models import AttendanceAuditLog
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
            except Exception as audit_err:
                print(f"Attendance audit log notice (non-fatal): {audit_err}")

    db.commit()
    db.refresh(session)

    # ── Online Active Learning: Learn from teacher-verified / corrected faces ──
    try:
        if req.recognized_faces:
            student_status_map = {r.student_id: r.status for r in req.records}

            # Collect all image paths (support multi-photo)
            image_paths_to_try = []
            if hasattr(req, 'image_urls') and req.image_urls:
                image_paths_to_try = req.image_urls
            elif req.image_path:
                image_paths_to_try = [req.image_path]

            # Build a map of image_index -> loaded cv2 image
            loaded_images: dict = {}
            for idx, img_url in enumerate(image_paths_to_try):
                clean_rel_path = img_url.replace("/storage/", "").lstrip("/")
                full_img_path = os.path.join(settings.STORAGE_DIR, clean_rel_path)
                if os.path.exists(full_img_path):
                    img_cv = cv2.imread(full_img_path)
                    if img_cv is not None:
                        loaded_images[idx] = (img_cv, clean_rel_path)

            # Import the detector so we can re-extract landmarks per face crop
            from app.cv.detector import face_detector as _face_detector

            for face in req.recognized_faces:
                if not face.student_id or student_status_map.get(face.student_id) != "PRESENT":
                    continue

                # Determine which image this face belongs to
                img_index = getattr(face, 'image_index', None) or 0
                if img_index not in loaded_images and 0 in loaded_images:
                    img_index = 0
                if img_index not in loaded_images:
                    continue

                img, clean_rel_path = loaded_images[img_index]
                h_img, w_img = img.shape[:2]

                bx = max(0, min(w_img - 1, face.box.x))
                by = max(0, min(h_img - 1, face.box.y))
                bw = max(10, min(w_img - bx, face.box.w))
                bh = max(10, min(h_img - by, face.box.h))
                cropped = img[by:by+bh, bx:bx+bw]

                if cropped.size == 0:
                    continue

                # ── Re-run YuNet on a padded crop to recover 5-pt landmarks ──
                # This ensures active-learning embeddings use landmark alignment
                # (same path as enrollment), preventing database corruption.
                recovered_raw_face = None
                try:
                    if _face_detector.yunet_detector is not None:
                        pad = int(max(bw, bh) * 0.4)
                        px1 = max(0, bx - pad)
                        py1 = max(0, by - pad)
                        px2 = min(w_img, bx + bw + pad)
                        py2 = min(h_img, by + bh + pad)
                        padded = img[py1:py2, px1:px2]
                        ph, pw = padded.shape[:2]
                        if ph >= 32 and pw >= 32:
                            _face_detector.yunet_detector.setInputSize((pw, ph))
                            _, yunet_faces = _face_detector.yunet_detector.detect(padded)
                            if yunet_faces is not None and len(yunet_faces) > 0:
                                best = yunet_faces[0].copy()
                                # Offset landmarks back to full-image coordinates
                                best[0] += px1; best[1] += py1
                                for li in range(4, 14, 2):
                                    best[li] += px1
                                    best[li + 1] += py1
                                recovered_raw_face = best
                except Exception as _lm_err:
                    print(f"Landmark re-extraction warning (non-fatal): {_lm_err}")

                # Compute embedding using aligned path when landmarks are available
                new_emb = face_embedder.compute_embedding(
                    face_image_bgr=cropped,
                    full_image_bgr=img if recovered_raw_face is not None else None,
                    raw_face=recovered_raw_face
                )

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
        # total_enrolled = actual records saved (present + absent)
        total_cnt = present_cnt + absent_cnt
        # Fallback: count active students in this class for display accuracy
        if total_cnt == 0:
            total_cnt = db.query(Student).filter(Student.class_id == s.class_id, Student.active == True).count()

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

@router.put("/sessions/{session_id}", response_model=AttendanceSessionOut)
@router.post("/sessions/{session_id}", response_model=AttendanceSessionOut)
@router.put("/sessions/{session_id}/records", response_model=AttendanceSessionOut)
@router.post("/sessions/{session_id}/records", response_model=AttendanceSessionOut)
def update_attendance_session_records(
    session_id: int,
    req: UpdateSessionRecordsRequest,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    sub_val = token.get("sub")
    try:
        teacher_id = int(sub_val)
    except (ValueError, TypeError):
        teacher_id = session.teacher_id or 1

    # Remove existing records and replace with updated records
    db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.id).delete()

    present_cnt = 0
    absent_cnt = 0
    for rec in req.records:
        r = AttendanceRecord(
            session_id=session.id,
            student_id=rec.student_id,
            status=rec.status,
            confidence=rec.confidence,
            verification_status="TEACHER_VERIFIED"
        )
        db.add(r)
        if rec.status == "PRESENT":
            present_cnt += 1
        else:
            absent_cnt += 1

        # Audit log
        try:
            audit = AttendanceAuditLog(
                session_id=session.id,
                student_id=rec.student_id,
                teacher_id=teacher_id,
                original_status="PRESENT" if rec.status == "ABSENT" else "ABSENT",
                original_score=rec.confidence,
                final_status=rec.status,
                reason="Manual teacher / admin edit from dossier"
            )
            db.add(audit)
        except Exception:
            pass

    db.commit()
    db.refresh(session)

    # Re-generate Excel report
    try:
        excel_service.generate_class_attendance_excel(db, session.class_id, session.subject_id)
    except Exception:
        pass

    # Build response
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
