from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Class, Student, User
from app.schemas.schemas import ClassCreate, ClassUpdate, ClassOut, StudentOut
from app.core.security import get_current_user_token

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("/public", response_model=List[ClassOut])
def get_public_classes(institution_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Public unauthenticated list of classes for registration."""
    query = db.query(Class)
    if institution_id:
        query = query.filter(Class.institution_id == institution_id)
    classes = query.all()
    results = []
    for c in classes:
        student_count = db.query(Student).filter(Student.class_id == c.id, Student.active == True, Student.is_deleted == False).count()
        c_out = ClassOut.model_validate(c)
        c_out.student_count = student_count
        results.append(c_out)
    return results

@router.get("", response_model=List[ClassOut])
def get_classes(db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None

    query = db.query(Class)
    if caller and caller.role == "TEACHER":
        if caller.assigned_classes and len(caller.assigned_classes) > 0:
            query = query.filter(
                Class.id.in_(caller.assigned_classes),
                Class.institution_id == caller.institution_id
            )
        else:
            return [] # Teacher has no assigned classes yet
    elif caller and caller.role == "INSTITUTION_ADMIN" and caller.institution_id:
        query = query.filter(Class.institution_id == caller.institution_id)

    classes = query.all()
    results = []
    for c in classes:
        student_count = db.query(Student).filter(Student.class_id == c.id, Student.active == True, Student.is_deleted == False).count()
        c_out = ClassOut.model_validate(c)
        c_out.student_count = student_count
        results.append(c_out)
    return results

@router.post("", response_model=ClassOut)
def create_class(req: ClassCreate, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    inst_id = caller.institution_id
    if not inst_id:
        if caller.role in ("ADMIN", "SUPER_ADMIN"):
            inst_id = 1
        else:
            raise HTTPException(status_code=400, detail="Account must belong to an institution to create classes.")

    cls = Class(
        name=req.name.strip(),
        section=req.section.strip(),
        academic_year=req.academic_year.strip(),
        institution_id=inst_id
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    cls_out = ClassOut.model_validate(cls)
    cls_out.student_count = 0
    return cls_out

def _get_scoped_class(class_id: int, token: dict, db: Session, require_admin: bool = False) -> Class:
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None
    if not caller:
        raise HTTPException(status_code=401, detail="Invalid user.")
    if require_admin and caller.role not in ("ADMIN", "SUPER_ADMIN", "INSTITUTION_ADMIN", "TEACHER"):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if caller.role in ("TEACHER", "INSTITUTION_ADMIN") and caller.institution_id and cls.institution_id and cls.institution_id != caller.institution_id:
        raise HTTPException(status_code=403, detail="Access denied for this institution.")
    if caller.role == "TEACHER" and caller.assigned_classes is not None and class_id not in (caller.assigned_classes or []):
        raise HTTPException(status_code=403, detail="You are not assigned to this class.")
    return cls


@router.get("/{class_id}/students", response_model=List[StudentOut])
def get_class_students(class_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    _get_scoped_class(class_id, token, db)
    students = db.query(Student).filter(Student.class_id == class_id, Student.active == True, Student.is_deleted == False).all()
    results = []
    for s in students:
        s_out = StudentOut.model_validate(s)
        s_out.face_count = len([e for e in s.embeddings if not e.is_deleted])
        results.append(s_out)
    return results

@router.put("/{class_id}", response_model=ClassOut)
@router.patch("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    req: ClassUpdate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    cls = _get_scoped_class(class_id, token, db, require_admin=True)

    if req.name is not None:
        cls.name = req.name
    if req.section is not None:
        cls.section = req.section
    if req.academic_year is not None:
        cls.academic_year = req.academic_year

    db.commit()
    db.refresh(cls)

    student_count = db.query(Student).filter(Student.class_id == cls.id, Student.active == True, Student.is_deleted == False).count()
    cls_out = ClassOut.model_validate(cls)
    cls_out.student_count = student_count
    return cls_out

@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    cls = _get_scoped_class(class_id, token, db, require_admin=True)
    db.delete(cls)
    db.commit()
    return {"message": f"Class '{cls.name}' successfully deleted."}
