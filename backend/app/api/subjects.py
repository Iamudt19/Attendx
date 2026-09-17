from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Subject
from app.schemas.schemas import SubjectCreate, SubjectOut
from app.core.security import get_current_user_token

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectOut])
def get_subjects(class_id: Optional[int] = None, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    query = db.query(Subject)
    if class_id:
        query = query.filter(Subject.class_id == class_id)
    return query.all()

@router.post("", response_model=SubjectOut)
def create_subject(req: SubjectCreate, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    subject = Subject(
        name=req.name,
        code=req.code,
        class_id=req.class_id
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject
