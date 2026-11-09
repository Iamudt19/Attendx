import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Institution, User, Class, Student, SystemHeartbeat
from app.schemas.schemas import (
    InstitutionOut, InstitutionRegisterRequest, InstitutionApproveAction,
    SystemHeartbeatOut
)
from app.core.security import get_password_hash, get_current_user_token

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_institution(req: InstitutionRegisterRequest, db: Session = Depends(get_db)):
    """Public portal: Register a new academic institution and its primary administrator account."""
    code = req.institution_code.strip().upper()
    email = req.official_email.strip().lower()
    admin_email = req.admin_email.strip().lower()

    # Check for existing institution code or email
    if db.query(Institution).filter(func.upper(Institution.code) == code).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An institution with code '{code}' is already registered."
        )

    if db.query(Institution).filter(func.lower(Institution.official_email) == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An institution with official email '{email}' is already registered."
        )

    # Check for existing admin user email
    if db.query(User).filter(func.lower(User.email) == admin_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A user account with email '{admin_email}' already exists. Please use a unique administrative email."
        )

    try:
        # Create Institution in PENDING_APPROVAL state
        institution = Institution(
            name=req.institution_name.strip(),
            code=code,
            official_email=email,
            domain=req.domain.strip() if req.domain else None,
            address=req.address.strip() if req.address else None,
            status="PENDING_APPROVAL",
            created_at=datetime.datetime.utcnow()
        )
        db.add(institution)
        db.flush() # Flush to get institution.id

        # Create Institution Administrator in PENDING_APPROVAL state
        admin_user = User(
            name=req.admin_name.strip(),
            email=admin_email,
            password_hash=get_password_hash(req.admin_password),
            role="INSTITUTION_ADMIN",
            institution_id=institution.id,
            is_approved=False,
            status="PENDING_APPROVAL",
            created_at=datetime.datetime.utcnow()
        )
        db.add(admin_user)
        db.commit()

        return {
            "status": "success",
            "message": f"Institution '{institution.name}' successfully submitted for verification. Institutional Super Admin approval is required before your administrator and educator portals activate.",
            "institution_id": institution.id,
            "institution_code": institution.code
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.get("", response_model=List[InstitutionOut])
def get_approved_institutions(db: Session = Depends(get_db)):
    """Public endpoint to fetch all verified and approved institutions (for Teacher & Student dropdowns)."""
    institutions = db.query(Institution).filter(Institution.status == "APPROVED").order_by(Institution.name).all()
    out = []
    for inst in institutions:
        t_cnt = db.query(User).filter(User.institution_id == inst.id, User.role == "TEACHER").count()
        s_cnt = db.query(Student).filter(Student.institution_id == inst.id).count()
        c_cnt = db.query(Class).filter(Class.institution_id == inst.id).count()
        out.append(InstitutionOut(
            id=inst.id,
            name=inst.name,
            code=inst.code,
            official_email=inst.official_email,
            domain=inst.domain,
            address=inst.address,
            status=inst.status,
            created_at=inst.created_at,
            approved_at=inst.approved_at,
            approved_by=inst.approved_by,
            teacher_count=t_cnt,
            student_count=s_cnt,
            class_count=c_cnt
        ))
    return out

@router.get("/pending", response_model=List[InstitutionOut])
def get_pending_institutions(token_payload: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    """Super Admin Desk: Fetch all institutions awaiting verification and approval."""
    institutions = db.query(Institution).filter(Institution.status == "PENDING_APPROVAL").order_by(Institution.created_at.desc()).all()
    out = []
    for inst in institutions:
        out.append(InstitutionOut(
            id=inst.id,
            name=inst.name,
            code=inst.code,
            official_email=inst.official_email,
            domain=inst.domain,
            address=inst.address,
            status=inst.status,
            created_at=inst.created_at,
            approved_at=inst.approved_at,
            approved_by=inst.approved_by,
            teacher_count=0,
            student_count=0,
            class_count=0
        ))
    return out

@router.put("/{institution_id}/approve")
def approve_institution(institution_id: int, token_payload: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    """Super Admin: Approve a pending institution and immediately activate its Institution Admin."""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    inst.status = "APPROVED"
    inst.approved_at = datetime.datetime.utcnow()
    inst.approved_by = "SUPER_ADMIN"

    # Automatically activate institution administrators for this campus
    admins = db.query(User).filter(User.institution_id == inst.id, User.role == "INSTITUTION_ADMIN").all()
    for adm in admins:
        adm.is_approved = True
        adm.status = "APPROVED"
        adm.approved_at = datetime.datetime.utcnow()

    db.commit()
    return {
        "status": "success",
        "message": f"Institution '{inst.name}' has been officially verified and approved. Its administrators can now log in.",
        "institution_id": inst.id
    }

@router.put("/{institution_id}/reject")
def reject_institution(institution_id: int, action_req: Optional[InstitutionApproveAction] = None, token_payload: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    """Super Admin: Reject or suspend an institution."""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    target_status = action_req.action.upper() if action_req and action_req.action else "REJECTED"
    if target_status not in ["REJECTED", "SUSPENDED"]:
        target_status = "REJECTED"

    inst.status = target_status
    # Deactivate admins
    admins = db.query(User).filter(User.institution_id == inst.id).all()
    for adm in admins:
        adm.is_approved = False
        adm.status = target_status

    db.commit()
    return {
        "status": "success",
        "message": f"Institution '{inst.name}' marked as {target_status}.",
        "institution_id": inst.id
    }

@router.get("/{institution_id}/classes")
def get_institution_classes(institution_id: int, db: Session = Depends(get_db)):
    """Public endpoint: Return class sections belonging to a specific institution."""
    classes = db.query(Class).filter(Class.institution_id == institution_id).all()
    return [{"id": c.id, "name": c.name, "section": c.section, "academic_year": c.academic_year} for c in classes]

# ── Telemetry & Anti-Pause Heartbeats ─────────────────────────────────────────

@router.get("/telemetry/heartbeats", response_model=List[SystemHeartbeatOut])
def get_system_heartbeats(limit: int = 10, db: Session = Depends(get_db)):
    """Return recent database keep-alive heartbeats."""
    beats = db.query(SystemHeartbeat).order_by(SystemHeartbeat.pinged_at.desc()).limit(limit).all()
    return beats

@router.post("/telemetry/heartbeat")
def trigger_keep_alive_heartbeat(db: Session = Depends(get_db)):
    """Record a fresh keep-alive heartbeat in the database."""
    import time
    start = time.time()
    latency = round((time.time() - start) * 1000, 2)
    beat = SystemHeartbeat(
        worker_id="web-keep-alive-api",
        pinged_at=datetime.datetime.utcnow(),
        status="HEALTHY",
        latency_ms=latency
    )
    db.add(beat)
    db.commit()
    db.refresh(beat)
    return {
        "status": "ok",
        "message": "Keep-alive transaction recorded. Supabase inactivity timer refreshed.",
        "heartbeat_id": beat.id,
        "pinged_at": beat.pinged_at.isoformat()
    }

