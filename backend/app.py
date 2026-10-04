import os
import uvicorn
from app.main import app
from app.core.config import settings

if __name__ == "__main__":
    # Launch pure FastAPI server on Hugging Face default port 7860
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=7860,
        reload=False,
        log_level="info"
    )
