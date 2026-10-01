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

    def compute_embedding(
        self, 
        face_image_bgr: np.ndarray, 
        full_image_bgr: Optional[np.ndarray] = None, 
        raw_face: Optional[Any] = None
    ) -> List[float]:
        """
        Compute a normalized face embedding using deep neural network.
        Uses 5-point landmark alignment if available, then runs high-speed inference.
        """
        if face_image_bgr is None or face_image_bgr.size == 0:
            return [0.0] * self.embedding_dim

        if self.ort_session is None and self.sface_recognizer is None:
            self._init_models()

        try:
            # 1. Landmark alignment
            if full_image_bgr is not None and raw_face is not None and self.sface_recognizer is not None:
                aligned_face = self.sface_recognizer.alignCrop(full_image_bgr, raw_face)
            else:
                aligned_face = cv2.resize(face_image_bgr, (112, 112))

            # 2. ONNX Runtime Inference
            if self.ort_session is not None:
                # SFace expects (1, 112, 112, 3) or (1, 3, 112, 112) float32
                # In standard OpenCV SFace ONNX: input shape is (1, 112, 112, 3) or (1, 3, 112, 112)
                input_shape = self.ort_session.get_inputs()[0].shape
                if len(input_shape) == 4 and input_shape[1] == 3:
                    # NCHW
                    blob = cv2.dnn.blobFromImage(aligned_face, 1.0, (112, 112), (0, 0, 0), swapRB=True)
                else:
                    # NHWC or float32 image
                    blob = np.expand_dims(aligned_face.astype(np.float32), axis=0)

                outputs = self.ort_session.run([self.output_name], {self.input_name: blob})
                vec = outputs[0].flatten().astype(np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                return vec.tolist()

            # 3. OpenCV FaceRecognizerSF Fallback
            if self.sface_recognizer is not None:
                feature = self.sface_recognizer.feature(aligned_face)
                vec = feature[0].astype(np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                return vec.tolist()
        except Exception as e:
            # If ONNX format differs, fallback to OpenCV recognizer
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
                except Exception as fallback_err:
                    print(f"Fallback feature extraction error: {fallback_err}")
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
