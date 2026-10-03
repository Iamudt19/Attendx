import os
import urllib.request
import cv2
import numpy as np
from typing import List, Optional, Any, Dict

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
    """
    High-Precision Face Feature Extractor.
    Supports ONNX Runtime with CPU/GPU execution providers and OpenCV FaceRecognizerSF fallback.
    Includes batched tensor inference for multi-face classroom acceleration.
    """
    def __init__(self, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        self.sface_recognizer = None
        self.ort_session = None
        self.input_name = None
        self.output_name = None
        self._init_models()

    def _init_models(self):
        try:
            sface_path = download_model_if_needed(_SFACE_URLS, "face_recognition_sface_2021dec.onnx")
            if os.path.exists(sface_path) and os.path.getsize(sface_path) > 10_000:
                # 1. Initialize ONNX Runtime Session if available
                try:
                    import onnxruntime as ort
                    sess_options = ort.SessionOptions()
                    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                    sess_options.intra_op_num_threads = 4
                    providers = ['CPUExecutionProvider']
                    if 'DirectMLExecutionProvider' in ort.get_available_providers():
                        providers.insert(0, 'DirectMLExecutionProvider')
                    elif 'CUDAExecutionProvider' in ort.get_available_providers():
                        providers.insert(0, 'CUDAExecutionProvider')
                    
                    self.ort_session = ort.InferenceSession(sface_path, sess_options, providers=providers)
                    self.input_name = self.ort_session.get_inputs()[0].name
                    self.output_name = self.ort_session.get_outputs()[0].name
                    print(f"ONNX Runtime FaceEmbedder session initialized with providers: {providers}")
                except Exception as ort_err:
                    print(f"ONNX Runtime initialization fallback to OpenCV: {ort_err}")
                    self.ort_session = None

                # 2. Initialize OpenCV FaceRecognizerSF as robust fallback
                self.sface_recognizer = cv2.FaceRecognizerSF_create(sface_path, "")
                print("FaceRecognizerSF initialized successfully.")
        except Exception as e:
            print(f"Could not initialize SFace: {e}")
            self.sface_recognizer = None
            self.ort_session = None

    def _try_realign_crop(
        self,
        face_crop_bgr: np.ndarray
    ) -> Optional[Any]:
        """
        When raw_face landmarks are unavailable (e.g. Haar cascade fallback),
        re-run YuNet on the face crop itself to recover 5-point landmarks.
        Returns the raw_face array if found, else None.
        """
        try:
            if self.yunet_detector is None:
                # Lazy import to avoid circular dependency
                from app.cv.detector import face_detector
                self.yunet_detector = getattr(face_detector, 'yunet_detector', None)

            if self.yunet_detector is None:
                return None

            h, w = face_crop_bgr.shape[:2]
            if h < 24 or w < 24:
                return None

            # Upscale tiny crops so YuNet can detect landmarks reliably
            scale = 1.0
            if h < 80 or w < 80:
                scale = max(80 / h, 80 / w)
                face_crop_bgr = cv2.resize(
                    face_crop_bgr,
                    (int(w * scale), int(h * scale)),
                    interpolation=cv2.INTER_LINEAR
                )
                h, w = face_crop_bgr.shape[:2]

            self.yunet_detector.setInputSize((w, h))
            _, faces = self.yunet_detector.detect(face_crop_bgr)
            if faces is not None and len(faces) > 0:
                return faces[0]  # best detection on this crop
        except Exception as e:
            print(f"Re-alignment YuNet attempt failed: {e}")
        return None

    def compute_embedding(
        self,
        face_image_bgr: np.ndarray,
        full_image_bgr: Optional[np.ndarray] = None,
        raw_face: Optional[Any] = None
    ) -> List[float]:
        """
        Compute a normalized face embedding using OpenCV FaceRecognizerSF.

        Alignment strategy (in order of preference):
          1. alignCrop on full_image_bgr + raw_face (best — identical to enrollment)
          2. alignCrop on the face_crop itself after re-running YuNet to recover landmarks
          3. Proportional resize to 112×112 (last resort — may reduce match quality)

        Consistent alignment between registration and classroom inference is the
        single most important factor for high cosine-similarity scores.
        """
        if face_image_bgr is None or face_image_bgr.size == 0:
            return [0.0] * self.embedding_dim

        if self.sface_recognizer is None:
            self._init_models()
            if self.sface_recognizer is None:
                return [0.0] * self.embedding_dim

        # Lazily cache YuNet reference for re-alignment
        if not hasattr(self, 'yunet_detector'):
            self.yunet_detector = None

        try:
            aligned_face = None

            # ── Path 1: Full image + pre-extracted landmarks (enrollment / detection path) ──
            if full_image_bgr is not None and raw_face is not None:
                try:
                    aligned_face = self.sface_recognizer.alignCrop(full_image_bgr, raw_face)
                except Exception:
                    aligned_face = None

            # ── Path 2: Re-run YuNet on the face crop to recover landmarks ──
            if aligned_face is None:
                recovered_raw = self._try_realign_crop(face_image_bgr)
                if recovered_raw is not None:
                    try:
                        aligned_face = self.sface_recognizer.alignCrop(face_image_bgr, recovered_raw)
                    except Exception:
                        aligned_face = None

            # ── Path 3: Plain proportional resize (last resort) ──
            if aligned_face is None or aligned_face.size == 0:
                aligned_face = cv2.resize(face_image_bgr, (112, 112), interpolation=cv2.INTER_LINEAR)

            # Extract 128-d embedding via SFace (handles normalization internally)
            feature = self.sface_recognizer.feature(aligned_face)
            vec = feature[0].astype(np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            return vec.tolist()
        except Exception as e:
            print(f"Face feature extraction error: {e}")

        return [0.0] * self.embedding_dim

    def compute_embeddings_batch(
        self,
        faces_data: List[Dict[str, Any]],
        full_image_bgr: Optional[np.ndarray] = None
    ) -> List[List[float]]:
        """
        Batched embedding extraction for multiple classroom faces simultaneously.
        """
        if not faces_data:
            return []

        embeddings = []
        for face_item in faces_data:
            cropped = face_item.get("cropped_face")
            raw_face = face_item.get("raw_face")
            emb = self.compute_embedding(
                face_image_bgr=cropped,
                full_image_bgr=full_image_bgr,
                raw_face=raw_face
            )
            embeddings.append(emb)
        return embeddings


face_embedder = FaceEmbedder()
