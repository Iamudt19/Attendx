---
title: AttendX API
emoji: 📸
colorFrom: indigo
colorTo: blue
sdk: gradio
sdk_version: "5.9.1"
app_file: app.py
pinned: false
---

# AttendX — AI-Powered Classroom Attendance System

> **"One Photo. Complete Attendance."**


AttendX is a production-grade full-stack classroom attendance system built with FastAPI, React, TypeScript, and a high-precision deep facial recognition pipeline (OpenCV YuNet + SFace ONNX).

---

## 📸 Architectural Overview & Pipeline

The AttendX facial recognition pipeline is designed with a **conservative recognition principle**:
> **A wrong positive recognition (wrong student marked present) is far worse than an uncertain result (NEEDS_REVIEW or UNKNOWN).**

```text
Classroom Image
      ↓
1. Face Detection (OpenCV YuNet ONNX with 5-point facial landmarks)
      ↓
2. Face Quality Assessment (Size, Blur/Laplacian Var, Brightness, Aspect Ratio)
      ↓
3. 5-Point Landmark Affine Alignment (112x112 canonical reference frame)
      ↓
4. Deep Feature Extraction (OpenCV SFace 128-d ResNet ONNX)
      ↓
5. L2 Vector Normalization (Unit sphere: ||v|| = 1.0)
      ↓
6. Class-Scoped Cosine Similarity (Compare only against enrolled students)
      ↓
7. Top-1 vs Top-2 Match Margin Check (margin = best_score - second_best_score)
      ↓
8. 3-State Classification (PRESENT / NEEDS_REVIEW / UNKNOWN)
      ↓
9. Teacher Interactive Verification (Manual override authority & Face Reassignment)
      ↓
10. Active Learning Loop (Teacher-verified crops saved to student embedding pool)
      ↓
Final Attendance Record + Audit Log + Multi-Sheet Excel Export
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Modern Slate Theme)
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT interceptors
- **Router**: React Router v6

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (default) / PostgreSQL support via SQLAlchemy ORM
- **Security**: PyJWT + Bcrypt password hashing
- **Excel Engine**: OpenPyXL + Pandas

### Computer Vision (CV) Module (`backend/app/cv/`)
- `detector.py`: **YuNet FaceDetectorYN** (official OpenCV ONNX model) with 5-point facial landmark detection.
- `aligner.py`: 5-point affine transformation aligning eyes, nose, and mouth corners into canonical 112x112 crops.
- `embedder.py`: **SFace FaceRecognizerSF** deep convolutional network generating 128-dimensional L2-normalized vector embeddings.
- `quality.py`: Face size check, Laplacian variance blur detection, and brightness filtering.
- `matcher.py`: Normalized cosine similarity computation with Top-1 vs Top-2 margin gating and 3-state classification.
- `pipeline.py`: Orchestrates detection, alignment, embedding, and scoped matching against class enrollments.

---

## ⚙️ Recognition Configuration & Calibration

All computer vision thresholds are configurable via environment variables in `backend/.env`:

| Parameter | Default | Description |
|---|---|---|
| `FACE_MATCH_THRESHOLD` | `0.45` | Minimum cosine similarity required to propose `PRESENT`. |
| `FACE_REVIEW_THRESHOLD` | `0.35` | Minimum cosine similarity to propose `NEEDS_REVIEW` (below is `UNKNOWN`). |
| `FACE_MIN_MARGIN` | `0.08` | Minimum gap required between Top-1 and Top-2 match (`score1 - score2`). |
| `FACE_MIN_SIZE` | `24` | Minimum face crop width/height in pixels. |
| `FACE_BLUR_THRESHOLD` | `45.0` | Minimum Laplacian variance to consider a face sharp. |
| `FACE_DETECTION_THRESHOLD` | `0.45` | Confidence threshold for YuNet face detector. |

### Running the Calibration & Benchmark Tool
You can evaluate intra-class genuine pairs vs cross-class impostor pairs at any time:

```bash
cd backend
python scripts/evaluate_face_recognition.py
```

Outputs detailed False Acceptance Rate (FAR), False Rejection Rate (FRR), Precision, and Recall across various threshold levels and saves a JSON report to `exports/face_evaluation_report.json`.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run Database Seed Script (Pre-populates classes, subjects, and students)
python seed.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

The API server runs at `http://localhost:8000` (Swagger UI at `http://localhost:8000/docs`).

#### 🔐 Credentials:
- **Teacher**: `teacher@attendx.edu` / `teacher123`
- **Admin**: `admin@attendx.edu` / `admin123`
- **Student**: `STU001` / `STU001` (or self-registered credentials)

---

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite Development Server
npm run dev
```

Open `http://localhost:5173` in your web browser.

---

## 🧪 Automated Testing

Run unit and integration tests with pytest:

```bash
cd backend
python -m pytest tests/ -v
```

Tests verify:
- Teacher authentication & student portal auth
- Student class registration and switching
- Face quality metrics (Laplacian blur, brightness, sub-minimum size rejection)
- High match score + clear margin $\to$ `PRESENT`
- Ambiguous match (small margin $< 0.08$) $\to$ `NEEDS_REVIEW`
- Non-enrolled / low similarity $\to$ `UNKNOWN`
- Multi-sheet Excel workbook export

---

## 🔄 Active Learning & Continuous Model Improvement

AttendX features an **active feedback loop**:
1. When a teacher reviews attendance and manually confirms or reassigns an ambiguous/unknown face to a student, the cropped and aligned face is embedded and appended to that student's biometric profile (labeled `source="teacher_verified"`).
2. The student profile maintains a sliding pool of up to 12 verified embeddings spanning diverse angles, lighting conditions, and days.
3. Every manual teacher correction is logged in the `AttendanceAuditLog` table with initial AI status, final teacher status, and timestamp.

---

## ⚠️ Known Limitations & Best Practices

- **Lighting**: Strong backlighting (e.g., windows behind students) can underexpose faces. Frontal or ambient diffused classroom lighting produces the best results.
- **Occlusions & Distance**: Extreme angles (profiles $> 45^\circ$) or distant faces under 24x24 pixels will be automatically routed to `NEEDS_REVIEW` or `UNKNOWN`.
- **Teacher Authority**: AI recognition proposals are never auto-finalized. The teacher always verifies and submits the attendance session.

---

## 📜 License
MIT License. Created for classroom productivity and attendance automation.
