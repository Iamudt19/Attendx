from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest, UserCreate, TokenResponse, UserOut
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user_token

router = APIRouter(prefix="/auth", tags=["Auth"])

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

    # Create new user
    new_user = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        password_hash=get_password_hash(req.password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/admin-master-login", response_model=TokenResponse)
def admin_master_login(req: dict, db: Session = Depends(get_db)):
    """Authenticate to Admin Portal using Master Access Password."""
    pwd = req.get("password", "")
    if pwd != "2026/":
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
            password_hash=get_password_hash("2026/"),
            role="ADMIN"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    access_token = create_access_token(subject=admin_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": admin_user
    }

@router.get("/me", response_model=UserOut)
def get_me(token_payload: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
