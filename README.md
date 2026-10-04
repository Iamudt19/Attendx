# AttendX — AI Biometric Classroom Attendance Platform & Progressive Web App (PWA)

> **"One Photo. Complete Attendance. Instant Biometric Precision."**

AttendX is a production-grade, full-stack AI attendance platform built with **FastAPI**, **React 18 / TypeScript / Vite**, and a high-precision biometric pipeline (**OpenCV YuNet + SFace 128-D ONNX**). It features permanent cloud persistence (**Supabase PostgreSQL**), zero-data-loss automated live backups, a calibrated bipartite face matcher, and an installable **Progressive Web App (PWA)** for mobile & desktop devices.

---

## 🌐 Live Deployments

| Component | Provider | Live URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend WebApp** | Vercel | [one-attendx.vercel.app](https://one-attendx.vercel.app) | Responsive React PWA with Cyber Biometric HUD |
| **Backend REST API** | Render | [attendx-cw9l.onrender.com](https://attendx-cw9l.onrender.com) | FastAPI + OpenCV SFace + Uvicorn |
| **Database** | Supabase | AWS ap-south-1 (Mumbai Pooler) | PostgreSQL permanent persistence (Port 5432) |
| **Interactive Docs** | Render | [attendx-cw9l.onrender.com/docs](https://attendx-cw9l.onrender.com/docs) | OpenAPI / Swagger REST Explorer |

---

## 📱 Progressive Web App (PWA) & Mobile Installation

AttendX is a certified **Progressive Web App** designed to run seamlessly as a native application on smartphones, tablets, and laptops:

- **1-Tap Native Installation:** Install directly onto your iOS / Android home screen or Desktop (Chrome/Edge/Safari) with zero app store downloads.
- **Header & Floating Install Banners:** Interactive `<InstallAppButton />` and `<FloatingMobileInstallBanner />` trigger native browser prompts and iOS step-by-step guidance.
- **Mobile Camera Optimization:** High-resolution rear & front camera streaming with automatic orientation lock and touch-focused biometric scanning.
- **Offline App Shell:** Service Worker caching (`sw.js` + `manifest.json`) ensures instant loads even on low-bandwidth classroom networks.

---

## 📸 Architectural Overview & Computer Vision Pipeline

AttendX operates under a **Conservative Recognition Principle**:
> *A false positive (marking the wrong student present) is unacceptable; uncertain faces fall back to `NEEDS_REVIEW` or `UNKNOWN`.*

```text
Classroom Group Photo or Video Stream
              ↓
1. Face Detection (OpenCV YuNet ONNX 640x640 with 5-point facial landmarks)
              ↓
2. Biometric Quality Assessment (Laplacian Blur Filter, Face Area, Brightness Check)
              ↓
3. 5-Point Landmark Affine Alignment (112x112 canonical biometric reference frame)
              ↓
4. Deep Feature Extraction (OpenCV SFace ResNet ONNX generating 128-D float vector)
              ↓
5. L2 Vector Normalization (Unit hypersphere projection: ||v|| = 1.0)
              ↓
6. Class-Scoped Cosine Similarity Matrix (Evaluated against enrolled student gallery)
              ↓
7. Strict 1-to-1 Greedy Bipartite Assignment (Prevents duplicate face claims)
              ↓
8. 3-State Calibrated Classification:
   - PRESENT:      Cosine ≥ 0.42 AND Margin Gap ≥ 0.06
   - NEEDS_REVIEW: Cosine 0.35 – 0.42 OR Margin Gap < 0.06
   - UNKNOWN:      Cosine < 0.35 (Stranger / Non-enrolled face)
              ↓
9. Cyber Biometric HUD & Teacher Verification (Face Reassignment Authority)
              ↓
10. Permanent Cloud Sync (Supabase PostgreSQL + Live Audit Trail + Multi-Sheet Excel Export)
```

---

## ⚡ System Diagnostics & Backend Spindown Monitor

Render's free tier enters sleep mode after 15 minutes of inactivity. AttendX provides built-in real-time telemetry:

1. **Live Header Pulse Badge:** Displays real-time status (`🟢 Backend Live · 48ms`, `🟡 Spinning Up...`, or `🔴 Spun Down`).
2. **System Diagnostics Console (`/admin`):**
   - Interactive **⚡ Test Ping / Wake** button to measure exact roundtrip latency.
   - **Auto Keep-Alive Heartbeat:** Pings backend every 60 seconds while open to prevent container sleep.
   - **Database Metric Counters:** Live tallies of students, face vectors, classes, and sessions.
   - **Live Backup Download:** 1-click export of the entire PostgreSQL database to `.json`.

---

## 🛡️ Disaster Recovery & Live Backups

All biometric embeddings, credentials, and attendance histories are permanently safeguarded:

- **Supabase Cloud PostgreSQL:** Permanent remote database host (zero container wipeouts on redeploys).
- **Automated Live Backup Daemon:** `python scripts/live_backup_daemon.py` periodically captures database state locally.
- **Instant Snapshot CLI:** `python scripts/backup_database.py` generates timestamped backups in `backups/`.
- **1-Click Database Restore:** `python scripts/restore_database.py` restores your database anytime from a JSON snapshot.
- **REST API Endpoint:** `GET /api/export/backup/download` for authenticated admin backup downloads.

---

## 🔑 Default Credentials & Access Portals

| Role | Portal URL | Credentials |
| :--- | :--- | :--- |
| **Institutional Master Key** | `/admin` | Master Key: `Doomsday@1812` |
| **Faculty / Educator Portal** | `/login` | Email: `nms@gmail.com` / Password: `nms123` |
| **Student Face Portal** | `/student` | Student ID: `001` / Password: `udit123` |

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v18+
- **Python**: v3.10+
- **Git**

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.

---

## 📜 License & Compliance
Built with ❤️ by the AttendX Engineering Team. Released under the MIT License.
