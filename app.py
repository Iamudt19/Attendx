import os
import sys

# Add backend directory to Python system path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

import uvicorn
from app.main import app

# Hugging Face Spaces listens on port 7860
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
