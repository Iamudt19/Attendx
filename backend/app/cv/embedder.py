import os
import urllib.request
import cv2
import numpy as np
from typing import List, Optional, Any

_SFACE_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

def get_models_dir() -> str:
    from app.core.config import settings
    models_dir = os.path.join(settings.STORAGE_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)
    return models_dir

def download_model_if_needed(url: str, filename: str) -> str:
    dest_path = os.path.join(get_models_dir(), filename)
    if not (os.path.exists(dest_path) and os.path.getsize(dest_path) > 10_000):
        try:
            print(f"Downloading model {filename}...")
            urllib.request.urlretrieve(url, dest_path)
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
    return dest_path


class FaceEmbedder:
    def __init__(self, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        self.sface_recognizer = None
        self._init_sface()

    def _init_sface(self):
        try:
            sface_path = download_model_if_needed(_SFACE_MODEL_URL, "face_recognition_sface_2021dec.onnx")
            if os.path.exists(sface_path) and os.path.getsize(sface_path) > 10_000:
                self.sface_recognizer = cv2.FaceRecognizerSF_create(sface_path, "")
                print("FaceRecognizerSF initialized successfully.")
        except Exception as e:
            print(f"Could not initialize SFace: {e}")
            self.sface_recognizer = None

    def compute_embedding(
        self, 
        face_image_bgr: np.ndarray, 
        full_image_bgr: Optional[np.ndarray] = None, 
        raw_face: Optional[Any] = None
    ) -> List[float]:
        """
        Compute a normalized 128-d face embedding using SFace deep neural network.
        If full_image_bgr and raw_face (YuNet 15-d array with landmarks) are provided,
        uses alignCrop for landmark alignment. Otherwise resizes to 112x112 standard input.
        """
        if face_image_bgr is None or face_image_bgr.size == 0:
            return [0.0] * self.embedding_dim

        if self.sface_recognizer is None:
            self._init_sface()

        if self.sface_recognizer is not None:
            try:
                if full_image_bgr is not None and raw_face is not None:
                    # Best alignment with 5-point landmarks
                    aligned_face = self.sface_recognizer.alignCrop(full_image_bgr, raw_face)
                else:
                    # Crop resized to SFace standard input (112, 112)
                    aligned_face = cv2.resize(face_image_bgr, (112, 112))

                feature = self.sface_recognizer.feature(aligned_face)
                vec = feature[0].astype(np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                return vec.tolist()
            except Exception as e:
                print(f"SFace feature extraction error: {e}")

        # Fallback if model not available
        return [0.0] * self.embedding_dim


face_embedder = FaceEmbedder()

