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

    def calibrate_confidence(self, raw_cosine: float) -> float:
        """
        Accurately maps OpenCV SFace cosine similarity (-1.0 to 1.0) into realistic percentage:
          - raw < 0.60: 5% - 25% (Stranger / Noise)
          - 0.60 - 0.72: 25% - 50% (Unregistered / Lookalike)
          - 0.72 - 0.80: 50% - 75% (Review Zone - ambiguous)
          - 0.80 - 0.88: 75% - 93% (Confirmed High Match)
          - 0.88+: 94% - 99% (Definitive 3D biometric lock)
        """
        if raw_cosine <= 0.40:
            return round(max(0.05, float(raw_cosine * 0.4)), 3)
        elif raw_cosine < 0.60:
            # Scale 0.40 -> 0.60 to 0.16 -> 0.25
            return round(0.16 + (raw_cosine - 0.40) / (0.60 - 0.40) * 0.09, 3)
        elif raw_cosine < 0.72:
            # Scale 0.60 -> 0.72 to 0.25 -> 0.50
            return round(0.25 + (raw_cosine - 0.60) / (0.72 - 0.60) * 0.25, 3)
        elif raw_cosine < 0.80:
            # Scale 0.72 -> 0.80 to 0.50 -> 0.75 (Review Zone)
            return round(0.50 + (raw_cosine - 0.72) / (0.80 - 0.72) * 0.25, 3)
        elif raw_cosine < 0.88:
            # Scale 0.80 -> 0.88 to 0.75 -> 0.93 (Present Zone)
            return round(0.75 + (raw_cosine - 0.80) / (0.88 - 0.80) * 0.18, 3)
        else:
            # Scale 0.88 -> 1.0 to 0.93 -> 0.99
            return min(0.99, round(0.93 + (raw_cosine - 0.88) / (1.0 - 0.88) * 0.06, 3))

    def batch_match_embeddings(
        self,
        candidate_embeddings: List[List[float]],
        student_embeddings_map: Dict[int, List[List[float]]],
        quality_assessments: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        High-Speed Vectorized Batch Matching with Multi-Vector Consensus & Strict 1-to-1 Bipartite Unique Assignment.
        Guarantees that no single student can be claimed by multiple face boxes in the same photo.
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
                {
                    "student_id": None,
                    "match_score": 0.0,
                    "second_best_score": 0.0,
                    "margin": 0.0,
                    "status": "UNKNOWN",
                    "quality_status": "GOOD",
                    "confidence": 0.0,
                    "reason": "No enrolled embeddings registered."
                }
                for _ in candidate_embeddings
            ]

        # Candidate matrix shape: (N, Dim)
        cand_vectors = []
        for cand in candidate_embeddings:
            vec = np.array(cand, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            cand_vectors.append(vec)
        cand_matrix = np.vstack(cand_vectors)
        ref_matrix = np.vstack(ref_vectors)

        # Cosine similarity matrix: (N, M)
        sim_matrix = np.dot(cand_matrix, ref_matrix.T)

        # Build candidate ranked score lists with multi-vector consensus
        cand_ranked_students = []
        for i in range(len(candidate_embeddings)):
            row_sims = sim_matrix[i]
            # Collect all similarities per unique student
            student_raw_sims: Dict[int, List[float]] = {}
            for j, s_id in enumerate(student_ids):
                sim = float(row_sims[j])
                if s_id not in student_raw_sims:
                    student_raw_sims[s_id] = []
                student_raw_sims[s_id].append(sim)

            student_scores_dict: Dict[int, float] = {}
            for s_id, s_sims in student_raw_sims.items():
                s_sims.sort(reverse=True)
                top1 = s_sims[0]
                if len(s_sims) >= 3:
                    # Consensus scoring: 75% Top-1 + 25% Top-2 to filter single-angle lookalike impostors
                    top2 = s_sims[1]
                    consensus = 0.75 * top1 + 0.25 * top2
                    student_scores_dict[s_id] = consensus
                else:
                    student_scores_dict[s_id] = top1

            sorted_scores = sorted(student_scores_dict.items(), key=lambda x: x[1], reverse=True)
            cand_ranked_students.append(sorted_scores)

        # ── Strict 1-to-1 Greedy Bipartite Assignment ──
        # Collect all candidate (cand_idx, student_id, score) pairs
        all_candidate_proposals = []
        for cand_idx, ranked in enumerate(cand_ranked_students):
            for rank_pos, (s_id, score) in enumerate(ranked):
                all_candidate_proposals.append((score, cand_idx, s_id, rank_pos))

        # Sort all proposals by similarity score descending
        all_candidate_proposals.sort(key=lambda x: x[0], reverse=True)

        assigned_faces: Dict[int, Dict[str, Any]] = {}
        claimed_students = set()

        for score, cand_idx, s_id, rank_pos in all_candidate_proposals:
            if cand_idx in assigned_faces:
                continue
            if s_id in claimed_students:
                continue

            q_assessment = quality_assessments[cand_idx] if quality_assessments and cand_idx < len(quality_assessments) else None
            quality_status = q_assessment.get("overall", "GOOD") if q_assessment else "GOOD"
            is_poor_quality = (quality_status in ["POOR", "REJECT"])

            ranked = cand_ranked_students[cand_idx]
            top2_score = ranked[1][1] if len(ranked) > 1 else 0.0
            margin = max(0.0, score - top2_score)

            calibrated_conf = self.calibrate_confidence(score)

            # Strict calibrated thresholds:
            # PRESENT: score >= match_threshold (0.50) and margin >= min_margin (0.08) and not is_poor_quality
            # NEEDS_REVIEW: score >= review_threshold (0.38)
            # UNKNOWN: score < review_threshold (0.38)
            if score < self.review_threshold:
                status_str = "UNKNOWN"
                final_sid = None
                reason = f"Low similarity ({score:.3f} < {self.review_threshold:.2f}) — Unregistered stranger."
            elif score >= self.match_threshold and (margin >= self.min_margin or len(ranked) == 1) and not is_poor_quality:
                status_str = "PRESENT"
                final_sid = s_id
                claimed_students.add(s_id)
                reason = f"High-Confidence Match ({score:.3f}, margin {margin:.3f})."
            else:
                status_str = "NEEDS_REVIEW"
                final_sid = s_id
                claimed_students.add(s_id)
                reasons = []
                if score < self.match_threshold:
                    reasons.append(f"Borderline similarity ({score:.3f} < {self.match_threshold:.2f})")
                if margin < self.min_margin and len(ranked) > 1:
                    reasons.append(f"Ambiguous match (margin {margin:.3f} < {self.min_margin:.2f})")
                if is_poor_quality:
                    reasons.append(f"Image quality warning ({q_assessment.get('reason', '')})")
                reason = "; ".join(reasons) if reasons else "Borderline match flagged for teacher review."

            assigned_faces[cand_idx] = {
                "student_id": final_sid,
                "match_score": round(max(0.0, score), 4),
                "second_best_score": round(max(0.0, top2_score), 4),
                "margin": round(margin, 4),
                "confidence": calibrated_conf,
                "status": status_str,
                "quality_status": quality_status,
                "reason": reason
            }

        # Handle any remaining unassigned candidate faces as UNKNOWN
        results = []
        for i in range(len(candidate_embeddings)):
            if i in assigned_faces:
                results.append(assigned_faces[i])
            else:
                q_assessment = quality_assessments[i] if quality_assessments and i < len(quality_assessments) else None
                results.append({
                    "student_id": None,
                    "match_score": 0.0,
                    "second_best_score": 0.0,
                    "margin": 0.0,
                    "confidence": 0.0,
                    "status": "UNKNOWN",
                    "quality_status": q_assessment.get("overall", "GOOD") if q_assessment else "GOOD",
                    "reason": "Unassigned face crop — Unregistered stranger or duplicate face."
                })

        return results

face_matcher = FaceMatcher()

