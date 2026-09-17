import os
import uuid
import shutil
from fastapi import UploadFile
from app.core.config import settings

class StorageService:
    def __init__(self, base_dir: str = settings.STORAGE_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, file: UploadFile, subfolder: str = "general") -> str:
        folder_path = os.path.join(self.base_dir, subfolder)
        os.makedirs(folder_path, exist_ok=True)
        
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        if not ext:
            ext = ".jpg"
        
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(folder_path, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return relative storage path
        return os.path.join(subfolder, filename).replace("\\", "/")

    def get_full_path(self, relative_path: str) -> str:
        return os.path.join(self.base_dir, relative_path)

    def delete_file(self, relative_path: str) -> bool:
        full_path = self.get_full_path(relative_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                return True
            except OSError:
                return False
        return False

storage_service = StorageService()
