import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import decode_access_token
from app.services.excel_service import excel_service

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/excel")
def export_excel(
    class_id: int,
    subject_id: Optional[int] = None,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]

    if raw_token:
        try:
            decode_access_token(raw_token)
        except Exception:
            pass

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
