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

    def batch_match_embeddings(
        self,
        candidate_embeddings: List[List[float]],
        student_embeddings_map: Dict[int, List[List[float]]],
        quality_assessments: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        High-Speed Vectorized Batch Matching using Matrix Multiplication (Q @ K.T).
        Matches N candidate faces against M enrolled student embeddings in sub-millisecond C/NumPy BLAS.
        """
        if not candidate_embeddings:
            return []

        # Prepare enrolled matrix and lookup index
        student_ids = []
        ref_vectors = []
        for s_id, embs in student_embeddings_map.items():
            for emb in embs:
                vec = np.array(emb, dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                    student_ids.append(s_id)
                    ref_vectors.append(vec)

        if not ref_vectors:
            return [
                self.match_embedding(
                    cand, 
                    student_embeddings_map, 
                    quality_assessments[i] if quality_assessments and i < len(quality_assessments) else None
                )
                for i, cand in enumerate(candidate_embeddings)
            ]

        # Ref matrix shape: (M, Dim)
        ref_matrix = np.vstack(ref_vectors)
        # Candidate matrix shape: (N, Dim)
        cand_vectors = []
        for cand in candidate_embeddings:
            vec = np.array(cand, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            cand_vectors.append(vec)
        cand_matrix = np.vstack(cand_vectors)

        # Cosine similarity matrix: (N, M)
        sim_matrix = np.dot(cand_matrix, ref_matrix.T)

        num_faces = len(candidate_embeddings)
        face_student_scores: List[Dict[int, float]] = []

        for i in range(num_faces):
            row_sims = sim_matrix[i]
            # Group maximum similarity per unique student
            student_scores_dict: Dict[int, float] = {}
            for j, s_id in enumerate(student_ids):
                sim = float(row_sims[j])
                if s_id not in student_scores_dict or sim > student_scores_dict[s_id]:
                    student_scores_dict[s_id] = sim
            face_student_scores.append(student_scores_dict)

        # ── 1 Identity = 1 Face Constraint (Competitive Bipartite Matching) ──
        # When multiple faces in the same photograph match the same student (e.g. Face 1 -> Udit 96%, Face 2 -> Udit 94%),
        # the identity is awarded to the highest-confidence face.
        # Competing faces then fall back to their next best unclaimed student match or UNKNOWN.
        
        # Collect all candidate pairs: (similarity_score, face_index, student_id)
        all_match_candidates = []
        for face_idx, scores_dict in enumerate(face_student_scores):
            for s_id, sim in scores_dict.items():
                if sim >= self.review_threshold:
                    all_match_candidates.append((sim, face_idx, s_id))

        # Sort all possible pairings globally by similarity descending
        all_match_candidates.sort(key=lambda x: x[0], reverse=True)

        assigned_face_to_student: Dict[int, int] = {}
        claimed_students = set()

        for sim, face_idx, s_id in all_match_candidates:
            if face_idx not in assigned_face_to_student and s_id not in claimed_students:
                assigned_face_to_student[face_idx] = s_id
                claimed_students.add(s_id)

        # Construct final results per candidate face
        results = []
        for i in range(num_faces):
            q_assessment = quality_assessments[i] if quality_assessments and i < len(quality_assessments) else None
            quality_status = q_assessment.get("overall", "GOOD") if q_assessment else "GOOD"
            is_poor_quality = (quality_status in ["POOR", "REJECT"])

            scores_dict = face_student_scores[i]
            student_scores = sorted(scores_dict.items(), key=lambda x: x[1], reverse=True)

            if not student_scores:
                results.append({
                    "student_id": None,
                    "match_score": 0.0,
                    "second_best_score": 0.0,
                    "margin": 0.0,
                    "status": "UNKNOWN",
                    "quality_status": quality_status,
                    "reason": "No enrolled embeddings."
                })
                continue

            # Check if this face was awarded a unique identity under the 1-to-1 constraint
            assigned_student_id = assigned_face_to_student.get(i)

            if assigned_student_id is not None:
                # Awarded student match
                top1_student_id = assigned_student_id
                top1_score = scores_dict.get(top1_student_id, 0.0)

                # Second best among other students
                other_scores = [score for s_id, score in student_scores if s_id != top1_student_id]
                top2_score = other_scores[0] if other_scores else 0.0
                margin = max(0.0, top1_score - top2_score)

                if top1_score < self.review_threshold:
                    status_str = "UNKNOWN"
                    final_student_id = None
                    reason = f"Match score {top1_score:.3f} is below review threshold ({self.review_threshold:.2f})."
                elif top1_score >= self.match_threshold and margin >= self.min_margin and not is_poor_quality:
                    status_str = "PRESENT"
                    final_student_id = top1_student_id
                    reason = f"High similarity ({top1_score:.3f}) and clear margin ({margin:.3f})."
                else:
                    status_str = "NEEDS_REVIEW"
                    final_student_id = top1_student_id
                    reasons = []
                    if top1_score < self.match_threshold:
                        reasons.append(f"Moderate similarity ({top1_score:.3f} < {self.match_threshold:.2f})")
                    if margin < self.min_margin and len(student_scores) > 1:
                        reasons.append(f"Ambiguous match (margin {margin:.3f} < {self.min_margin:.2f})")
                    if is_poor_quality:
                        reasons.append(f"Poor image quality ({q_assessment.get('reason', '')})")
                    reason = "; ".join(reasons) if reasons else "Marked for teacher verification."
            else:
                # This face's candidate student was already claimed by a higher-confidence face in the same photo
                top1_student_id = student_scores[0][0]
                top1_score = student_scores[0][1]
                top2_score = student_scores[1][1] if len(student_scores) > 1 else 0.0
                margin = max(0.0, top1_score - top2_score)
                status_str = "UNKNOWN"
                final_student_id = None
                reason = f"Duplicate identity suppressed: student was matched to another face with higher confidence."

            results.append({
                "student_id": final_student_id,
                "match_score": round(max(0.0, top1_score), 4),
                "second_best_score": round(max(0.0, top2_score), 4),
                "margin": round(margin, 4),
                "status": status_str,
                "quality_status": quality_status,
                "reason": reason
            })

        return results


face_matcher = FaceMatcher()
