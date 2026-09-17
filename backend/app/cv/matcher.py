import numpy as np
from typing import List, Dict, Any, Optional
from app.core.config import settings


class FaceMatcher:
    """
    Robust Face Matcher using Normalized Cosine Similarity and Top-1 vs Top-2 Margin Check.
    
    Principles:
    1. A wrong positive recognition is worse than an uncertain result.
    2. Uses Best Match Score + Second Best Match Score + Margin gap.
    3. Three-state classification:
       - PRESENT:      Match Score >= Match Threshold AND Margin >= Min Margin
       - NEEDS_REVIEW: Match Score >= Review Threshold OR (Match Score >= Match Threshold AND Margin < Min Margin)
       - UNKNOWN:      Match Score < Review Threshold
    """
    def __init__(
        self, 
        match_threshold: Optional[float] = None, 
        review_threshold: Optional[float] = None,
        min_margin: Optional[float] = None
    ):
        self.match_threshold = match_threshold if match_threshold is not None else settings.FACE_MATCH_THRESHOLD
        self.review_threshold = review_threshold if review_threshold is not None else settings.FACE_REVIEW_THRESHOLD
        self.min_margin = min_margin if min_margin is not None else settings.FACE_MIN_MARGIN

    def match_embedding(
        self, 
        candidate_embedding: List[float], 
        student_embeddings_map: Dict[int, List[List[float]]],
        quality_assessment: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Compare query candidate embedding against all enrolled students in the target class.
        
        Args:
            candidate_embedding: 128-d float embedding of detected face crop
            student_embeddings_map: { student_db_id: [ [128-d float list], ... ] }
            quality_assessment: Optional dict from check_face_quality()
            
        Returns:
            {
                "student_id": int or None,
                "match_score": float,            # Raw Cosine Similarity of Top-1 match (0.0 to 1.0)
                "second_best_score": float,      # Raw Cosine Similarity of Top-2 match
                "margin": float,                 # Gap between Top-1 and Top-2 match
                "status": "PRESENT" | "NEEDS_REVIEW" | "UNKNOWN",
                "quality_status": "GOOD" | "POOR" | "REJECT",
                "reason": str
            }
        """
        if not candidate_embedding or not student_embeddings_map:
            return {
                "student_id": None,
                "match_score": 0.0,
                "second_best_score": 0.0,
                "margin": 0.0,
                "status": "UNKNOWN",
                "quality_status": "GOOD" if not quality_assessment else quality_assessment.get("overall", "GOOD"),
                "reason": "No candidate embedding or no registered student embeddings."
            }

        cand_vec = np.array(candidate_embedding, dtype=np.float32)
        cand_norm = np.linalg.norm(cand_vec)
        if cand_norm > 0:
            cand_vec = cand_vec / cand_norm

        # Collect the maximum cosine similarity score per student
        student_scores = []  # list of (student_id, max_sim)

        for student_id, ref_embeddings in student_embeddings_map.items():
            if not ref_embeddings:
                continue
            student_max_sim = -1.0
            for ref_emb in ref_embeddings:
                ref_vec = np.array(ref_emb, dtype=np.float32)
                ref_norm = np.linalg.norm(ref_vec)
                if ref_norm > 0:
                    ref_vec = ref_vec / ref_norm
                
                sim = float(np.dot(cand_vec, ref_vec))
                if sim > student_max_sim:
                    student_max_sim = sim

            if student_max_sim > -1.0:
                student_scores.append((student_id, float(student_max_sim)))

        if not student_scores:
            return {
                "student_id": None,
                "match_score": 0.0,
                "second_best_score": 0.0,
                "margin": 0.0,
                "status": "UNKNOWN",
                "quality_status": "GOOD" if not quality_assessment else quality_assessment.get("overall", "GOOD"),
                "reason": "No valid similarity scores found."
            }

        # Sort descending by match score
        student_scores.sort(key=lambda x: x[1], reverse=True)
        top1_student_id, top1_score = student_scores[0]
        top2_score = student_scores[1][1] if len(student_scores) > 1 else 0.0
        margin = max(0.0, top1_score - top2_score)

        # Quality check impact
        quality_status = quality_assessment.get("overall", "GOOD") if quality_assessment else "GOOD"
        is_poor_quality = (quality_status in ["POOR", "REJECT"])

        # Decision Logic:
        # 1. Below Review Threshold → UNKNOWN
        if top1_score < self.review_threshold:
            status_str = "UNKNOWN"
            final_student_id = None
            reason = f"Match score {top1_score:.3f} is below review threshold ({self.review_threshold:.2f})."

        # 2. Above Match Threshold AND Margin OK AND Good Quality → PRESENT
        elif top1_score >= self.match_threshold and margin >= self.min_margin and not is_poor_quality:
            status_str = "PRESENT"
            final_student_id = top1_student_id
            reason = f"High similarity ({top1_score:.3f}) and clear margin ({margin:.3f})."

        # 3. Ambiguous margin OR Review threshold OR Poor quality → NEEDS_REVIEW
        else:
            status_str = "NEEDS_REVIEW"
            final_student_id = top1_student_id
            reasons = []
            if top1_score < self.match_threshold:
                reasons.append(f"Moderate similarity ({top1_score:.3f} < {self.match_threshold:.2f})")
            if margin < self.min_margin and len(student_scores) > 1:
                reasons.append(f"Ambiguous match (margin {margin:.3f} < {self.min_margin:.2f})")
            if is_poor_quality:
                reasons.append(f"Poor image quality ({quality_assessment.get('reason', '')})")
            reason = "; ".join(reasons) if reasons else "Marked for teacher verification."

        return {
            "student_id": final_student_id,
            "match_score": round(max(0.0, top1_score), 4),
            "second_best_score": round(max(0.0, top2_score), 4),
            "margin": round(margin, 4),
            "status": status_str,
            "quality_status": quality_status,
            "reason": reason
        }


face_matcher = FaceMatcher()
