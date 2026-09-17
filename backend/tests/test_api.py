import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, SessionLocal
from seed import seed_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    seed_db()
    yield

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

