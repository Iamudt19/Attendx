"""
AttendX Face Recognition Pipeline Calibration & Evaluation Tool
Evaluates Genuine (same student) and Impostor (different student) similarity distributions,
calculates FAR/FRR metrics across thresholds, and outputs a detailed calibration report.
"""
import os
import sys
import json
import numpy as np

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.models import Student, FaceEmbedding
from app.core.config import settings


def run_evaluation():
    db = SessionLocal()
    students = db.query(Student).all()

    # Collect embeddings per student
    student_embs = {}
    for s in students:
        embs = [np.array(e.embedding, dtype=np.float32) for e in s.embeddings if e.embedding]
        # Normalize
        normalized = []
        for vec in embs:
            norm = np.linalg.norm(vec)
            if norm > 0:
                normalized.append(vec / norm)
        if normalized:
            student_embs[s.id] = {
                "name": s.name,
                "student_id": s.student_id,
                "embeddings": normalized
            }

    print(f"\n=======================================================")
    print(f" AttendX Face Recognition Calibration Benchmark")
    print(f" Loaded {len(student_embs)} students with registered embeddings")
    print(f"=======================================================\n")

    genuine_scores = []
    impostor_scores = []

    student_ids = list(student_embs.keys())

    # 1. Genuine comparisons (same student, pair-wise)
    for s_id in student_ids:
        embs = student_embs[s_id]["embeddings"]
        for i in range(len(embs)):
            for j in range(i + 1, len(embs)):
                sim = float(np.dot(embs[i], embs[j]))
                genuine_scores.append(sim)

    # 2. Impostor comparisons (cross-student pairs)
    for i in range(len(student_ids)):
        for j in range(i + 1, len(student_ids)):
            s1_embs = student_embs[student_ids[i]]["embeddings"]
            s2_embs = student_embs[student_ids[j]]["embeddings"]
            for e1 in s1_embs:
                for e2 in s2_embs:
                    sim = float(np.dot(e1, e2))
                    impostor_scores.append(sim)

    if not genuine_scores:
        print("[Note] Not enough multi-image genuine pairs in current DB to compute intra-class variance.")
        # Self-identity fallback baseline
        genuine_scores = [1.0]

    gen_arr = np.array(genuine_scores)
    imp_arr = np.array(impostor_scores) if impostor_scores else np.array([0.0])

    gen_stats = {
        "count": len(genuine_scores),
        "min": float(np.min(gen_arr)),
        "max": float(np.max(gen_arr)),
        "mean": float(np.mean(gen_arr)),
        "median": float(np.median(gen_arr)),
        "std": float(np.std(gen_arr))
    }

    imp_stats = {
        "count": len(impostor_scores),
        "min": float(np.min(imp_arr)),
        "max": float(np.max(imp_arr)),
        "mean": float(np.mean(imp_arr)),
        "median": float(np.median(imp_arr)),
        "std": float(np.std(imp_arr))
    }

    print("GENUINE MATCHES (Same Student):")
    print(f"  Count:  {gen_stats['count']}")
    print(f"  Min:    {gen_stats['min']:.4f}")
    print(f"  Max:    {gen_stats['max']:.4f}")
    print(f"  Mean:   {gen_stats['mean']:.4f}")
    print(f"  Median: {gen_stats['median']:.4f}")
    print(f"  StdDev: {gen_stats['std']:.4f}\n")

    print("IMPOSTOR MATCHES (Different Students):")
    print(f"  Count:  {imp_stats['count']}")
    print(f"  Min:    {imp_stats['min']:.4f}")
    print(f"  Max:    {imp_stats['max']:.4f}")
    print(f"  Mean:   {imp_stats['mean']:.4f}")
    print(f"  Median: {imp_stats['median']:.4f}")
    print(f"  StdDev: {imp_stats['std']:.4f}\n")

    # Evaluate across various candidate thresholds
    threshold_grid = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]
    sweep_results = []

    print(f"{'Threshold':<10} | {'FAR (%)':<10} | {'FRR (%)':<10} | {'Precision (%)':<15} | {'Recall (%)':<12}")
    print("-" * 65)

    for thresh in threshold_grid:
        # False Accept: Impostor >= thresh
        fa_count = np.sum(imp_arr >= thresh)
        far = (fa_count / len(imp_arr)) * 100 if len(imp_arr) > 0 else 0.0

        # False Reject: Genuine < thresh
        fr_count = np.sum(gen_arr < thresh)
        frr = (fr_count / len(gen_arr)) * 100 if len(gen_arr) > 0 else 0.0

        # True Positive & False Positive
        tp = np.sum(gen_arr >= thresh)
        fp = fa_count
        precision = (tp / (tp + fp)) * 100 if (tp + fp) > 0 else 100.0
        recall = (tp / len(gen_arr)) * 100 if len(gen_arr) > 0 else 0.0

        sweep_results.append({
            "threshold": thresh,
            "far_percent": round(float(far), 2),
            "frr_percent": round(float(frr), 2),
            "precision_percent": round(float(precision), 2),
            "recall_percent": round(float(recall), 2)
        })

        is_current = " (CURRENT MATCH)" if thresh == settings.FACE_MATCH_THRESHOLD else (" (CURRENT REVIEW)" if thresh == settings.FACE_REVIEW_THRESHOLD else "")
        print(f"{thresh:<10.2f} | {far:<10.2f} | {frr:<10.2f} | {precision:<15.2f} | {recall:<12.2f}{is_current}")

    # Export report to JSON
    report = {
        "genuine_statistics": gen_stats,
        "impostor_statistics": imp_stats,
        "threshold_sweep": sweep_results,
        "active_configuration": {
            "FACE_MATCH_THRESHOLD": settings.FACE_MATCH_THRESHOLD,
            "FACE_REVIEW_THRESHOLD": settings.FACE_REVIEW_THRESHOLD,
            "FACE_MIN_MARGIN": settings.FACE_MIN_MARGIN,
            "FACE_BLUR_THRESHOLD": settings.FACE_BLUR_THRESHOLD,
            "FACE_MIN_SIZE": settings.FACE_MIN_SIZE
        }
    }

    report_path = os.path.join(settings.EXPORTS_DIR, "face_evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nReport successfully exported to: {report_path}\n")


if __name__ == "__main__":
    run_evaluation()
