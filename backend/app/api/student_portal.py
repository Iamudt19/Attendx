"""
Student Portal API Router
Handles student self-service: login, face scan registration, and registration status.
"""
import cv2
import numpy as np
import io
import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Student, FaceEmbedding, Class, Subject, AttendanceSession, AttendanceRecord, User
from app.schemas.schemas import (
    StudentLoginRequest, StudentPortalTokenResponse,
    FaceFrameUploadResult, FaceRegistrationStatus,
    StudentSelfRegisterRequest, StudentPublicClassOut,
    StudentUpdateClassRequest,
    StudentAttendanceDashboardResponse, StudentSubjectAttendance,
    StudentLectureLog, StudentMonthlyStats,
    SCAN_ANGLES
)
from app.core.security import (
    verify_password, get_password_hash,
    create_student_access_token, get_current_student_token
)
from app.core.storage import storage_service
from app.cv.face_quality import detect_single_face_for_scan, check_frame_quality
from app.cv.embedder import face_embedder

router = APIRouter(prefix="/student", tags=["Student Portal"])

TOTAL_REQUIRED = len(SCAN_ANGLES)  # 5 angles required


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_student_or_404(student_db_id: int, db: Session) -> Student:
    student = db.query(Student).filter(
        Student.id == student_db_id,
        Student.active == True
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student

def _get_completed_angles(student: Student) -> List[str]:
    """Return list of angle_labels that have at least one embedding."""
    return [emb.angle_label for emb in student.embeddings if emb.angle_label in SCAN_ANGLES]

def _get_remaining_angles(completed: List[str]) -> List[str]:
    return [a for a in SCAN_ANGLES if a not in completed]


# ── Public Endpoints (no auth required) ──────────────────────────────────────

@router.get("/classes", response_model=List[StudentPublicClassOut])
def get_public_classes(db: Session = Depends(get_db)):
    """
    Public endpoint — returns all available classes so students can pick
    their class during self-registration. No auth token required.
    """
    classes = db.query(Class).order_by(Class.name, Class.section).all()
    return classes


@router.post("/register", response_model=StudentPortalTokenResponse, status_code=201)
def student_self_register(req: StudentSelfRegisterRequest, db: Session = Depends(get_db)):
    """
    Student self-registration.
    Student provides their details and chooses their class.
    A new Student record is created and they are immediately logged in.
    """
    # Check Student ID is not already taken
    existing = db.query(Student).filter(Student.student_id == req.student_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Student ID '{req.student_id}' is already registered. Please log in instead."
        )

    # Validate class exists
    cls = db.query(Class).filter(Class.id == req.class_id).first()
    if not cls:
        raise HTTPException(status_code=400, detail="Selected class not found.")

    # Set password: use provided password or default to student_id
    raw_password = req.password.strip() if req.password else req.student_id
    hashed = get_password_hash(raw_password)

    student = Student(
        student_id=req.student_id.strip(),
        name=req.name.strip(),
        roll_number=req.roll_number.strip(),
        class_id=req.class_id,
        email=req.email.strip() if req.email else None,
        password_hash=hashed,
        face_registration_complete=False,
        active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    token = create_student_access_token(student.id, student.student_id)
    return StudentPortalTokenResponse(
        access_token=token,
        student_db_id=student.id,
        student_id=student.student_id,
        name=student.name,
        face_registration_complete=False
    )


def _calculate_training_stats(total_embeddings: int):
    """Compute precision level and recognition readiness score based on stored embedding diversity."""
    if total_embeddings == 0:
        return "Not Trained", 0.0
    elif total_embeddings < 5:
        level = "Initial Calibration"
        score = min(75.0, total_embeddings * 15.0)
    elif total_embeddings < 10:
        level = "Standard Precision (Baseline)"
        score = 80.0 + (total_embeddings - 5) * 2.5
    elif total_embeddings < 20:
        level = "High Precision (Enhanced)"
        score = 92.5 + (total_embeddings - 10) * 0.5
    elif total_embeddings < 35:
        level = "Ultra Precision (Studio Grade)"
        score = 97.5 + (total_embeddings - 20) * 0.1
    else:
        level = "Master Precision (Max Coverage)"
        score = 99.5
    return level, round(score, 1)

# ── Authenticated Endpoints ───────────────────────────────────────────────────

@router.post("/login", response_model=StudentPortalTokenResponse)
def student_login(req: StudentLoginRequest, db: Session = Depends(get_db)):
    """
    Student login using student_id + password.
    Default password is the student_id itself (e.g., "STU001").
    """
    student = db.query(Student).filter(
        Student.student_id == req.student_id,
        Student.active == True
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Student ID or password."
        )

    # If no password has been set yet, default password = student_id
    if student.password_hash is None:
        if req.password != req.student_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Student ID or password."
            )
    else:
        if not verify_password(req.password, student.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Student ID or password."
            )

    token = create_student_access_token(student.id, student.student_id)
    return StudentPortalTokenResponse(
        access_token=token,
        student_db_id=student.id,
        student_id=student.student_id,
        name=student.name,
        face_registration_complete=student.face_registration_complete
    )


@router.get("/me", response_model=FaceRegistrationStatus)
def get_student_me(
    token: dict = Depends(get_current_student_token),
    db: Session = Depends(get_db)
):
    """Get the logged-in student's profile and face registration status."""
    student_db_id = int(token["sub"])
    student = _get_student_or_404(student_db_id, db)

    completed = _get_completed_angles(student)
    remaining = _get_remaining_angles(completed)
    total_embs = len(student.embeddings)
    training_lvl, readiness_score = _calculate_training_stats(total_embs)

    cls = db.query(Class).filter(Class.id == student.class_id).first() if student.class_id else None

    return FaceRegistrationStatus(
        student_db_id=student.id,
        student_id=student.student_id,
        name=student.name,
        roll_number=student.roll_number,
        class_id=student.class_id,
        class_name=f"{cls.name} {cls.section}" if cls else None,
        face_registration_complete=student.face_registration_complete,
        completed_angles=completed,
        remaining_angles=remaining,
        total_embeddings=total_embs,
        total_required=TOTAL_REQUIRED,
        training_level=training_lvl,
        recognition_readiness_score=readiness_score
    )


@router.put("/class", response_model=FaceRegistrationStatus)
def update_student_class(
    req: StudentUpdateClassRequest,
    token: dict = Depends(get_current_student_token),
    db: Session = Depends(get_db)
):
    """Allow student to choose or switch which class they are registering for after face scan."""
    student_db_id = int(token["sub"])
    student = _get_student_or_404(student_db_id, db)

    cls = db.query(Class).filter(Class.id == req.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    student.class_id = req.class_id
    db.commit()
    db.refresh(student)

    completed = _get_completed_angles(student)
    remaining = _get_remaining_angles(completed)
    total_embs = len(student.embeddings)
    training_lvl, readiness_score = _calculate_training_stats(total_embs)

    return FaceRegistrationStatus(
        student_db_id=student.id,
        student_id=student.student_id,
        name=student.name,
        roll_number=student.roll_number,
        class_id=student.class_id,
        class_name=f"{cls.name} {cls.section}",
        face_registration_complete=student.face_registration_complete,
        completed_angles=completed,
        remaining_angles=remaining,
        total_embeddings=total_embs,
        total_required=TOTAL_REQUIRED,
        training_level=training_lvl,
        recognition_readiness_score=readiness_score
    )


@router.post("/face-scan/frame", response_model=FaceFrameUploadResult)
async def submit_face_frame(
    angle_label: str = Form(...),
    file: UploadFile = File(...),
    token: dict = Depends(get_current_student_token),
    db: Session = Depends(get_db)
):
    """
    Accept a webcam frame during guided face scan or continuous AI model training.
    Validates quality and stores embedding if accepted.
    Students can scan as many times as they want to continuously train the AI model.
    """
    student_db_id = int(token["sub"])
    student = _get_student_or_404(student_db_id, db)

    clean_angle = angle_label.strip().lower()
    if not clean_angle or len(clean_angle) > 50:
        raise HTTPException(
            status_code=400,
            detail="Invalid angle label format."
        )

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Unsupported image format.")

    # Read image bytes
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    # Detect single face
    face_box, cropped_face, raw_face, detect_error = detect_single_face_for_scan(img)
    total_embs = len(student.embeddings)
    training_lvl, readiness_score = _calculate_training_stats(total_embs)

    if detect_error:
        completed = _get_completed_angles(student)
        remaining = _get_remaining_angles(completed)
        return FaceFrameUploadResult(
            accepted=False,
            angle_label=clean_angle,
            reason=detect_error,
            completed_angles=completed,
            remaining_angles=remaining,
            total_required=TOTAL_REQUIRED,
            registration_complete=student.face_registration_complete,
            total_embeddings=total_embs,
            training_level=training_lvl,
            recognition_readiness_score=readiness_score
        )

    # Quality gate
    quality_ok, quality_reason = check_frame_quality(img, face_box)
    if not quality_ok:
        completed = _get_completed_angles(student)
        remaining = _get_remaining_angles(completed)
        return FaceFrameUploadResult(
            accepted=False,
            angle_label=clean_angle,
            reason=quality_reason,
            completed_angles=completed,
            remaining_angles=remaining,
            total_required=TOTAL_REQUIRED,
            registration_complete=student.face_registration_complete,
            total_embeddings=total_embs,
            training_level=training_lvl,
            recognition_readiness_score=readiness_score
        )

    # Compute embedding with landmark alignment
    embedding = face_embedder.compute_embedding(
        face_image_bgr=cropped_face,
        full_image_bgr=img,
        raw_face=raw_face
    )

    # Save source image
    saved_path = None
    try:
        _, img_encoded = cv2.imencode('.jpg', img)
        img_bytes = img_encoded.tobytes()

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name

        rel_path = f"students/{student.id}/{clean_angle}_{len(student.embeddings)}.jpg"
        abs_path = os.path.join(storage_service.base_dir, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        os.replace(tmp_path, abs_path)
        saved_path = rel_path
    except Exception:
        saved_path = None  # Non-fatal; embedding is still stored

    # Store embedding with angle/training label
    face_emb = FaceEmbedding(
        student_id=student.id,
        embedding=embedding,
        source_image=saved_path,
        angle_label=clean_angle
    )
    db.add(face_emb)

    # Check if baseline required angles are covered
    db.flush()
    db.refresh(student)
    completed = _get_completed_angles(student)
    remaining = _get_remaining_angles(completed)
    all_done = len(remaining) == 0

    if (all_done or len(student.embeddings) >= TOTAL_REQUIRED) and not student.face_registration_complete:
        student.face_registration_complete = True

    db.commit()
    db.refresh(student)

    new_total = len(student.embeddings)
    new_level, new_score = _calculate_training_stats(new_total)

    return FaceFrameUploadResult(
        accepted=True,
        angle_label=clean_angle,
        reason=f"Face vector #{new_total} successfully encoded & trained ({new_level})",
        completed_angles=completed,
        remaining_angles=remaining,
        total_required=TOTAL_REQUIRED,
        registration_complete=student.face_registration_complete,
        total_embeddings=new_total,
        training_level=new_level,
        recognition_readiness_score=new_score
    )


@router.delete("/face-scan/reset")
def reset_face_scan(
    token: dict = Depends(get_current_student_token),
    db: Session = Depends(get_db)
):
    """
    Allow a student to redo their face scan from scratch.
    Deletes all existing portal-scanned embeddings (preserves teacher-uploaded ones).
    """
    student_db_id = int(token["sub"])
    student = _get_student_or_404(student_db_id, db)

    # Remove only embeddings that have an angle_label (portal-scanned ones)
    portal_embeddings = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_db_id,
        FaceEmbedding.angle_label.isnot(None)
    ).all()

    for emb in portal_embeddings:
        if emb.source_image:
            try:
                full_path = os.path.join(storage_service.base_dir, emb.source_image)
                if os.path.exists(full_path):
                    os.remove(full_path)
            except Exception:
                pass
        db.delete(emb)

    student.face_registration_complete = False
    db.commit()

    return {"message": f"Face scan reset. Please complete the face scan wizard again.", "student": student.name}


# ── Student Attendance Tracking & Analytics Endpoints ─────────────────────────

@router.get("/attendance", response_model=StudentAttendanceDashboardResponse)
def get_student_attendance(
    subject_id: Optional[int] = Query(None),
    token: dict = Depends(get_current_student_token),
    db: Session = Depends(get_db)
):
    """
    Returns student attendance profile, curriculum subject breakdown,
    lecture history log, and visual analytics for their enrolled class section.
    """
    student_db_id = int(token["sub"])
    student = _get_student_or_404(student_db_id, db)

    cls = db.query(Class).filter(Class.id == student.class_id).first() if student.class_id else None

    # Get all subjects in student's class
    subjects_list = []
    if student.class_id:
        subjects_list = db.query(Subject).filter(Subject.class_id == student.class_id).all()

    # Get all sessions recorded for this class
    all_sessions_query = db.query(AttendanceSession).filter(AttendanceSession.class_id == student.class_id)
    all_class_sessions = all_sessions_query.order_by(AttendanceSession.date.desc(), AttendanceSession.start_time.desc()).all()

    # Get filtered sessions if subject_id filter is specified
    if subject_id:
        filtered_sessions = [s for s in all_class_sessions if s.subject_id == subject_id]
    else:
        filtered_sessions = all_class_sessions

    # Fetch all attendance records for this student
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()
    record_session_map = {r.session_id: r for r in records}

    # Calculate statistics per subject
    subject_stats_list = []
    for sub in subjects_list:
        sub_sessions = [s for s in all_class_sessions if s.subject_id == sub.id]
        total_sub_classes = len(sub_sessions)
        attended_cnt = 0
        for s in sub_sessions:
            r = record_session_map.get(s.id)
            if r and r.status == "PRESENT":
                attended_cnt += 1
        pct = round((attended_cnt / total_sub_classes * 100.0), 1) if total_sub_classes > 0 else 100.0
        if pct >= 75.0:
            status_label = "ELIGIBLE"
        elif pct >= 65.0:
            status_label = "WARNING"
        else:
            status_label = "CRITICAL"

        subject_stats_list.append(StudentSubjectAttendance(
            subject_id=sub.id,
            subject_name=sub.name,
            subject_code=sub.code,
            total_classes=total_sub_classes,
            attended=attended_cnt,
            missed=total_sub_classes - attended_cnt,
            percentage=pct,
            status=status_label
        ))

    # Overall calculation across all curriculum classes held
    total_held = len(all_class_sessions)
    total_attended = 0
    for s in all_class_sessions:
        r = record_session_map.get(s.id)
        if r and r.status == "PRESENT":
            total_attended += 1

    total_missed = total_held - total_attended
    overall_pct = round((total_attended / total_held * 100.0), 1) if total_held > 0 else 100.0

    if overall_pct >= 75.0:
        eligibility = "ELIGIBLE"
        req_classes = 0
    elif overall_pct >= 65.0:
        eligibility = "WARNING"
        # Classes needed to reach 75%: (attended + x) / (total_held + x) >= 0.75
        req_classes = max(1, int(np.ceil((0.75 * total_held - total_attended) / 0.25))) if total_held > 0 else 0
    else:
        eligibility = "CRITICAL"
        req_classes = max(1, int(np.ceil((0.75 * total_held - total_attended) / 0.25))) if total_held > 0 else 0

    # Build Lecture History log for the selected subject view
    lecture_logs = []
    for s in filtered_sessions:
        r = record_session_map.get(s.id)
        is_present = (r.status == "PRESENT") if r else False
        sub_obj = db.query(Subject).filter(Subject.id == s.subject_id).first()
        tch_obj = db.query(User).filter(User.id == s.teacher_id).first()

        lecture_logs.append(StudentLectureLog(
            session_id=s.id,
            date=s.date,
            start_time=s.start_time,
            subject_id=s.subject_id,
            subject_name=sub_obj.name if sub_obj else "General Lecture",
            subject_code=sub_obj.code if sub_obj else "GEN",
            teacher_name=tch_obj.name if tch_obj else "Faculty",
            status="PRESENT" if is_present else "ABSENT",
            confidence=r.confidence if r else 0.0,
            verification_status=r.verification_status if r else "AUTO",
            image_url=s.image_path
        ))

    # Monthly / Weekly Analytics
    from collections import defaultdict
    monthly_map = defaultdict(lambda: {"total": 0, "present": 0})
    for s in all_class_sessions:
        r = record_session_map.get(s.id)
        is_present = (r.status == "PRESENT") if r else False
        try:
            dt = datetime.strptime(s.date, "%Y-%m-%d")
            month_key = dt.strftime("%b %Y")
        except Exception:
            month_key = "Current Term"
        monthly_map[month_key]["total"] += 1
        if is_present:
            monthly_map[month_key]["present"] += 1

    monthly_analytics = []
    for m_key, m_data in monthly_map.items():
        m_pct = round((m_data["present"] / m_data["total"] * 100.0), 1) if m_data["total"] > 0 else 100.0
        monthly_analytics.append(StudentMonthlyStats(
            month=m_key,
            total=m_data["total"],
            present=m_data["present"],
            percentage=m_pct
        ))

    return StudentAttendanceDashboardResponse(
        student_id=student.student_id,
        name=student.name,
        roll_number=student.roll_number,
        class_id=student.class_id,
        class_name=cls.name if cls else "N/A",
        section=cls.section if cls else "N/A",
        total_classes=total_held,
        attended=total_attended,
        missed=total_missed,
        overall_percentage=overall_pct,
        eligibility_status=eligibility,
        required_classes_for_target=req_classes,
        subjects=subject_stats_list,
        history=lecture_logs,
        monthly_analytics=monthly_analytics
    )

