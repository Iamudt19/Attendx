"""
Optimization #1: Parallel Multi-Photo Processing via ThreadPoolExecutor
Optimization #7: O(1) Dict-Based Deduplication
=======================================================
Key changes:
  1. process_multiple_classroom_images() now processes all photos in parallel
     using concurrent.futures.ThreadPoolExecutor.  Each photo gets its own
     invocation of process_classroom_image() running on a separate thread.
     The detector's internal threading.Lock() handles the YuNet C++ thread-
     safety constraint while still allowing full parallelism on the
     decode → quality → embed → match path.
  2. Deduplication is now purely O(1) dict lookups — no nested loops.
  3. Single-photo path unchanged to avoid any regression.
"""
import time
import logging
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

from app.cv.detector import face_detector
from app.cv.quality import check_face_quality
from app.cv.aligner import face_aligner
from app.cv.embedder import face_embedder
from app.cv.matcher import face_matcher

logger = logging.getLogger(__name__)

# Tune: max parallel photo threads.  Keep ≤ CPU cores to avoid contention.
_MAX_PHOTO_WORKERS = 4


class RecognitionPipeline:
    """
    End-to-End Face Recognition & Attendance Pipeline.

    Workflow:
    1. Decode classroom image.
    2. Detect all faces + 5 landmarks using YuNet (fixed-size, thread-safe).
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

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _fix_exif_orientation(image_bytes: bytes, img: np.ndarray) -> np.ndarray:
        """Apply EXIF orientation rotation so faces are always upright for detection."""
        try:
            if len(image_bytes) < 12 or image_bytes[0:2] != b'\xff\xd8':
                return img

            offset = 2
            while offset < min(len(image_bytes), 65536):
                if image_bytes[offset] != 0xFF:
                    break
                marker = image_bytes[offset + 1]
                if marker == 0xE1:
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
                            if tag == 0x0112:
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

    # ------------------------------------------------------------------
    # Core: single-image processing (unchanged logic, fully reusable)
    # ------------------------------------------------------------------

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

        # 2. Detect faces (thread-safe: detector uses internal lock)
        detected = self.detector.detect_faces(img)
        total_detected = len(detected)

        quality_warnings = []
        small_faces_count = 0
        blurry_faces_count = 0

        recognized_faces = []
        detected_student_matches: Dict[int, Dict[str, Any]] = {}

        # 3. Quality assessment
        quality_infos = []
        for item in detected:
            box = item["box"]
            q_info = check_face_quality(img, box)
            quality_infos.append(q_info)
            if not q_info["size_ok"]:
                small_faces_count += 1
            if not q_info["blur_ok"]:
                blurry_faces_count += 1

        # 4. Optimization #3: Batch embedding extraction (single ONNX call group)
        candidate_embs = self.embedder.compute_embeddings_batch(
            faces_data=detected,
            full_image_bgr=img
        )

        # 5. Vectorized batch matching (single NumPy matmul, no Python loops over students)
        matches = self.matcher.batch_match_embeddings(
            candidate_embeddings=candidate_embs,
            student_embeddings_map=student_embeddings_map,
            quality_assessments=quality_infos
        )

        # 6. Build recognized faces list
        # Optimization #7: O(1) student lookup dict instead of inner for-loop
        enrolled_index: Dict[int, Dict] = {s["id"]: s for s in enrolled_students}

        for idx, item in enumerate(detected):
            box = item["box"]
            quality_info = quality_infos[idx]
            match = matches[idx]

            matched_student_id = match["student_id"]
            match_score = match["match_score"]
            second_best = match["second_best_score"]
            margin = match["margin"]
            status = match["status"]

            matched_student_info = enrolled_index.get(matched_student_id) if matched_student_id else None

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
                    "confidence": match_score,
                    "quality": quality_info,
                    "status": status,
                    "verification_status": "AUTO" if status == "PRESENT" else "NEEDS_REVIEW",
                    "reason": match["reason"]
                }
                sid = matched_student_info["id"]
                if sid not in detected_student_matches or match_score > detected_student_matches[sid]["match_score"]:
                    detected_student_matches[sid] = {
                        "match_score": match_score,
                        "status": status,
                        "verification_status": "AUTO" if status == "PRESENT" else "NEEDS_REVIEW"
                    }
            else:
                rec_face = {
                    "box": box,
                    "student_id": None,
                    "custom_student_id": None,
                    "name": f"Unknown Face #{idx + 1}",
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

        # 7. Quality warnings
        if small_faces_count > 0:
            quality_warnings.append(f"{small_faces_count} face(s) are too small — consider moving closer.")
        if blurry_faces_count > 0:
            quality_warnings.append(f"{blurry_faces_count} face(s) have motion blur or poor lighting.")

        # 8. Proposed attendance for ALL enrolled students
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

    # ------------------------------------------------------------------
    # Optimization #1: Parallel multi-photo processing
    # ------------------------------------------------------------------

    def process_multiple_classroom_images(
        self,
        images_bytes_list: List[bytes],
        enrolled_students: List[Dict[str, Any]],
        student_embeddings_map: Dict[int, List[List[float]]]
    ) -> Dict[str, Any]:
        """
        Process multiple classroom photos IN PARALLEL using ThreadPoolExecutor.

        Each photo is dispatched to a worker thread that runs the full
        decode → detect → embed → match pipeline concurrently.  The
        YuNet C++ detector is protected internally by a threading.Lock()
        in FaceDetector, so detection is serialized while all other
        per-photo work (NumPy decoding, SFace embedding, cosine matching)
        runs truly in parallel.

        Results from all photos are merged and deduplicated (highest-confidence
        detection per student wins) to produce a single unified attendance record.
        """
        start_time = time.time()
        n_photos = len(images_bytes_list)

        # Dict: img_idx -> single_res or Exception
        photo_results: Dict[int, Any] = {}

        # --- Optimization #1: parallel dispatch ---
        max_workers = min(_MAX_PHOTO_WORKERS, n_photos)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_idx = {
                executor.submit(
                    self.process_classroom_image,
                    img_bytes,
                    enrolled_students,
                    student_embeddings_map
                ): idx
                for idx, img_bytes in enumerate(images_bytes_list)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    photo_results[idx] = future.result()
                except Exception as e:
                    logger.error(f"Image processing error for Photo #{idx + 1}: {e}")
                    photo_results[idx] = e

        # --- Merge results in original order ---
        all_recognized_faces: List[Dict] = []
        # Optimization #7: O(1) dedup dict: student_db_id → best match info
        detected_student_matches: Dict[int, Dict[str, Any]] = {}
        all_quality_warnings: List[str] = []
        total_detected_overall = 0

        for img_idx in range(n_photos):
            res = photo_results.get(img_idx)
            if isinstance(res, Exception):
                all_quality_warnings.append(f"Photo #{img_idx + 1} could not be processed: {res}")
                continue

            total_detected_overall += res["total_detected_faces"]

            for face in res["recognized_faces"]:
                face_copy = dict(face)
                face_copy["image_index"] = img_idx
                all_recognized_faces.append(face_copy)

                sid = face_copy.get("student_id")
                if sid is not None:
                    score = face_copy.get("match_score", 0.0)
                    status = face_copy.get("status", "NEEDS_REVIEW")
                    v_status = face_copy.get("verification_status", "NEEDS_REVIEW")

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

            for w in res.get("quality_warnings", []):
                all_quality_warnings.append(f"Photo #{img_idx + 1}: {w}")

        # --- Build unified attendance ---
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
            f"Parallel multi-photo analysis complete ({n_photos} photos, {max_workers} workers) in {duration:.2f}s | "
            f"Total Faces: {total_detected_overall}, Unique Present: {present_count}, "
            f"Review: {needs_review_count}, Absent: {absent_count}"
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
