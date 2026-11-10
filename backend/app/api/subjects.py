from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Subject, User
from app.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectOut
from app.core.security import get_current_user_token

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectOut])
def get_subjects(class_id: Optional[int] = None, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    from app.models.models import Class
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None

    query = db.query(Subject)
    if class_id:
        target_cls = db.query(Class).filter(Class.id == class_id).first()
        if not target_cls:
            raise HTTPException(status_code=404, detail="Class not found")
        if caller and caller.role in ("TEACHER", "INSTITUTION_ADMIN") and caller.institution_id:
            if target_cls.institution_id and target_cls.institution_id != caller.institution_id:
                raise HTTPException(status_code=403, detail="Access denied for this institution.")
        if caller and caller.role == "TEACHER" and caller.assigned_classes is not None:
            if class_id not in (caller.assigned_classes or []):
                raise HTTPException(status_code=403, detail="You are not assigned to this class.")
        query = query.filter(Subject.class_id == class_id)
    elif caller and caller.role == "TEACHER":
        if caller.assigned_classes and len(caller.assigned_classes) > 0:
            query = query.filter(
                Subject.class_id.in_(caller.assigned_classes),
                Subject.institution_id == caller.institution_id
            )
        else:
            return []
    elif caller and caller.role == "INSTITUTION_ADMIN" and caller.institution_id:
        query = query.filter(Subject.institution_id == caller.institution_id)
    return query.all()

@router.post("", response_model=SubjectOut)
def create_subject(req: SubjectCreate, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    from app.models.models import Class
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None

    cls = db.query(Class).filter(Class.id == req.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Selected class not found")
    if caller and caller.role in ("TEACHER", "INSTITUTION_ADMIN") and caller.institution_id:
        if cls.institution_id and cls.institution_id != caller.institution_id:
            raise HTTPException(status_code=403, detail="Cannot create subject for a class outside your institution.")
        if caller.role == "TEACHER" and caller.assigned_classes is not None and req.class_id not in (caller.assigned_classes or []):
            raise HTTPException(status_code=403, detail="You are not assigned to this class.")

    subject = Subject(
        name=req.name.strip(),
        code=req.code.strip(),
        class_id=req.class_id,
        institution_id=cls.institution_id or (caller.institution_id if caller else 1)
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

def _get_scoped_subject(subject_id: int, token: dict, db: Session) -> Subject:
    caller_id = token.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None
    if not caller:
        raise HTTPException(status_code=401, detail="Invalid user.")
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if caller.role in ("TEACHER", "INSTITUTION_ADMIN") and caller.institution_id and subject.institution_id and subject.institution_id != caller.institution_id:
        raise HTTPException(status_code=403, detail="Access denied for this institution.")
    return subject

@router.put("/{subject_id}", response_model=SubjectOut)
@router.patch("/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: int,
    req: SubjectUpdate,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    subject = _get_scoped_subject(subject_id, token, db)

    if req.name is not None:
        subject.name = req.name
    if req.code is not None:
        subject.code = req.code
    if req.class_id is not None:
        subject.class_id = req.class_id

    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    subject = _get_scoped_subject(subject_id, token, db)
    db.delete(subject)
    db.commit()
    return {"message": f"Subject '{subject.name}' successfully deleted."}
