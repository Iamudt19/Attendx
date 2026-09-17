# AttendX — Production Deployment Guide 🚀

This document details all deployment architectures for AttendX, production prerequisites, environment variables, and step-by-step instructions for deploying to **Docker VPS**, **Cloud PaaS (Render / Railway / Fly.io)**, or **Split Deployment (Vercel + Cloud Backend)**.

---

## 📋 Table of Contents
1. [Prerequisites & Requirements](#prerequisites--requirements)
2. [Quickstart: 1-Command Docker Deployment (VPS)](#option-1-single-server-docker-compose-recommended)
3. [Cloud PaaS Deployment (Render / Railway / Fly.io)](#option-2-cloud-paas-deployment)
4. [Split Deployment (Vercel Frontend + Render/Railway Backend)](#option-3-split-deployment-frontend-on-vercel--backend-on-render)
5. [On-Premise / School Local Server Deployment](#option-4-on-premise-school-server)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Database Migration & Seeding](#database-initialization--seeding)
8. [Production Maintenance & Backups](#production-maintenance--backups)

---

## 🛠️ Prerequisites & Requirements

### Hardware / Resource Recommendations
- **CPU**: 2+ vCPU cores (for smooth ONNX model inference during classroom photo analysis).
- **RAM**: Minimum 2 GB RAM (4 GB recommended for concurrent face recognition requests).
- **Disk**: 10 GB+ SSD storage for student reference facial crops and classroom photo captures.

### Software Requirements
- **Docker** & **Docker Compose v2+** (for Dockerized deployments), OR
- **Python 3.10 - 3.12** & **Node.js 18+** (for bare-metal/systemd deployments).

---

## Option 1: Single-Server Docker Compose (Recommended)

Ideal for **DigitalOcean Droplets**, **AWS EC2**, **Hetzner**, **Linode**, or any Ubuntu/Debian Linux VPS.

### 1. Clone the repository
```bash
git clone <your-repository-url> attendx
cd attendx
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set a secure `SECRET_KEY`:
```bash
cp .env.example .env

# Generate a strong 64-character secret key:
openssl rand -hex 32
```
Edit `.env` and replace `SECRET_KEY` with the generated value.

### 3. Build and Launch Containers
```bash
# Build images and launch services in background
docker compose up -d --build
```

### 4. Seed the Database (First-time setup)
```bash
docker compose exec backend python seed.py
```

### 5. Verify Health
```bash
curl http://localhost:8000/api/health
# Returns: {"status":"ok","database":"healthy","storage_dir":true,"version":"1.0.0"}
```

- **Frontend App**: `http://<YOUR_SERVER_IP>:3000` (or Port 80)
- **Backend API**: `http://<YOUR_SERVER_IP>:8000`
- **Swagger Docs**: `http://<YOUR_SERVER_IP>:8000/docs`

---

## Option 2: Cloud PaaS Deployment

### A. Deploying Backend on Render / Railway / Fly.io
1. **Repository**: Push the code to GitHub.
2. **Create New Web Service**: Select Docker runtime (pointing to `backend/Dockerfile` as the Dockerfile path and `backend` as the context).
3. **Set Environment Variables**:
   - `SECRET_KEY`: `<your-generated-secret>`
   - `DATABASE_URL`: Set to your cloud PostgreSQL database URL (or use persistent disk for SQLite).
   - `CORS_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g. `https://attendx.vercel.app`).
   - `STORAGE_DIR`: `/app/storage` (Attach a persistent volume to `/app/storage` so student facial embeddings persist across restarts).
4. **Health Check Path**: `/api/health`

### B. Deploying Frontend on Render / Static Hosting
1. Select Docker runtime pointing to `frontend/Dockerfile` OR build command `npm run build` with output directory `dist`.
2. Add Build Environment Variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com`

---

## Option 3: Split Deployment (Frontend on Vercel + Backend on Render)

### 1. Backend (Render / Railway / AWS App Runner)
- Build Context: `backend`
- Dockerfile: `backend/Dockerfile`
- Add environment variable `CORS_ORIGINS=https://attendx.vercel.app`

### 2. Frontend (Vercel / Netlify / Cloudflare Pages)
- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: `https://your-backend-url.onrender.com`

---

## Option 4: On-Premise School Server

If hosting locally inside a school network behind a firewall:
1. Run `docker compose up -d` on the school intranet server (e.g., `192.168.1.50`).
2. Teachers and students connect via local Wi-Fi at `http://192.168.1.50:3000`.
3. Facial data stays 100% on-premise without leaving the school network.

---

## 🔑 Environment Variables Reference

| Variable | Description | Default | Required in Prod? |
|---|---|---|---|
| `SECRET_KEY` | JWT encryption secret key | Default string | **YES (Generate random)** |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:////app/storage/attendx.db` | Optional (use PostgreSQL for high scale) |
| `CORS_ORIGINS` | Comma-separated allowed frontend domains | `*` | Recommended |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration period | `43200` (30 days) | Optional |
| `VITE_API_URL` | Frontend API Base URL (for separate hosting) | `""` (Relative proxy) | If frontend hosted separately |
| `FACE_MATCH_THRESHOLD` | Minimum SFace cosine score for `PRESENT` | `0.45` | Optional |
| `FACE_REVIEW_THRESHOLD` | Minimum score for `NEEDS_REVIEW` | `0.35` | Optional |
| `FACE_MIN_MARGIN` | Margin check between Top-1 and Top-2 | `0.08` | Optional |
| `FACE_MIN_SIZE` | Minimum face crop size (px) | `24` | Optional |
| `FACE_BLUR_THRESHOLD` | Minimum Laplacian sharpness | `45.0` | Optional |

---

## 🗄️ Database Initialization & Seeding

To initialize tables and populate default demo users and classes:

```bash
# In Docker:
docker compose exec backend python seed.py

# On Bare Metal:
cd backend
python seed.py
```

### Pre-configured Demo Accounts:
- **Teacher**: `teacher@attendx.edu` / `teacher123`
- **Admin**: `admin@attendx.edu` / `admin123`
- **Student**: `STU001` / `STU001` (or self-register at `/student/register`)

---

## 🔒 Production Maintenance & Backups

### 1. Database Backup (SQLite)
```bash
docker compose exec backend cp /app/storage/attendx.db /app/storage/attendx_backup_$(date +%F).db
```

### 2. Exported Attendance Excel Reports
All generated multi-sheet Excel reports are saved in the `attendx_exports` volume (`/app/exports`) and can be downloaded or archived at any time.

### 3. Face Models Persistence
The YuNet detection model (`face_detection_yunet_2023mar.onnx`) and SFace embedding model (`face_recognition_sface_2021dec.onnx`) are baked directly into the Docker image, ensuring zero cold-start download delays.
