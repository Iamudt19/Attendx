import os
from datetime import datetime
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

@router.get("/backup/status")
def get_backup_status(db: Session = Depends(get_db)):
    """Get live backup metadata and total backed up record count."""
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
def download_live_backup(db: Session = Depends(get_db)):
    """Download full real-time database JSON backup."""
    from app.services.backup_service import live_backup_service
    from fastapi.responses import JSONResponse
    snapshot = live_backup_service.generate_live_snapshot(db)
    return JSONResponse(
        content=snapshot,
        headers={"Content-Disposition": f"attachment; filename=attendx_supabase_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"}
    )

