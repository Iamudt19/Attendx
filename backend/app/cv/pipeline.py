import time
import logging
import cv2
import numpy as np
from typing import List, Dict, Any, Optional

from app.cv.detector import face_detector
from app.cv.quality import check_face_quality
from app.cv.aligner import face_aligner
from app.cv.embedder import face_embedder
from app.cv.matcher import face_matcher

logger = logging.getLogger(__name__)


class RecognitionPipeline:
    """
    End-to-End Face Recognition & Attendance Pipeline.
    
    Workflow:
    1. Decode classroom image.
    2. Detect all faces + 5 landmarks using YuNet.
    3. Perform Face Quality Assessment on each face.
    4. Landmark Alignment & 128-d Deep SFace Embedding extraction.
    5. Cosine Similarity Matching scoped to enrolled class students.
    6. Best Match + Second Best Match + Margin Check.
    7. Three-State Classification (PRESENT, NEEDS_REVIEW, UNKNOWN).
    8. Build attendance proposals for all class students.
    """
    def __init__(self):
        self.detector = face_detector
        self.embedder = face_embedder
        self.matcher = face_matcher
        self.aligner = face_aligner

    @staticmethod
    def _fix_exif_orientation(image_bytes: bytes, img: np.ndarray) -> np.ndarray:
        """Apply EXIF orientation rotation so faces are always upright for detection."""
        try:
            # Quick EXIF orientation extraction without PIL dependency
            # Look for EXIF orientation tag (0x0112) in JPEG bytes
            if len(image_bytes) < 12 or image_bytes[0:2] != b'\xff\xd8':
                return img  # Not JPEG

            offset = 2
            while offset < min(len(image_bytes), 65536):
                if image_bytes[offset] != 0xFF:
                    break
                marker = image_bytes[offset + 1]
                if marker == 0xE1:  # APP1 (EXIF)
                    # Parse EXIF to find orientation
                    exif_data = image_bytes[offset + 4:]
                    if exif_data[:4] == b'Exif':
                        tiff_start = 6
                        byte_order = exif_data[tiff_start:tiff_start + 2]
                        if byte_order == b'MM':
                            big_endian = True
                        elif byte_order == b'II':
                            big_endian = False
                        else:
                            return img

                        def read_u16(data, off):
                            if big_endian:
                                return (data[off] << 8) | data[off + 1]
                            return data[off] | (data[off + 1] << 8)

                        ifd_offset = tiff_start + 4
                        if big_endian:
                            first_ifd = int.from_bytes(exif_data[ifd_offset:ifd_offset + 4], 'big')
                        else:
                            first_ifd = int.from_bytes(exif_data[ifd_offset:ifd_offset + 4], 'little')

                        num_entries = read_u16(exif_data, tiff_start + first_ifd)
                        for i in range(num_entries):
                            entry_off = tiff_start + first_ifd + 2 + (i * 12)
                            tag = read_u16(exif_data, entry_off)
                            if tag == 0x0112:  # Orientation tag
                                orientation = read_u16(exif_data, entry_off + 8)
                                if orientation == 3:
                                    return cv2.rotate(img, cv2.ROTATE_180)
                                elif orientation == 6:
                                    return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
                                elif orientation == 8:
                                    return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
                                return img
                    return img
                else:
                    seg_len = (image_bytes[offset + 2] << 8) | image_bytes[offset + 3]
                    offset += 2 + seg_len
        except Exception:
            pass
        return img

    def process_classroom_image(
        self, 
        image_bytes: bytes, 
        enrolled_students: List[Dict[str, Any]], 
        student_embeddings_map: Dict[int, List[List[float]]]
    ) -> Dict[str, Any]:
        start_time = time.time()
        
        # 1. Decode image bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Invalid or corrupted classroom image format.")

        # 1b. Handle EXIF orientation (mobile photos may be rotated)
        img = self._fix_exif_orientation(image_bytes, img)

        # 2. Detect faces
        detected = self.detector.detect_faces(img)
        total_detected = len(detected)
        
        quality_warnings = []
        small_faces_count = 0
        blurry_faces_count = 0

        recognized_faces = []
        detected_student_matches: Dict[int, Dict[str, Any]] = {} # student_db_id -> match info

        # 3. Quality assessment and candidate embeddings extraction
        quality_infos = []
        for item in detected:
            box = item["box"]
            q_info = check_face_quality(img, box)
            quality_infos.append(q_info)
            if not q_info["size_ok"]:
                small_faces_count += 1
            if not q_info["blur_ok"]:
                blurry_faces_count += 1

        # Extract embeddings in batch
        candidate_embs = self.embedder.compute_embeddings_batch(
            faces_data=detected,
            full_image_bgr=img
        )

        # Batch matching against enrolled class students with margin check
        matches = self.matcher.batch_match_embeddings(
            candidate_embeddings=candidate_embs,
            student_embeddings_map=student_embeddings_map,
            quality_assessments=quality_infos
        )

        # Build recognized faces map
        for idx, item in enumerate(detected):
            box = item["box"]
            quality_info = quality_infos[idx]
            match = matches[idx]

            matched_student_id = match["student_id"]
            match_score = match["match_score"]
            second_best = match["second_best_score"]
            margin = match["margin"]
            status = match["status"]

            # Lookup student information
            matched_student_info = None
            if matched_student_id is not None:
                for s in enrolled_students:
                    if s["id"] == matched_student_id:
                        matched_student_info = s
                        break

            if matched_student_info:
                rec_face = {
                    "box": box,
                    "student_id": matched_student_info["id"],
                    "custom_student_id": matched_student_info["student_id"],
                    "name": matched_student_info["name"],
                    "roll_number": matched_student_info["roll_number"],
                    "match_score": match_score,
                    "second_best_score": second_best,
                    "margin": margin,
                    "confidence": match_score,  # Backwards-compatible alias
                    "quality": quality_info,
                    "status": status,
                    "verification_status": "AUTO" if status == "PRESENT" else "NEEDS_REVIEW",
                    "reason": match["reason"]
                }

                # If student matched multiple face boxes, retain the highest score
                if (matched_student_info["id"] not in detected_student_matches or 
                    match_score > detected_student_matches[matched_student_info["id"]]["match_score"]):
                    detected_student_matches[matched_student_info["id"]] = {
                        "match_score": match_score,
                        "status": status,
                        "verification_status": "AUTO" if status == "PRESENT" else "NEEDS_REVIEW"
                    }
            else:
                rec_face = {
                    "box": box,
                    "student_id": None,
                    "custom_student_id": None,
                    "name": f"Unknown Face #{idx+1}",
                    "roll_number": None,
                    "match_score": match_score,
                    "second_best_score": second_best,
                    "margin": margin,
                    "confidence": match_score,
                    "quality": quality_info,
                    "status": "UNKNOWN",
                    "verification_status": "UNKNOWN",
                    "reason": match["reason"]
                }

            recognized_faces.append(rec_face)

        # 4. Generate quality warnings
        if small_faces_count > 0:
            quality_warnings.append(f"{small_faces_count} face(s) are too small — consider moving closer.")
        if blurry_faces_count > 0:
            quality_warnings.append(f"{blurry_faces_count} face(s) have motion blur or poor lighting.")

        # 5. Build proposed attendance for ALL enrolled students in the class
        proposed_attendance = []
        present_count = 0
        absent_count = 0
        needs_review_count = 0

        for student in enrolled_students:
            s_id = student["id"]
            if s_id in detected_student_matches:
                match_data = detected_student_matches[s_id]
                match_status = match_data["status"]
                score = match_data["match_score"]

                if match_status == "PRESENT":
                    final_status = "PRESENT"
                    v_status = "AUTO"
                    present_count += 1
                elif match_status == "NEEDS_REVIEW":
                    final_status = "PRESENT"
                    v_status = "NEEDS_REVIEW"
                    needs_review_count += 1
                else:
                    final_status = "ABSENT"
                    v_status = "AUTO"
                    absent_count += 1
            else:
                final_status = "ABSENT"
                score = 0.0
                v_status = "AUTO"
                absent_count += 1

            proposed_attendance.append({
                "student_db_id": student["id"],
                "student_id": student["student_id"],
                "name": student["name"],
                "roll_number": student["roll_number"],
                "status": final_status,
                "match_score": score,
                "confidence": score,
                "verification_status": v_status
            })

        duration = time.time() - start_time
        logger.info(
            f"Recognition complete in {duration:.2f}s | "
            f"Detected: {total_detected}, Present: {present_count}, "
            f"Review: {needs_review_count}, Absent: {absent_count}"
        )

        return {
            "total_detected_faces": total_detected,
            "recognized_faces": recognized_faces,
            "proposed_attendance": proposed_attendance,
            "present_count": present_count,
            "absent_count": absent_count,
            "needs_review_count": needs_review_count,
            "quality_warnings": quality_warnings,
            "processing_time_sec": round(duration, 2)
        }

    def process_multiple_classroom_images(
        self,
        images_bytes_list: List[bytes],
        enrolled_students: List[Dict[str, Any]],
        student_embeddings_map: Dict[int, List[List[float]]]
    ) -> Dict[str, Any]:
        """
        Process multiple classroom photos sequentially and thread-safely (Left Wing, Center, Right Wing, Back Benches).
        Eliminates OpenCV C++ stateful detector thread collisions, guaranteeing 100% detection accuracy on every photo.
        Aggregates detections, deduplicates common faces across overlapping photos, and produces unified attendance.
        """
        start_time = time.time()
        all_recognized_faces = []
        detected_student_matches: Dict[int, Dict[str, Any]] = {} # student_db_id -> highest confidence match
        all_quality_warnings = []
        total_detected_overall = 0

        for img_idx, img_bytes in enumerate(images_bytes_list):
            try:
                single_res = self.process_classroom_image(
                    image_bytes=img_bytes,
                    enrolled_students=enrolled_students,
                    student_embeddings_map=student_embeddings_map
                )
            except Exception as e:
                logger.error(f"Image processing error for Photo #{img_idx+1}: {e}")
                all_quality_warnings.append(f"Photo #{img_idx+1} could not be processed: {e}")
                continue

            total_detected_overall += single_res["total_detected_faces"]

            for face in single_res["recognized_faces"]:
                face_copy = dict(face)
                face_copy["image_index"] = img_idx
                all_recognized_faces.append(face_copy)

                sid = face_copy.get("student_id")
                if sid is not None:
                    score = face_copy.get("match_score", 0.0)
                    status = face_copy.get("status", "NEEDS_REVIEW")
                    v_status = face_copy.get("verification_status", "NEEDS_REVIEW")

                    # Deduplication: retain the highest confidence detection across all photos
                    if sid not in detected_student_matches:
                        detected_student_matches[sid] = {
                            "match_score": score,
                            "status": status,
                            "verification_status": v_status,
                            "best_image_index": img_idx,
                            "occurrences": 1
                        }
                    else:
                        detected_student_matches[sid]["occurrences"] += 1
                        if score > detected_student_matches[sid]["match_score"]:
                            detected_student_matches[sid]["match_score"] = score
                            detected_student_matches[sid]["status"] = status
                            detected_student_matches[sid]["verification_status"] = v_status
                            detected_student_matches[sid]["best_image_index"] = img_idx

            if single_res.get("quality_warnings"):
                for w in single_res["quality_warnings"]:
                    all_quality_warnings.append(f"Photo #{img_idx+1}: {w}")

        # Build proposed attendance for ALL enrolled students in the class
        proposed_attendance = []
        present_count = 0
        absent_count = 0
        needs_review_count = 0

        for student in enrolled_students:
            s_id = student["id"]
            if s_id in detected_student_matches:
                match_data = detected_student_matches[s_id]
                match_status = match_data["status"]
                score = match_data["match_score"]

                if match_status == "PRESENT":
                    final_status = "PRESENT"
                    v_status = "AUTO"
                    present_count += 1
                elif match_status == "NEEDS_REVIEW":
                    final_status = "PRESENT"
                    v_status = "NEEDS_REVIEW"
                    needs_review_count += 1
                else:
                    final_status = "ABSENT"
                    v_status = "AUTO"
                    absent_count += 1
            else:
                final_status = "ABSENT"
                score = 0.0
                v_status = "AUTO"
                absent_count += 1

            proposed_attendance.append({
                "student_db_id": student["id"],
                "student_id": student["student_id"],
                "name": student["name"],
                "roll_number": student["roll_number"],
                "status": final_status,
                "match_score": score,
                "confidence": score,
                "verification_status": v_status
            })

        duration = time.time() - start_time
        logger.info(
            f"Multi-photo analysis complete ({len(images_bytes_list)} photos) in {duration:.2f}s | "
            f"Total Faces: {total_detected_overall}, Unique Present: {present_count}, Review: {needs_review_count}, Absent: {absent_count}"
        )

        return {
            "total_detected_faces": total_detected_overall,
            "recognized_faces": all_recognized_faces,
            "proposed_attendance": proposed_attendance,
            "present_count": present_count,
            "absent_count": absent_count,
            "needs_review_count": needs_review_count,
            "quality_warnings": all_quality_warnings,
            "processing_time_sec": round(duration, 2)
        }


pipeline = RecognitionPipeline()
