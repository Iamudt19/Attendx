import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db

# Isolated in-memory SQLite database dedicated exclusively for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    # Seed only into isolated test_engine
    test_db = TestingSessionLocal()
    try:
        from app.models.models import User, Class, Subject, Student, FaceEmbedding
        from app.core.security import get_password_hash
        teacher = User(
            name="Prof. Alan Turing",
            email="teacher@attendx.edu",
            password_hash=get_password_hash("teacher123"),
            role="TEACHER",
            is_approved=True
        )
        class_cse = Class(name="CSE", section="Section A", academic_year="2026-27")
        test_db.add_all([teacher, class_cse])
        test_db.commit()
        test_db.refresh(class_cse)

        sub = Subject(name="DBMS", code="DBMS101", class_id=class_cse.id)
        test_db.add(sub)
        test_db.commit()

        for idx in range(1, 26):
            s = Student(
                student_id=f"STU{idx:03d}",
                name=f"Student {idx}",
                roll_number=f"2026CSE{idx:02d}",
                class_id=class_cse.id,
                password_hash=get_password_hash(f"STU{idx:03d}")
            )
            test_db.add(s)
        test_db.commit()
    finally:
        test_db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_login():
    response = client.post("/api/auth/login", json={
        "email": "teacher@attendx.edu",
        "password": "teacher123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "teacher@attendx.edu"

def test_get_classes_authenticated():
    # Login
    login_res = client.post("/api/auth/login", json={
        "email": "teacher@attendx.edu",
        "password": "teacher123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/api/classes", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    classes = response.json()
    assert len(classes) >= 1
    assert classes[0]["name"] == "CSE"

def test_get_class_students():
    login_res = client.post("/api/auth/login", json={
        "email": "teacher@attendx.edu",
        "password": "teacher123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/api/classes/1/students", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    students = response.json()
    assert len(students) >= 20

def test_excel_export():
    login_res = client.post("/api/auth/login", json={
        "email": "teacher@attendx.edu",
        "password": "teacher123"
    })
    token = login_res.json()["access_token"]

    response = client.get("/api/export/excel?class_id=1&subject_id=1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

def test_student_login_and_class_update():
    # Login as student
    login_res = client.post("/api/student/login", json={
        "student_id": "STU001",
        "password": "password123"
    })
    # If seeded password is STU001 default or password123
    if login_res.status_code != 200:
        login_res = client.post("/api/student/login", json={
            "student_id": "STU001",
            "password": "STU001"
        })
    assert login_res.status_code == 200
    stu_token = login_res.json()["access_token"]

    # Get student profile
    me_res = client.get("/api/student/me", headers={"Authorization": f"Bearer {stu_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["student_id"] == "STU001"

    # Update class
    update_res = client.put(
        "/api/student/class",
        json={"class_id": 1},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["class_id"] == 1

def test_admin_master_password():
    response = client.post("/api/auth/admin-login", json={
        "password": "Doomsday@1812"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

def test_teacher_registration_and_approval_workflow():
    # Register new teacher
    reg_res = client.post("/api/auth/register", json={
        "name": "New Test Educator",
        "email": "educator.new@attendx.edu",
        "password": "SecurePassword123!"
    })
    assert reg_res.status_code in (200, 201)
    assert reg_res.json()["user"]["is_approved"] is False

    # Try logging in before approval - should be blocked 403
    unapproved_login = client.post("/api/auth/login", json={
        "email": "educator.new@attendx.edu",
        "password": "SecurePassword123!"
    })
    assert unapproved_login.status_code == 403
    assert "pending administrator approval" in unapproved_login.json()["detail"].lower()

    # Admin lists pending teachers
    admin_login = client.post("/api/auth/admin-login", json={"password": "Doomsday@1812"})
    admin_token = admin_login.json()["access_token"]
    pending_res = client.get("/api/auth/pending-teachers", headers={"Authorization": f"Bearer {admin_token}"})
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    new_teacher_entry = next((t for t in pending_list if t["email"] == "educator.new@attendx.edu"), None)
    assert new_teacher_entry is not None

    # Admin approves teacher
    approve_res = client.post(f"/api/auth/approve-teacher/{new_teacher_entry['id']}", headers={"Authorization": f"Bearer {admin_token}"})
    assert approve_res.status_code == 200

    # Now teacher logs in successfully
    approved_login = client.post("/api/auth/login", json={
        "email": "educator.new@attendx.edu",
        "password": "SecurePassword123!"
    })
    assert approved_login.status_code == 200
    assert approved_login.json()["user"]["is_approved"] is True


