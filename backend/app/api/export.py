import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user_token
from app.services.excel_service import excel_service

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/excel")
def export_excel(
    class_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    token: dict = Depends(get_current_user_token)
):
    try:
        filepath = excel_service.generate_class_attendance_excel(db, class_id=class_id, subject_id=subject_id)
        filename = os.path.basename(filepath)
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel generation error: {str(e)}")
