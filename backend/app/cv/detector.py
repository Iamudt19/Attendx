"""
Optimization #2: YuNet Detector — Fixed-Size Input + Thread Lock
================================================================
Key changes:
  1. YuNet is initialized at a fixed resolution (640×480) instead of
     dynamically resizing on every call.  We resize the *image* to that
     canonical size before detection, then map coordinates back to the
     original frame.  This eliminates the costly C++ ONNX internal
     re-initialization that fires every time setInputSize() changes
     the tensor shape.
  2. A threading.Lock() guards every detect_faces() call so that
     concurrent ThreadPoolExecutor threads in process_multiple_classroom_images
     cannot race on the shared stateful C++ YuNet handle.
"""
import os
import threading
import urllib.request
import cv2
import numpy as np
from typing import List, Dict, Any

_YUNET_URLS = [
    "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
    "https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
]

# Fixed canonical input size for YuNet — prevents per-call tensor re-init
_YUNET_INPUT_W = 640
_YUNET_INPUT_H = 480


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
        # Optimization #2a: single lock guards the C++ YuNet handle across threads
        self._lock = threading.Lock()
        self._init_yunet()
        self._init_cascade()

    def _init_yunet(self):
        try:
            yunet_path = download_model_if_needed(_YUNET_URLS, "face_detection_yunet_2023mar.onnx")
            if os.path.exists(yunet_path) and os.path.getsize(yunet_path) > 10_000:
                # Optimization #2b: fix input size at init time — never call setInputSize() again
                self.yunet_detector = cv2.FaceDetectorYN_create(
                    yunet_path,
                    "",
                    (_YUNET_INPUT_W, _YUNET_INPUT_H),  # fixed canonical size
                    0.5,    # score_threshold
                    0.3,    # nms_threshold
                    5000    # top_k
                )
                print(f"YuNet initialized at fixed {_YUNET_INPUT_W}×{_YUNET_INPUT_H} resolution.")
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
        """
        Resize image to fixed canonical size, detect, then map boxes back to
        original image coordinates.  No setInputSize() → no ONNX re-init.
        """
        h_orig, w_orig = image_bgr.shape[:2]

        # Scale image to fixed canonical input size
        scale_x = _YUNET_INPUT_W / w_orig
        scale_y = _YUNET_INPUT_H / h_orig
        resized = cv2.resize(image_bgr, (_YUNET_INPUT_W, _YUNET_INPUT_H), interpolation=cv2.INTER_LINEAR)

        with self._lock:
            _, faces = self.yunet_detector.detect(resized)

        if faces is None or len(faces) == 0:
            return []

        results = []
        for face in faces:
            # Map bounding box back from canonical → original coords
            x = int(face[0] / scale_x)
            y = int(face[1] / scale_y)
            w = int(face[2] / scale_x)
            h = int(face[3] / scale_y)
            score = float(face[14])

            if score < 0.25 or w < 16 or h < 16:
                continue

            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(w_orig, x + w)
            y2 = min(h_orig, y + h)

            cropped = image_bgr[y1:y2, x1:x2]
            if cropped.size == 0:
                continue

            # Map the 5-point landmarks (indices 4-13 of face array) back to original coords
            raw_face_orig = face.copy()
            raw_face_orig[0] = x1
            raw_face_orig[1] = y1
            raw_face_orig[2] = x2 - x1
            raw_face_orig[3] = y2 - y1
            for li in range(4, 14, 2):
                raw_face_orig[li] = face[li] / scale_x
                raw_face_orig[li + 1] = face[li + 1] / scale_y

            results.append({
                "box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                "cropped_face": cropped,
                "raw_face": raw_face_orig,
                "score": score
            })
        return results

    def _detect_haar(self, image_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """Haar Cascade fallback with YuNet landmark re-extraction on crops."""
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

            raw_face = None
            if self.yunet_detector is not None:
                try:
                    pad = int(max(w, h) * 0.4)
                    px1 = max(0, x1 - pad)
                    py1 = max(0, y1 - pad)
                    px2 = min(w_img, x2 + pad)
                    py2 = min(h_img, y2 + pad)
                    padded_crop = image_bgr[py1:py2, px1:px2]
                    ph, pw = padded_crop.shape[:2]
                    if ph >= 32 and pw >= 32:
                        scale_x2 = _YUNET_INPUT_W / pw
                        scale_y2 = _YUNET_INPUT_H / ph
                        resized_crop = cv2.resize(padded_crop, (_YUNET_INPUT_W, _YUNET_INPUT_H))
                        with self._lock:
                            _, yunet_faces = self.yunet_detector.detect(resized_crop)
                        if yunet_faces is not None and len(yunet_faces) > 0:
                            best = yunet_faces[0].copy()
                            # Map back to full-image coordinates
                            best[0] = best[0] / scale_x2 + px1
                            best[1] = best[1] / scale_y2 + py1
                            for li in range(4, 14, 2):
                                best[li] = best[li] / scale_x2 + px1
                                best[li + 1] = best[li + 1] / scale_y2 + py1
                            raw_face = best
                except Exception:
                    pass

            results.append({
                "box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                "cropped_face": cropped,
                "raw_face": raw_face,
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
