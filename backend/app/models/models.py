import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(30), unique=True, index=True, nullable=False)
    official_email = Column(String(120), unique=True, nullable=False)
    domain = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    status = Column(String(30), default="APPROVED", nullable=False) # PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)

    users = relationship("User", back_populates="institution", cascade="all, delete-orphan")
    classes = relationship("Class", back_populates="institution", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="institution", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="institution", cascade="all, delete-orphan")

class SystemHeartbeat(Base):
    __tablename__ = "system_heartbeats"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String(50), default="keep-alive-daemon")
    pinged_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="HEALTHY")
    latency_ms = Column(Float, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="TEACHER") # TEACHER, ADMIN, SUPER_ADMIN, INSTITUTION_ADMIN
    assigned_classes = Column(JSON, default=list, nullable=True) # List of class IDs assigned to teacher, e.g. [1, 2]
    is_approved = Column(Boolean, default=False, nullable=False) # Requires Admin approval for teachers
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    department = Column(String(100), nullable=True)
    status = Column(String(30), default="APPROVED", nullable=False) # PENDING_APPROVAL, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="users")
    sessions = relationship("AttendanceSession", back_populates="teacher")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. CSE
    section = Column(String(20), nullable=False) # e.g. Section A
    academic_year = Column(String(20), nullable=False) # e.g. 2026-27
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)

    institution = relationship("Institution", back_populates="classes")
    students = relationship("Student", back_populates="class_obj", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="class_obj", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="class_obj")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # Database Management Systems
    code = Column(String(20), nullable=False) # DBMS101
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)

    institution = relationship("Institution", back_populates="subjects")
    class_obj = relationship("Class", back_populates="subjects")
    enrollments = relationship("Enrollment", back_populates="subject", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="subject")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False) # STU001
    name = Column(String(100), nullable=False)
    roll_number = Column(String(50), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    email = Column(String(100), nullable=True)
    active = Column(Boolean, default=True)
    approval_status = Column(String(30), default="APPROVED", nullable=False) # PENDING_APPROVAL, APPROVED, REJECTED
    approved_by_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Student portal login credentials
    password_hash = Column(String(255), nullable=True)  # Set when student account is activated
    face_registration_complete = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    institution = relationship("Institution", back_populates="students")
    class_obj = relationship("Class", back_populates="students")
    embeddings = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    embedding = Column(JSON, nullable=False) # Array of floats representing 128-d embedding
    source_image = Column(String(255), nullable=True)
    image_base64 = Column(Text, nullable=True) # Direct Base64 thumbnail data URI (resilient against ephemeral disk loss)
    angle_label = Column(String(50), nullable=True)  # e.g. 'front', 'left', 'right', 'chin_down', 'smile'
    source = Column(String(50), default="portal_scan")  # 'portal_scan', 'teacher_verified', 'manual_upload'
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="embeddings")

class ImmutableFaceVault(Base):
    """
    Indestructible Face Biometric Vault.
    Stores every face vector and thumbnail image ever registered.
    Records in this table are append-only and NEVER deleted, ensuring biometric
    identity cannot be lost across server restarts, container redeployments,
    or accidental student profile deletions.
    """
    __tablename__ = "immutable_face_vault"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), index=True, nullable=False) # e.g. STU001 or roll number
    student_db_id = Column(Integer, nullable=True)
    student_name = Column(String(100), nullable=False)
    roll_number = Column(String(50), nullable=True)
    class_id = Column(Integer, nullable=True)
    institution_id = Column(Integer, nullable=True)
    embedding = Column(JSON, nullable=False) # 128-d biometric vector
    image_base64 = Column(Text, nullable=True) # Direct Base64 data URI (never lost)
    source_image = Column(String(255), nullable=True)
    angle_label = Column(String(50), nullable=True)
    source = Column(String(50), default="portal_scan")
    is_active = Column(Boolean, default=True)
    archived_at = Column(DateTime, default=datetime.datetime.utcnow)

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(20), nullable=False) # YYYY-MM-DD
    start_time = Column(String(20), nullable=False) # HH:MM
    image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    class_obj = relationship("Class", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    teacher = relationship("User", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    status = Column(String(20), nullable=False) # PRESENT, ABSENT
    confidence = Column(Float, default=0.0)
    verification_status = Column(String(30), default="AUTO") # AUTO, TEACHER_VERIFIED, MANUAL
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")

class AttendanceAuditLog(Base):
    __tablename__ = "attendance_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_status = Column(String(20), nullable=True)  # AI proposed status
    original_score = Column(Float, nullable=True)        # AI match score
    final_status = Column(String(20), nullable=False)    # Teacher confirmed status
    reason = Column(String(255), nullable=True)          # Reason for change / override
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("AttendanceSession")
    student = relationship("Student")
    teacher = relationship("User")
