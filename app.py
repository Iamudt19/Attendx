import os
import sys

# Remove current app.py file collision from sys.modules
if 'app' in sys.modules and not hasattr(sys.modules['app'], '__path__'):
    del sys.modules['app']

# Add backend directory to Python sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import spaces

@spaces.GPU
def attendx_gpu_keepalive():
    return {"status": "GPU_ACTIVE", "models": ["YuNet", "SFace"]}

# Import the FastAPI application from backend/app/main.py
from app.main import app

# Add ZeroGPU keepalive endpoint to FastAPI app
@app.get("/api/gpu-status")
def get_gpu_status():
    return attendx_gpu_keepalive()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
