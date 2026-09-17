from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "TEACHER"

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Class Schemas
class ClassCreate(BaseModel):
    name: str
    section: str
    academic_year: str

class ClassOut(BaseModel):
    id: int
    name: str
    section: str
    academic_year: str
    student_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Subject Schemas
class SubjectCreate(BaseModel):
    name: str
    code: str
    class_id: int

class SubjectOut(BaseModel):
    id: int
    name: str
    code: str
    class_id: int

    class Config:
        from_attributes = True

# Student Schemas
class StudentCreate(BaseModel):
    student_id: str
    name: str
    roll_number: str
    class_id: int
    email: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    student_id: str
    name: str
    roll_number: str
    class_id: int
    email: Optional[str] = None
    active: bool
    face_count: Optional[int] = 0
    attendance_percentage: Optional[float] = 100.0
    face_registration_complete: Optional[bool] = False

    class Config:
        from_attributes = True

# Face Image Upload Schema Response
class FaceRegistrationResult(BaseModel):
    student_id: int
    registered_images: int
    message: str
    warnings: List[str] = []

# ── Student Portal Auth Schemas ───────────────────────────────────────────────

class StudentPublicClassOut(BaseModel):
    """Minimal class info returned to unauthenticated student registration page."""
    id: int
    name: str
    section: str
    academic_year: str

    class Config:
        from_attributes = True

class StudentSelfRegisterRequest(BaseModel):
    """Student self-registration — fills their own details and picks their class."""
    student_id: str         # e.g. "STU001" — must be unique
    name: str               # Full name
    roll_number: str        # Roll number
    class_id: int           # Selected class
    email: Optional[str] = None
    password: Optional[str] = None  # If None, defaults to student_id

class StudentLoginRequest(BaseModel):
    student_id: str   # e.g. "STU001"
    password: str

class StudentPortalTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_db_id: int
    student_id: str
    name: str
    face_registration_complete: bool

# Angle labels for the guided face scan wizard
SCAN_ANGLES = ["front", "left", "right", "chin_down", "smile"]

class FaceFrameUploadResult(BaseModel):
    """Response after submitting a single webcam frame during face scan."""
    accepted: bool
    angle_label: str
    reason: str                    # human-readable feedback
    completed_angles: List[str]    # e.g. ["front", "left"]
    remaining_angles: List[str]    # e.g. ["right", "chin_down", "smile"]
    total_required: int
    registration_complete: bool

class StudentUpdateClassRequest(BaseModel):
    class_id: int

class FaceRegistrationStatus(BaseModel):
    """Current registration progress and class assignment for a student."""
    student_db_id: int
    student_id: str
    name: str
    roll_number: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    face_registration_complete: bool
    completed_angles: List[str]
    remaining_angles: List[str]
    total_embeddings: int
    total_required: int

# Recognition Bounding Box & Proposal Schema
class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class RecognizedFace(BaseModel):
    box: BoundingBox
    student_id: Optional[int] = None
    custom_student_id: Optional[str] = None
    name: str
    roll_number: Optional[str] = None
    confidence: float # 0.0 to 1.0
    status: str # PRESENT, NEEDS_REVIEW, UNKNOWN
    verification_status: str = "AUTO"

class AttendanceProposalItem(BaseModel):
    student_db_id: int
    student_id: str
    name: str
    roll_number: str
    status: str # PRESENT, ABSENT
    confidence: float
    verification_status: str # AUTO, NEEDS_REVIEW, UNKNOWN, MANUAL

class AttendanceAnalysisResponse(BaseModel):
    image_url: str
    total_detected_faces: int
    recognized_faces: List[RecognizedFace]
    proposed_attendance: List[AttendanceProposalItem]
    present_count: int
    absent_count: int
    needs_review_count: int

# Save Session Request
class AttendanceRecordCreate(BaseModel):
    student_id: int
    status: str # PRESENT, ABSENT
    confidence: float = 1.0
    verification_status: str = "TEACHER_VERIFIED"

class SaveAttendanceSessionRequest(BaseModel):
    class_id: int
    subject_id: int
    date: str # YYYY-MM-DD
    start_time: str # HH:MM
    image_path: Optional[str] = None
    records: List[AttendanceRecordCreate]
    recognized_faces: Optional[List[RecognizedFace]] = []

class AttendanceRecordOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    roll_number: Optional[str] = None
    status: str
    confidence: float
    verification_status: str

    class Config:
        from_attributes = True

class AttendanceSessionOut(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    teacher_id: int
    teacher_name: Optional[str] = None
    date: str
    start_time: str
    image_path: Optional[str] = None
    present_count: int = 0
    absent_count: int = 0
    total_enrolled: int = 0
    records: List[AttendanceRecordOut] = []

    class Config:
        from_attributes = True

TokenResponse.model_rebuild()
