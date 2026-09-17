import cv2
import numpy as np
from typing import Tuple, Dict, Any, Optional
from app.core.config import settings

# Quality thresholds
MIN_FACE_AREA_RATIO = 0.04    # Face must fill at least 4% of image area for registration
MIN_BRIGHTNESS = 40.0         # Min mean pixel brightness (0-255)
MAX_BRIGHTNESS = 235.0        # Max mean pixel brightness (avoid overexposed)


def check_face_quality(
    image_bgr: np.ndarray, 
    face_box: Dict[str, int],
    blur_threshold: Optional[float] = None,
    min_size: Optional[int] = None
) -> Dict[str, Any]:
    """
    Comprehensive Face Quality Assessment.
    Evaluates:
      - Face size (width & height in pixels, and relative area)
      - Sharpness / Blur (Laplacian variance)
      - Lighting / Brightness (mean pixel intensity)
      - Aspect Ratio sanity
    Returns structured quality report.
    """
    blur_threshold = blur_threshold or settings.FACE_BLUR_THRESHOLD
    min_size = min_size or settings.FACE_MIN_SIZE

    h_img, w_img = image_bgr.shape[:2]
    if isinstance(face_box, dict):
        x, y, w, h = face_box['x'], face_box['y'], face_box['w'], face_box['h']
    else:
        x, y, w, h = int(face_box[0]), int(face_box[1]), int(face_box[2]), int(face_box[3])

    # 1. Size check
    size_ok = (w >= min_size and h >= min_size)
    
    # Crop face region
    pad = int(min(w, h) * 0.1)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(w_img, x + w + pad)
    y2 = min(h_img, y + h + pad)
    face_crop = image_bgr[y1:y2, x1:x2]

    if face_crop.size == 0:
        return {
            "size_ok": False,
            "blur_ok": False,
            "brightness_ok": False,
            "aspect_ok": False,
            "overall": "REJECT",
            "blur_score": 0.0,
            "brightness_score": 0.0,
            "reason": "Could not crop face region."
        }

    gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    
    # 2. Blur / Sharpness check (Laplacian variance)
    blur_score = float(cv2.Laplacian(gray_crop, cv2.CV_64F).var())
    blur_ok = (blur_score >= blur_threshold)

    # 3. Brightness check
    brightness_score = float(np.mean(gray_crop))
    brightness_ok = (MIN_BRIGHTNESS <= brightness_score <= MAX_BRIGHTNESS)

    # 4. Aspect ratio check
    aspect = float(w) / float(h) if h > 0 else 0
    aspect_ok = (0.35 <= aspect <= 1.85)

    # Overall decision
    if not size_ok or face_crop.size < 400:
        overall = "REJECT"
        reason = f"Face too small ({w}x{h}px — minimum {min_size}px required)."
    elif not aspect_ok:
        overall = "REJECT"
        reason = "Face geometry or aspect ratio is severely distorted."
    elif not blur_ok and not brightness_ok:
        overall = "POOR"
        reason = f"Low lighting ({brightness_score:.0f}) and blurry ({blur_score:.0f})."
    elif not blur_ok:
        overall = "POOR"
        reason = f"Image is blurry (sharpness score: {blur_score:.0f} — target: ≥{blur_threshold:.0f})."
    elif not brightness_ok:
        overall = "POOR"
        reason = f"Poor illumination (brightness: {brightness_score:.0f})."
    else:
        overall = "GOOD"
        reason = "Good quality face image."

    return {
        "size_ok": size_ok,
        "blur_ok": blur_ok,
        "brightness_ok": brightness_ok,
        "aspect_ok": aspect_ok,
        "overall": overall,  # "GOOD" | "POOR" | "REJECT"
        "blur_score": round(blur_score, 1),
        "brightness_score": round(brightness_score, 1),
        "reason": reason
    }


def check_frame_quality(image_np: np.ndarray, face_box: dict) -> Tuple[bool, str]:
    """Compatibility wrapper for enrollment wizard quality gating."""
    res = check_face_quality(image_np, face_box)
    ok = (res["overall"] == "GOOD")
    return ok, res["reason"]


def detect_single_face_for_scan(image_np: np.ndarray):
    """
    Returns (face_box_dict, cropped_face_np, raw_face, error_str) for guided registration scans.
    Enforces exactly one face is present.
    """
    from app.cv.detector import face_detector

    detected = face_detector.detect_faces(image_np)

    if len(detected) == 0:
        return None, None, None, "No face detected. Please position your face in the center of the camera."
    if len(detected) > 1:
        return None, None, None, f"{len(detected)} faces detected. Only one person should be in front of the camera."

    face_info = detected[0]
    return face_info["box"], face_info["cropped_face"], face_info.get("raw_face"), None
