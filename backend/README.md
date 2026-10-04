# AttendX Backend API — FastAPI & OpenCV SFace Biometric Core

High-performance FastAPI REST server powering AttendX with OpenCV YuNet face detection and OpenCV SFace 128-dimensional deep vector embeddings connected to Supabase PostgreSQL.

## Endpoints Summary
- `GET /health` or `GET /api/health` — Subsystem health & database ping
- `POST /api/auth/login` — Faculty authentication
- `POST /api/auth/admin-master-login` — Master admin gateway
- `POST /api/attendance/analyze` — High-speed vectorized multi-face photo recognition with 1-to-1 bipartite assignment
- `GET /api/export/backup/download` — Full live database JSON backup
