import os
import urllib.request
import cv2
import numpy as np
from typing import List, Optional, Any

_SFACE_URLS = [
    "https://huggingface.co/opencv/face_recognition_sface/resolve/main/face_recognition_sface_2021dec.onnx",
    "https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
]

def get_models_dir() -> str:
    from app.core.config import settings
    models_dir = os.path.join(settings.STORAGE_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)
    return models_dir

def download_model_if_needed(urls: List[str], filename: str) -> str:
    dest_path = os.path.join(get_models_dir(), filename)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10_000:
        return dest_path

    for url in urls:
        try:
            print(f"Downloading model {filename} from {url}...")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=30) as response, open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10_000:
                print(f"Successfully downloaded {filename} ({os.path.getsize(dest_path)} bytes)")
                return dest_path
        except Exception as e:
            print(f"Download attempt failed from {url}: {e}")
            if os.path.exists(dest_path):
                try:
                    os.remove(dest_path)
                except Exception:
                    pass
    return dest_path


class FaceEmbedder:
    def __init__(self, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        self.sface_recognizer = None
        self._init_sface()

    def _init_sface(self):
        try:
            sface_path = download_model_if_needed(_SFACE_URLS, "face_recognition_sface_2021dec.onnx")
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
                    aligned_face = self.sface_recognizer.alignCrop(full_image_bgr, raw_face)
                else:
                    aligned_face = cv2.resize(face_image_bgr, (112, 112))

                feature = self.sface_recognizer.feature(aligned_face)
                vec = feature[0].astype(np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                return vec.tolist()
            except Exception as e:
                print(f"SFace feature extraction error: {e}")

        return [0.0] * self.embedding_dim


face_embedder = FaceEmbedder()
