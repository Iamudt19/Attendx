from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Class, Student
from app.schemas.schemas import ClassCreate, ClassOut, StudentOut
from app.core.security import get_current_user_token

router = APIRouter(prefix="/classes", tags=["Classes"])

@router.get("", response_model=List[ClassOut])
def get_classes(db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    classes = db.query(Class).all()
    results = []
    for c in classes:
        student_count = db.query(Student).filter(Student.class_id == c.id, Student.active == True).count()
        c_out = ClassOut.model_validate(c)
        c_out.student_count = student_count
        results.append(c_out)
    return results

@router.post("", response_model=ClassOut)
def create_class(req: ClassCreate, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    cls = Class(
        name=req.name,
        section=req.section,
        academic_year=req.academic_year
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    cls_out = ClassOut.model_validate(cls)
    cls_out.student_count = 0
    return cls_out

@router.get("/{class_id}/students", response_model=List[StudentOut])
def get_class_students(class_id: int, db: Session = Depends(get_db), token: dict = Depends(get_current_user_token)):
    students = db.query(Student).filter(Student.class_id == class_id, Student.active == True).all()
    results = []
    for s in students:
        s_out = StudentOut.model_validate(s)
        s_out.face_count = len(s.embeddings)
        results.append(s_out)
    return results
