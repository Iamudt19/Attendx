import os
import cv2
import json
import base64
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.models import ImmutableFaceVault, FaceEmbedding, Student, SystemHeartbeat

logger = logging.getLogger(__name__)


class VaultSyncService:
    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.backup_dir = os.path.join(backend_dir, "backups")
        os.makedirs(self.backup_dir, exist_ok=True)
        self.journal_file = os.path.join(self.backup_dir, "events_journal.jsonl")
        self.latest_backup_file = os.path.join(self.backup_dir, "attendx_backup_latest.json")

    def encode_face_to_base64(self, face_bgr_img, quality: int = 85) -> Optional[str]:
        """Encode a BGR face crop to a Base64 JPEG data URI for DB storage."""
        if face_bgr_img is None or not hasattr(face_bgr_img, "shape") or face_bgr_img.size == 0:
            return None
        try:
            h, w = face_bgr_img.shape[:2]
            max_dim = max(h, w)
            if max_dim > 256:
                scale = 256.0 / max_dim
                new_w, new_h = int(w * scale), int(h * scale)
                face_bgr_img = cv2.resize(face_bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

            ret, buf = cv2.imencode(".jpg", face_bgr_img, [cv2.IMWRITE_JPEG_QUALITY, quality])
            if not ret:
                return None
            b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
            return f"data:image/jpeg;base64,{b64}"
        except Exception as e:
            logger.warning(f"Failed to encode face image: {e}")
            return None

    def log_event(self, event_type: str, payload: Dict[str, Any]):
        """Append an event to the local JSONL journal."""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event": event_type,
            "data": payload
        }
        try:
            with open(self.journal_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, default=str) + "\n")
        except Exception as e:
            logger.error(f"Failed to write event journal: {e}")

    def archive_face(
        self,
        db: Session,
        student: Student,
        embedding: List[float],
        image_base64: Optional[str] = None,
        source_image: Optional[str] = None,
        angle_label: Optional[str] = "front",
        source: Optional[str] = "portal_scan"
    ) -> ImmutableFaceVault:
        """Copy embedding + thumbnail into the permanent vault table."""
        vault_entry = ImmutableFaceVault(
            student_id=student.student_id,
            student_db_id=student.id,
            student_name=student.name,
            roll_number=student.roll_number,
            class_id=student.class_id,
            institution_id=student.institution_id or 1,
            embedding=embedding,
            image_base64=image_base64,
            source_image=source_image,
            angle_label=angle_label or "front",
            source=source or "portal_scan",
            is_active=True,
            archived_at=datetime.utcnow()
        )
        db.add(vault_entry)
        db.commit()
        db.refresh(vault_entry)

        self.log_event("FACE_ARCHIVED", {
            "vault_id": vault_entry.id,
            "student_id": student.student_id,
            "student_name": student.name,
            "roll_number": student.roll_number,
            "angle_label": angle_label,
            "source": source,
            "has_thumbnail": bool(image_base64)
        })

        return vault_entry

    # keep old name as alias so existing callers don't break
    def archive_biometric_face(self, *args, **kwargs):
        return self.archive_face(*args, **kwargs)

    def recover_embeddings_from_vault(self, db: Session, student_db_id: int) -> List[List[float]]:
        """
        If the face_embeddings table is empty for a student, pull their
        vectors back from the vault so recognition keeps working.
        """
        student = db.query(Student).filter(Student.id == student_db_id).first()
        if not student:
            return []

        active_embs = db.query(FaceEmbedding).filter(
            FaceEmbedding.student_id == student.id,
            FaceEmbedding.is_deleted == False
        ).all()
        if active_embs:
            return [e.embedding for e in active_embs]

        vault_entries = db.query(ImmutableFaceVault).filter(
            ImmutableFaceVault.student_id == student.student_id,
            ImmutableFaceVault.is_active == True
        ).all()

        if vault_entries:
            logger.info(f"Recovered {len(vault_entries)} vectors from vault for {student.student_id}")
            for ve in vault_entries:
                db.add(FaceEmbedding(
                    student_id=student.id,
                    embedding=ve.embedding,
                    source_image=ve.source_image,
                    image_base64=ve.image_base64,
                    angle_label=ve.angle_label,
                    source="vault_recovered",
                    is_deleted=False
                ))
            db.commit()
            return [ve.embedding for ve in vault_entries]

        return []

    def run_snapshot_backup(self, db: Session):
        """Dump current DB state to backups/attendx_backup_latest.json."""
        try:
            from app.models.models import (
                Institution, User, Class, Subject, Student, FaceEmbedding, AttendanceSession, AttendanceRecord
            )
            tables_data = {}
            for model, name in [
                (Institution, "institutions"),
                (User, "users"),
                (Class, "classes"),
                (Subject, "subjects"),
                (Student, "students"),
                (FaceEmbedding, "face_embeddings"),
                (AttendanceSession, "attendance_sessions"),
                (AttendanceRecord, "attendance_records"),
                (ImmutableFaceVault, "immutable_face_vault")
            ]:
                records = []
                for row in db.query(model).all():
                    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
                    records.append(d)
                tables_data[name] = {"count": len(records), "records": records}

            payload = {
                "backup_timestamp": datetime.utcnow().isoformat(),
                "database_provider": "Supabase PostgreSQL",
                "tables": tables_data
            }
            with open(self.latest_backup_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, default=str, indent=2)
            logger.info(f"Snapshot updated: {self.latest_backup_file}")
        except Exception as e:
            logger.error(f"Snapshot backup failed: {e}")


vault_sync_service = VaultSyncService()
