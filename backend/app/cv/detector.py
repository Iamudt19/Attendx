import os
import urllib.request
import cv2
import numpy as np
from typing import List, Dict, Any

_YUNET_URLS = [
    "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
    "https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
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


class FaceDetector:
    def __init__(self):
        self.yunet_detector = None
        self.face_cascade = None
        self._init_yunet()
        self._init_cascade()

    def _init_yunet(self):
        try:
            yunet_path = download_model_if_needed(_YUNET_URLS, "face_detection_yunet_2023mar.onnx")
            if os.path.exists(yunet_path) and os.path.getsize(yunet_path) > 10_000:
                self.yunet_detector = cv2.FaceDetectorYN_create(
                    yunet_path,
                    "",
                    (320, 320),
                    0.5,    # score_threshold
                    0.3,    # nms_threshold
                    5000    # top_k
                )
        except Exception as e:
            print(f"Could not initialize YuNet: {e}")
            self.yunet_detector = None

    def _init_cascade(self):
        try:
            cascade_path = getattr(cv2.data, 'haarcascades', '') + 'haarcascade_frontalface_default.xml'
            clf = cv2.CascadeClassifier(cascade_path)
            if not clf.empty():
                self.face_cascade = clf
        except Exception:
            self.face_cascade = None

    def _detect_yunet(self, image_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """Use OpenCV YuNet ONNX model (extracts bbox + 5 facial landmarks)."""
        h_img, w_img = image_bgr.shape[:2]
        self.yunet_detector.setInputSize((w_img, h_img))
        _, faces = self.yunet_detector.detect(image_bgr)
        if faces is None or len(faces) == 0:
            return []

        results = []
        for face in faces:
            x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
            score = float(face[14])
            if score < 0.4 or w < 16 or h < 16:
                continue

            # Bounding box clamp
            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(w_img, x + w)
            y2 = min(h_img, y + h)

            cropped = image_bgr[y1:y2, x1:x2]
            if cropped.size == 0:
                continue

            results.append({
                "box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                "cropped_face": cropped,
                "raw_face": face,  # 15-element array containing 5-point landmarks
                "score": score
            })
        return results

    def _detect_haar(self, image_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """Haar Cascade fallback."""
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        if len(faces) == 0:
            return []

        h_img, w_img = image_bgr.shape[:2]
        results = []
        for (x, y, w, h) in faces:
            x1, y1 = max(0, int(x)), max(0, int(y))
            x2, y2 = min(w_img, int(x + w)), min(h_img, int(y + h))
            cropped = image_bgr[y1:y2, x1:x2]
            if cropped.size == 0:
                continue
            results.append({
                "box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                "cropped_face": cropped,
                "raw_face": None,
                "score": 0.8
            })
        return results

    def detect_faces(self, image_bgr: np.ndarray) -> List[Dict[str, Any]]:
        if image_bgr is None or image_bgr.size == 0:
            return []

        if self.yunet_detector is not None:
            try:
                results = self._detect_yunet(image_bgr)
                if len(results) > 0:
                    return results
            except Exception as e:
                print(f"YuNet detection error: {e}")

        if self.face_cascade is not None:
            try:
                return self._detect_haar(image_bgr)
            except Exception as e:
                print(f"Haar detection error: {e}")

        return []


face_detector = FaceDetector()
