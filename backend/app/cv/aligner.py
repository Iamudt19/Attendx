import cv2
import numpy as np
from typing import Optional, Any


class FaceAligner:
    """
    Face alignment utility.
    Uses 5 facial landmarks (right eye, left eye, nose tip, right mouth corner, left mouth corner)
    to compute an affine transformation mapping facial features to standard canonical coordinates.
    """
    def __init__(self, output_size: tuple = (112, 112)):
        self.output_size = output_size

    def align_face(
        self, 
        image_bgr: np.ndarray, 
        raw_face: Optional[Any] = None,
        crop_box: Optional[dict] = None
    ) -> np.ndarray:
        """
        Aligns a face image to standard canonical size using 5-point landmarks if available,
        or center-padded proportional resize.
        """
        if image_bgr is None or image_bgr.size == 0:
            return np.zeros((self.output_size[1], self.output_size[0], 3), dtype=np.uint8)

        # If raw_face array from YuNet is provided with 5 landmarks
        if raw_face is not None and len(raw_face) >= 14:
            try:
                # 5 landmark points from YuNet:
                # right eye: [4, 5], left eye: [6, 7], nose: [8, 9], right mouth: [10, 11], left mouth: [12, 13]
                src_pts = np.array([
                    [raw_face[4], raw_face[5]],
                    [raw_face[6], raw_face[7]],
                    [raw_face[8], raw_face[9]],
                    [raw_face[10], raw_face[11]],
                    [raw_face[12], raw_face[13]],
                ], dtype=np.float32)

                # Standard ArcFace/SFace 112x112 canonical reference landmarks
                dst_pts = np.array([
                    [38.2946, 51.6963],
                    [73.5318, 51.5014],
                    [56.0252, 71.7366],
                    [41.5493, 92.3655],
                    [70.7299, 92.2041]
                ], dtype=np.float32)

                # Scale destination points to output_size if different from 112x112
                if self.output_size != (112, 112):
                    dst_pts[:, 0] *= (self.output_size[0] / 112.0)
                    dst_pts[:, 1] *= (self.output_size[1] / 112.0)

                tfm, _ = cv2.estimateAffinePartial2D(src_pts, dst_pts)
                if tfm is not None:
                    aligned = cv2.warpAffine(
                        image_bgr, tfm, self.output_size, borderMode=cv2.BORDER_REPLICATE
                    )
                    return aligned
            except Exception:
                pass

        # Fallback to crop and proportional resize
        if crop_box is not None:
            h_img, w_img = image_bgr.shape[:2]
            x1 = max(0, crop_box['x'])
            y1 = max(0, crop_box['y'])
            x2 = min(w_img, crop_box['x'] + crop_box['w'])
            y2 = min(h_img, crop_box['y'] + crop_box['h'])
            cropped = image_bgr[y1:y2, x1:x2]
            if cropped.size > 0:
                return cv2.resize(cropped, self.output_size)

        return cv2.resize(image_bgr, self.output_size)


face_aligner = FaceAligner()
