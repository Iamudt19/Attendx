"""
Student Portal API Router
Handles student self-service: login, face scan registration, and registration status.
"""
import cv2
import numpy as np
import io
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Student, FaceEmbedding, Class
from app.schemas.schemas import (
    StudentLoginRequest, StudentPortalTokenResponse,
    FaceFrameUploadResult, FaceRegistrationStatus,
    StudentSelfRegisterRequest, StudentPublicClassOut,
    StudentUpdateClassRequest,
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
        total_embeddings=len(student.embeddings),
        total_required=TOTAL_REQUIRED
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
        total_embeddings=len(student.embeddings),
        total_required=TOTAL_REQUIRED
    )


@router.post("/face-scan/frame", response_model=FaceFrameUploadResult)
async def submit_face_frame(
    angle_label: str = Form(...),
    file: UploadFile = File(...),
    token: dict = Depends(get_current_student_token),
    db: Session = Depends(get_db)
):
    """
    Accept a single webcam frame for a specific angle during guided face scan.
    Validates quality and stores embedding if accepted.

    angle_label must be one of: front, left, right, chin_down, smile
    """
    student_db_id = int(token["sub"])
    student = _get_student_or_404(student_db_id, db)

    # Validate angle label
    if angle_label not in SCAN_ANGLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid angle_label '{angle_label}'. Must be one of: {SCAN_ANGLES}"
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
    if detect_error:
        completed = _get_completed_angles(student)
        remaining = _get_remaining_angles(completed)
        return FaceFrameUploadResult(
            accepted=False,
            angle_label=angle_label,
            reason=detect_error,
            completed_angles=completed,
            remaining_angles=remaining,
            total_required=TOTAL_REQUIRED,
            registration_complete=student.face_registration_complete
        )

    # Quality gate
    quality_ok, quality_reason = check_frame_quality(img, face_box)
    if not quality_ok:
        completed = _get_completed_angles(student)
        remaining = _get_remaining_angles(completed)
        return FaceFrameUploadResult(
            accepted=False,
            angle_label=angle_label,
            reason=quality_reason,
            completed_angles=completed,
            remaining_angles=remaining,
            total_required=TOTAL_REQUIRED,
            registration_complete=student.face_registration_complete
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
        # Re-encode image for storage
        _, img_encoded = cv2.imencode('.jpg', img)
        img_bytes = img_encoded.tobytes()

        # Create a temporary UploadFile-like object using BytesIO
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name

        # Store using a relative path
        rel_path = f"students/{student.id}/{angle_label}_{len(student.embeddings)}.jpg"
        abs_path = os.path.join(storage_service.base_dir, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        os.replace(tmp_path, abs_path)
        saved_path = rel_path
    except Exception:
        saved_path = None  # Non-fatal; embedding is still stored

    # Store embedding with angle label
    face_emb = FaceEmbedding(
        student_id=student.id,
        embedding=embedding,
        source_image=saved_path,
        angle_label=angle_label
    )
    db.add(face_emb)

    # Check if all required angles now have at least one embedding
    db.flush()  # so new embedding appears in student.embeddings
    db.refresh(student)
    completed = _get_completed_angles(student)
    remaining = _get_remaining_angles(completed)
    all_done = len(remaining) == 0

    if all_done and not student.face_registration_complete:
        student.face_registration_complete = True

    db.commit()
    db.refresh(student)

    return FaceFrameUploadResult(
        accepted=True,
        angle_label=angle_label,
        reason=quality_reason,
        completed_angles=completed,
        remaining_angles=remaining,
        total_required=TOTAL_REQUIRED,
        registration_complete=student.face_registration_complete
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
