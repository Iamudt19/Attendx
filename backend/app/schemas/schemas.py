from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class AdminMasterLoginRequest(BaseModel):
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
    assigned_classes: Optional[List[int]] = []

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    assigned_classes: Optional[List[int]] = []
    is_approved: bool = True
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    created_at: datetime

class TeacherApprovalItem(BaseModel):
    id: int
    name: str
    email: str
    role: str
    assigned_classes: Optional[List[int]] = []
    is_approved: bool
    created_at: datetime

class TeacherClassAssignRequest(BaseModel):
    assigned_classes: List[int]

# Class Schemas
class ClassCreate(BaseModel):
    name: str
    section: str
    academic_year: str

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    section: Optional[str] = None
    academic_year: Optional[str] = None

class ClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    section: str
    academic_year: str
    student_count: Optional[int] = 0

# Subject Schemas
class SubjectCreate(BaseModel):
    name: str
    code: str
    class_id: int

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    class_id: Optional[int] = None

class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    class_id: int

# Student Schemas
class StudentCreate(BaseModel):
    student_id: str
    name: str
    roll_number: str
    class_id: int
    email: Optional[str] = None

class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    avatar_url: Optional[str] = None
    face_images: Optional[List[str]] = []


# Face Image Upload Schema Response
class FaceRegistrationResult(BaseModel):
    student_id: int
    registered_images: int
    message: str
    warnings: List[str] = []

# ── Student Portal Auth Schemas ───────────────────────────────────────────────

class StudentPublicClassOut(BaseModel):
    """Minimal class info returned to unauthenticated student registration page."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    section: str
    academic_year: str

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
    total_embeddings: Optional[int] = None
    training_level: Optional[str] = None
    recognition_readiness_score: Optional[float] = None

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
    training_level: Optional[str] = None
    recognition_readiness_score: Optional[float] = None

# Recognition Bounding Box & Proposal Schema
class BoundingBox(BaseModel):
    x: int = 0
    y: int = 0
    w: Optional[int] = 0
    h: Optional[int] = 0
    width: Optional[int] = None
    height: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_box(cls, values):
        if isinstance(values, dict):
            w_val = values.get("w") if values.get("w") is not None else values.get("width", 0)
            h_val = values.get("h") if values.get("h") is not None else values.get("height", 0)
            values["w"] = w_val
            values["h"] = h_val
        return values

class RecognizedFace(BaseModel):
    box: Optional[BoundingBox] = None
    student_id: Optional[int] = None
    custom_student_id: Optional[str] = None
    name: Optional[str] = ""
    roll_number: Optional[str] = None
    confidence: Optional[float] = 0.0
    match_score: Optional[float] = 0.0
    status: Optional[str] = "NEEDS_REVIEW"
    verification_status: Optional[str] = "AUTO"
    image_index: Optional[int] = 0
    reason: Optional[str] = None
    quality: Optional[dict] = None

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
    image_urls: Optional[List[str]] = None
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
    image_urls: Optional[List[str]] = []  # All uploaded classroom photo paths (multi-photo)
    records: List[AttendanceRecordCreate]
    recognized_faces: Optional[List[RecognizedFace]] = []

class UpdateSessionRecordsRequest(BaseModel):
    records: List[AttendanceRecordCreate]

class AttendanceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    roll_number: Optional[str] = None
    status: str
    confidence: float
    verification_status: str

class AttendanceSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

# ── Student Attendance Analytics Schemas ─────────────────────────────────────

class StudentSubjectAttendance(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: str
    total_classes: int
    attended: int
    missed: int
    percentage: float
    status: str

class StudentLectureLog(BaseModel):
    session_id: int
    date: str
    start_time: str
    subject_id: int
    subject_name: str
    subject_code: str
    teacher_name: Optional[str] = None
    status: str
    confidence: Optional[float] = None
    verification_status: Optional[str] = None
    image_url: Optional[str] = None

class StudentMonthlyStats(BaseModel):
    month: str
    total: int
    present: int
    percentage: float

class StudentAttendanceDashboardResponse(BaseModel):
    student_id: str
    name: str
    roll_number: str
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    total_classes: int
    attended: int
    missed: int
    overall_percentage: float
    eligibility_status: str
    required_classes_for_target: int
    subjects: List[StudentSubjectAttendance]
    history: List[StudentLectureLog]
    monthly_analytics: List[StudentMonthlyStats]

TokenResponse.model_rebuild()

