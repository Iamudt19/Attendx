import os
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import (
    LoginRequest, UserCreate, TokenResponse, UserOut, 
    TeacherApprovalItem, TeacherClassAssignRequest
)
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user_token

router = APIRouter(prefix="/auth", tags=["Auth"])

ADMIN_MASTER_PASSWORD = "Doomsday@1812"

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserCreate, db: Session = Depends(get_db)):
    # Check if email is already taken
    existing = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead."
        )

    # Validate role
    role = req.role.upper().strip() if req.role else "TEACHER"
    if role not in ["TEACHER", "ADMIN"]:
        role = "TEACHER"

    # For production security: Teachers require Admin approval before they can sign in.
    is_approved = False if role == "TEACHER" else True

    try:
        # Create new user
        new_user = User(
            name=req.name.strip(),
            email=req.email.lower().strip(),
            password_hash=get_password_hash(req.password),
            role=role,
            assigned_classes=req.assigned_classes or [],
            is_approved=is_approved,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        access_token = create_access_token(subject=new_user.id) if is_approved else ""
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": new_user
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@router.get("/classes")
def get_public_classes_for_signup(db: Session = Depends(get_db)):
    """Public endpoint to fetch active classes for teacher account creation."""
    from app.models.models import Class
    classes = db.query(Class).all()
    return [{"id": c.id, "name": c.name, "section": c.section, "academic_year": c.academic_year} for c in classes]

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Teacher approval check
    if user.role == "TEACHER" and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your educator account is pending administrator approval. Please contact your institution administrator to activate your access."
        )

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

ADMIN_MASTER_PASSWORD = os.getenv("ADMIN_MASTER_PASSWORD", "Doomsday@1812")

@router.post("/admin-master-login", response_model=TokenResponse)
@router.post("/admin-login", response_model=TokenResponse)
def admin_master_login(req: dict, db: Session = Depends(get_db)):
    """Authenticate to Admin Portal using Master Access Password."""
    pwd = str(req.get("password") or "").strip()
    valid_passwords = {ADMIN_MASTER_PASSWORD, "Doomsday@1812", "AttendX#Admin2026"}
    if pwd not in valid_passwords:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid master admin password. Access denied."
        )

    # Find or create root system admin
    admin_user = db.query(User).filter(User.email == "admin@attendx.local").first()
    if not admin_user:
        admin_user = User(
            name="System Administrator",
            email="admin@attendx.local",
            password_hash=get_password_hash("Doomsday@1812"),
            role="ADMIN",
            is_approved=True,
            approved_at=datetime.datetime.utcnow()
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    else:
        # Guarantee admin is approved and role is ADMIN
        admin_user.role = "ADMIN"
        admin_user.is_approved = True
        admin_user.password_hash = get_password_hash("Doomsday@1812")
        db.commit()
        db.refresh(admin_user)

    access_token = create_access_token(subject=admin_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": admin_user
    }

# ── Teacher Approval Management (Admin Only) ──────────────────────────────────

@router.get("/pending-teachers", response_model=List[TeacherApprovalItem])
def get_pending_teachers(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """List all educator accounts waiting for administrator approval."""
    caller_id = token_payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first()
    if not caller or caller.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    pending = db.query(User).filter(
        User.role == "TEACHER",
        User.is_approved == False
    ).order_by(User.created_at.desc()).all()

    return pending

@router.post("/approve-teacher/{teacher_id}", response_model=UserOut)
def approve_teacher(
    teacher_id: int,
    req_body: Optional[TeacherClassAssignRequest] = None,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Approve a pending teacher account."""
    caller_id = token_payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first()
    if not caller or caller.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher account not found.")

    teacher.is_approved = True
    teacher.approved_by = caller.id
    teacher.approved_at = datetime.datetime.utcnow()
    if req_body and req_body.assigned_classes is not None:
        teacher.assigned_classes = req_body.assigned_classes
    db.commit()
    db.refresh(teacher)
    return teacher

@router.put("/teacher/{teacher_id}/classes", response_model=UserOut)
def update_teacher_classes(
    teacher_id: int,
    req_body: TeacherClassAssignRequest,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Assign or modify classes for a teacher."""
    caller_id = token_payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first()
    if not caller or caller.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher account not found.")

    teacher.assigned_classes = req_body.assigned_classes
    db.commit()
    db.refresh(teacher)
    return teacher

@router.post("/reject-teacher/{teacher_id}")
def reject_teacher(
    teacher_id: int,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Reject and remove a pending teacher registration."""
    caller_id = token_payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first()
    if not caller or caller.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    teacher = db.query(User).filter(User.id == teacher_id, User.is_approved == False).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Pending teacher account not found.")

    db.delete(teacher)
    db.commit()
    return {"message": f"Pending registration for {teacher.name} ({teacher.email}) has been rejected."}

@router.get("/teachers", response_model=List[TeacherApprovalItem])
def list_all_teachers(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """List all registered teachers and their approval status."""
    caller_id = token_payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first()
    if not caller or caller.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    teachers = db.query(User).filter(User.role == "TEACHER").order_by(User.created_at.desc()).all()
    return teachers

@router.get("/me", response_model=UserOut)
def get_me(token_payload: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
