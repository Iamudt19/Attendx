import os
import cv2
import numpy as np
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Student, FaceEmbedding, AttendanceRecord, AttendanceSession, User, ImmutableFaceVault
from app.schemas.schemas import StudentCreate, StudentOut, FaceRegistrationResult, StudentApprovalItem, StudentApprovalAction
from app.core.security import get_current_user_token
from app.core.storage import storage_service
from app.cv.detector import face_detector
from app.cv.embedder import face_embedder
from app.services.vault_sync import vault_sync_service

router = APIRouter(prefix="/students", tags=["Students"])

def normalize_image_url(path_str: Optional[str]) -> Optional[str]:
    if not path_str:
        return None
    p = path_str.replace("\\", "/")
    if p.startswith("http://") or p.startswith("https://") or p.startswith("data:image/"):
        return p
    if p.startswith("storage/"):
        return "/" + p
    if p.startswith("/storage/"):
        return p
    return "/storage/" + p.lstrip("/")

@router.get("", response_model=List[StudentOut])
def list_students(class_id: Optional[int] = None, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None

    query = db.query(Student).filter(Student.active == True, Student.is_deleted == False)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    elif caller and caller.role == "TEACHER" and caller.assigned_classes and len(caller.assigned_classes) > 0:
        query = query.filter(Student.class_id.in_(caller.assigned_classes))
    elif caller and caller.role == "INSTITUTION_ADMIN" and caller.institution_id:
        query = query.filter(Student.institution_id == caller.institution_id)

    students = query.order_by(Student.roll_number).all()
    results = []
    for s in students:
        s_out = StudentOut.model_validate(s)
        active_embs = [emb for emb in s.embeddings if not emb.is_deleted]
        s_out.face_count = len(active_embs)
        
        imgs = []
        for emb in active_embs:
            if emb.image_base64:
                imgs.append(emb.image_base64)
            elif emb.source_image:
                imgs.append(normalize_image_url(emb.source_image))
            else:
                imgs.append(f"/api/students/faces/{emb.id}/image")
        s_out.face_images = [img for img in imgs if img]
        s_out.avatar_url = s_out.face_images[0] if len(s_out.face_images) > 0 else None

        # Calculate overall attendance %
        total = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id, AttendanceRecord.is_deleted == False).count()
        if total > 0:
            present = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id, AttendanceRecord.status == "PRESENT", AttendanceRecord.is_deleted == False).count()
            s_out.attendance_percentage = round((present / total) * 100.0, 1)
        else:
            s_out.attendance_percentage = 100.0

        results.append(s_out)
    return results

@router.post("", response_model=StudentOut)
def create_student(req: StudentCreate, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    existing = db.query(Student).filter(Student.student_id == req.student_id).first()
    if existing:
        if existing.is_deleted:
            # Student was previously soft-deleted, restore them
            existing.is_deleted = False
            existing.active = True
            existing.name = req.name
            existing.roll_number = req.roll_number
            existing.class_id = req.class_id
            existing.institution_id = req.institution_id or 1
            existing.email = req.email
            db.commit()
            db.refresh(existing)
            # Rehydrate from vault if needed
            vault_sync_service.recover_embeddings_from_vault(db, existing.id)
            s_out = StudentOut.model_validate(existing)
            s_out.face_count = len([e for e in existing.embeddings if not e.is_deleted])
            s_out.attendance_percentage = 100.0
            s_out.avatar_url = None
            s_out.face_images = []
            return s_out
        else:
            raise HTTPException(status_code=400, detail=f"Student ID {req.student_id} already exists")

    from app.core.security import get_password_hash
    student = Student(
        student_id=req.student_id,
        name=req.name,
        roll_number=req.roll_number,
        class_id=req.class_id,
        institution_id=req.institution_id or 1,
        email=req.email,
        password_hash=get_password_hash(req.student_id),
        active=True,
        is_deleted=False
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    vault_sync_service.log_event("STUDENT_CREATED", {
        "student_id": student.student_id,
        "name": student.name,
        "class_id": student.class_id
    })

    s_out = StudentOut.model_validate(student)
    s_out.face_count = 0
    s_out.attendance_percentage = 100.0
    s_out.avatar_url = None
    s_out.face_images = []
    return s_out

@router.get("/{student_id}", response_model=StudentOut)
def get_student_detail(student_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    student = db.query(Student).filter(Student.id == student_id, Student.is_deleted == False).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    s_out = StudentOut.model_validate(student)
    active_embs = [emb for emb in student.embeddings if not emb.is_deleted]
    s_out.face_count = len(active_embs)

    imgs = []
    for emb in active_embs:
        if emb.image_base64:
            imgs.append(emb.image_base64)
        elif emb.source_image:
            imgs.append(normalize_image_url(emb.source_image))
        else:
            imgs.append(f"/api/students/faces/{emb.id}/image")
    s_out.face_images = [img for img in imgs if img]
    s_out.avatar_url = s_out.face_images[0] if len(s_out.face_images) > 0 else None

    total = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id, AttendanceRecord.is_deleted == False).count()
    if total > 0:
        present = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id, AttendanceRecord.status == "PRESENT", AttendanceRecord.is_deleted == False).count()
        s_out.attendance_percentage = round((present / total) * 100.0, 1)
    else:
        s_out.attendance_percentage = 100.0

    return s_out


def _get_student_with_scope(student_id: int, token: dict, db: Session) -> tuple[Optional[User], Student]:
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if caller and caller.role == "INSTITUTION_ADMIN" and caller.institution_id and student.institution_id != caller.institution_id:
        raise HTTPException(status_code=403, detail="You can only manage students in your own institution.")
    return caller, student


@router.post("/{student_id}/face-images", response_model=FaceRegistrationResult)
def upload_student_face_images(
    student_id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db), 
    token: dict = Depends(get_current_user_token)
):
    _, student = _get_student_with_scope(student_id, token, db)

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

        # Generate base64 thumbnail to store alongside the embedding
        b64_thumbnail = vault_sync_service.encode_face_to_base64(cropped)

        # Reset file seek for saving
        file.file.seek(0)
        saved_rel_path = storage_service.save_file(file, subfolder=f"students/{student.id}")

        face_emb_record = FaceEmbedding(
            student_id=student.id,
            embedding=embedding,
            source_image=saved_rel_path,
            image_base64=b64_thumbnail,
            angle_label="reference",
            source="manual_upload",
            is_deleted=False
        )
        db.add(face_emb_record)

        # Save a permanent copy in the vault
        vault_sync_service.archive_face(
            db=db,
            student=student,
            embedding=embedding,
            image_base64=b64_thumbnail,
            source_image=saved_rel_path,
            angle_label="reference",
            source="manual_upload"
        )
        registered_count += 1

    db.commit()
    db.refresh(student)

    # Update local snapshot
    try:
        vault_sync_service.run_snapshot_backup(db)
    except Exception:
        pass

    total_faces = len([e for e in student.embeddings if not e.is_deleted])
    return FaceRegistrationResult(
        student_id=student.id,
        registered_images=registered_count,
        message=f"Successfully registered {registered_count} face embedding(s). Total embeddings stored: {total_faces}.",
        warnings=warnings
    )

@router.delete("/{student_id}/face-data")
def delete_student_face_data(student_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    """Soft-delete active face embeddings for a student while keeping vault backup records."""
    _, student = _get_student_with_scope(student_id, token, db)

    embeddings = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_deleted == False
    ).all()
    count = len(embeddings)

    for emb in embeddings:
        emb.is_deleted = True
        emb.deleted_at = datetime.utcnow()

    student.face_registration_complete = False
    db.commit()

    try:
        vault_sync_service.log_event("FACE_DATA_DEACTIVATED", {
            "student_id": student.student_id,
            "deactivated_count": count
        })
        vault_sync_service.run_snapshot_backup(db)
    except Exception:
        pass

    return {"message": f"Deactivated {count} face records for student {student.name}."}

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    """Soft-delete a student profile while preserving history and vault records."""
    _, student = _get_student_with_scope(student_id, token, db)
    
    student.active = False
    student.is_deleted = True
    student.deleted_at = datetime.utcnow()

    for emb in student.embeddings:
        emb.is_deleted = True
        emb.deleted_at = datetime.utcnow()
    
    db.commit()

    try:
        vault_sync_service.log_event("STUDENT_SOFT_DELETED", {
            "student_id": student.student_id,
            "name": student.name
        })
        vault_sync_service.run_snapshot_backup(db)
    except Exception:
        pass

    return {"message": f"Student '{student.name}' archived."}

@router.post("/{student_id}/restore")
def restore_student(student_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    """Restore a soft-deleted student and recover embeddings from the vault."""
    _, student = _get_student_with_scope(student_id, token, db)

    student.active = True
    student.is_deleted = False
    student.deleted_at = None

    for emb in student.embeddings:
        emb.is_deleted = False
        emb.deleted_at = None

    # Recover from vault if active embeddings are missing
    active_embs = [e for e in student.embeddings if not e.is_deleted]
    if len(active_embs) == 0:
        recovered = vault_sync_service.recover_embeddings_from_vault(db, student.id)
        if recovered:
            student.face_registration_complete = True

    db.commit()
    vault_sync_service.log_event("STUDENT_RESTORED", {"student_id": student.student_id})
    return {"message": f"Student '{student.name}' restored."}

@router.get("/faces/{emb_id}/image")
def get_face_embedding_image(emb_id: int, db: Session = Depends(get_db)):
    """Return face image from local disk, DB base64 thumbnail, or vault."""
    emb = db.query(FaceEmbedding).filter(FaceEmbedding.id == emb_id).first()
    if not emb:
        raise HTTPException(status_code=404, detail="Face embedding not found")

    # 1. Local disk file
    if emb.source_image:
        full_path = storage_service.get_full_path(emb.source_image)
        if os.path.exists(full_path):
            return FileResponse(full_path, media_type="image/jpeg")

    # 2. In-database Base64 thumbnail
    if emb.image_base64:
        raw_b64 = emb.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        import base64
        img_bytes = base64.b64decode(raw_b64)
        return Response(content=img_bytes, media_type="image/jpeg")

    # 3. ImmutableFaceVault
    vault_item = db.query(ImmutableFaceVault).filter(ImmutableFaceVault.student_db_id == emb.student_id).first()
    if vault_item and vault_item.image_base64:
        raw_b64 = vault_item.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        import base64
        img_bytes = base64.b64decode(raw_b64)
        return Response(content=img_bytes, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Image thumbnail not available")

# ── Hierarchical Student Enrollment Approval Flow ─────────────────────────────

@router.get("/pending-approval", response_model=List[StudentApprovalItem])
def get_pending_students(
    class_id: Optional[int] = None, 
    token: dict = Depends(get_current_user_token), 
    db: Session = Depends(get_db)
):
    """List student accounts waiting for educator approval into class rosters."""
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None

    query = db.query(Student).filter(Student.approval_status == "PENDING_APPROVAL")
    if class_id:
        query = query.filter(Student.class_id == class_id)
    elif caller and caller.role == "TEACHER" and caller.assigned_classes and len(caller.assigned_classes) > 0:
        query = query.filter(Student.class_id.in_(caller.assigned_classes))
    elif caller and caller.institution_id:
        query = query.filter(Student.institution_id == caller.institution_id)

    pending = query.order_by(Student.created_at.desc()).all()
    results = []
    for s in pending:
        c = s.class_obj
        results.append(StudentApprovalItem(
            id=s.id,
            student_id=s.student_id,
            name=s.name,
            roll_number=s.roll_number,
            class_id=s.class_id,
            class_name=c.name if c else None,
            section=c.section if c else None,
            institution_id=s.institution_id,
            email=s.email,
            approval_status=s.approval_status,
            face_registration_complete=s.face_registration_complete,
            created_at=s.created_at
        ))
    return results

@router.post("/{student_id}/approve")
def approve_student_enrollment(
    student_id: int, 
    token: dict = Depends(get_current_user_token), 
    db: Session = Depends(get_db)
):
    """Educator: Approve a student's enrollment into the class roster."""
    caller, student = _get_student_with_scope(student_id, token, db)

    student.approval_status = "APPROVED"
    student.approved_by_teacher_id = caller.id if caller else None
    student.active = True
    db.commit()
    return {
        "status": "success",
        "message": f"Student '{student.name}' ({student.roll_number}) approved into class roster.",
        "student_id": student.id
    }

@router.post("/{student_id}/reject")
def reject_student_enrollment(
    student_id: int, 
    action_req: Optional[StudentApprovalAction] = None,
    token: dict = Depends(get_current_user_token), 
    db: Session = Depends(get_db)
):
    """Educator: Reject or remove a student from the class roster."""
    _, student = _get_student_with_scope(student_id, token, db)

    student.approval_status = "REJECTED"
    student.active = False
    db.commit()
    return {
        "status": "success",
        "message": f"Student '{student.name}' enrollment marked as REJECTED.",
        "student_id": student.id
    }
