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

        # 2. Detect faces
        detected = self.detector.detect_faces(img)
        total_detected = len(detected)
        
        quality_warnings = []
        small_faces_count = 0
        blurry_faces_count = 0

        recognized_faces = []
        detected_student_matches: Dict[int, Dict[str, Any]] = {} # student_db_id -> match info

        # 3. Process each detected face
        for idx, item in enumerate(detected):
            box = item["box"]
            cropped = item["cropped_face"]
            raw_face = item.get("raw_face")

            # Quality assessment
            quality_info = check_face_quality(img, box)
            if not quality_info["size_ok"]:
                small_faces_count += 1
            if not quality_info["blur_ok"]:
                blurry_faces_count += 1

            # Landmark alignment & Deep embedding
            candidate_emb = self.embedder.compute_embedding(
                face_image_bgr=cropped,
                full_image_bgr=img,
                raw_face=raw_face
            )

            # Cosine matching against enrolled class students with margin check
            match = self.matcher.match_embedding(
                candidate_embedding=candidate_emb,
                student_embeddings_map=student_embeddings_map,
                quality_assessment=quality_info
            )

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


pipeline = RecognitionPipeline()
