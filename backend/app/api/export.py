import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, Class
from app.core.security import decode_access_token, get_current_user_token
from app.services.excel_service import excel_service

router = APIRouter(prefix="/export", tags=["Export"])


def _require_super_admin(token_payload: dict, db: Session) -> User:
    caller_id = token_payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None
    if not caller or caller.role not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform Super Admin access required."
        )
    return caller


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
        raw_token = authorization.split(" ", 1)[1]

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to export attendance."
        )

    payload = decode_access_token(raw_token)
    if payload.get("role") == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot export class attendance sheets."
        )

    caller_id = payload.get("sub")
    caller = db.query(User).filter(User.id == int(caller_id)).first() if caller_id else None
    if not caller:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user.")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    if caller.role in ("TEACHER", "INSTITUTION_ADMIN") and caller.institution_id and cls.institution_id != caller.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for this institution.")

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

@router.get("/backup/status")
def get_backup_status(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Get live backup metadata and total backed up record count."""
    _require_super_admin(token_payload, db)
    from app.services.backup_service import live_backup_service
    snapshot = live_backup_service.generate_live_snapshot(db)
    table_counts = {t: data["count"] for t, data in snapshot["tables"].items()}
    total = sum(table_counts.values())
    return {
        "status": "healthy",
        "last_backup_timestamp": snapshot["backup_timestamp"],
        "total_records": total,
        "table_summary": table_counts
    }

@router.get("/backup/download")
def download_live_backup(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """Download full real-time database JSON backup."""
    _require_super_admin(token_payload, db)
    from app.services.backup_service import live_backup_service
    snapshot = live_backup_service.generate_live_snapshot(db)
    return JSONResponse(
        content=snapshot,
        headers={"Content-Disposition": f"attachment; filename=attendx_supabase_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"}
    )

