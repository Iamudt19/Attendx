import numpy as np
import pytest
from app.cv.quality import check_face_quality
from app.cv.matcher import FaceMatcher
from app.core.config import settings

def test_face_quality_checks():
    # Good face image
    good_img = np.full((120, 120, 3), 128, dtype=np.uint8)
    good_img[::2, ::2] = 255
    res_good = check_face_quality(good_img, (10, 10, 100, 100))
    assert res_good["size_ok"] is True
    assert res_good["brightness_ok"] is True

    # Small face
    small_box = (10, 10, 15, 15)
    res_small = check_face_quality(good_img, small_box)
    assert res_small["size_ok"] is False
    assert res_small["overall"] in ("POOR", "REVIEW", "REJECT")

    # Dark / underexposed face
    dark_img = np.zeros((100, 100, 3), dtype=np.uint8)
    res_dark = check_face_quality(dark_img, (10, 10, 80, 80))
    assert res_dark["brightness_ok"] is False

    # Blurry face
    flat_img = np.full((100, 100, 3), 128, dtype=np.uint8)
    res_blur = check_face_quality(flat_img, (10, 10, 80, 80))
    assert res_blur["blur_ok"] is False

def test_matcher_high_score_and_margin():
    matcher = FaceMatcher(match_threshold=0.45, review_threshold=0.35, min_margin=0.08)

    # Construct normalized orthogonal embeddings
    v_target = np.zeros(128, dtype=np.float32)
    v_target[0] = 1.0

    v_other = np.zeros(128, dtype=np.float32)
    v_other[1] = 1.0

    student_embeddings = {
        1: [v_target.tolist()],
        2: [v_other.tolist()]
    }

    # Query matching Rahul perfectly
    query = v_target.tolist()
    match = matcher.match_embedding(query, student_embeddings, quality_assessment={"overall": "GOOD"})

    assert match["status"] == "PRESENT"
    assert match["student_id"] == 1
    assert match["match_score"] == pytest.approx(1.0, 0.01)
    assert match["second_best_score"] == pytest.approx(0.0, 0.01)
    assert match["margin"] == pytest.approx(1.0, 0.01)

def test_matcher_ambiguous_margin():
    matcher = FaceMatcher(match_threshold=0.45, review_threshold=0.35, min_margin=0.08)

    # Target and rival very close
    v_target = np.zeros(128, dtype=np.float32)
    v_target[0] = 0.8
    v_target[1] = 0.6
    v_target = v_target / np.linalg.norm(v_target)

    v_rival = np.zeros(128, dtype=np.float32)
    v_rival[0] = 0.81
    v_rival[1] = 0.59
    v_rival = v_rival / np.linalg.norm(v_rival)

    student_embeddings = {
        1: [v_target.tolist()],
        2: [v_rival.tolist()]
    }

    query = v_target.tolist()
    match = matcher.match_embedding(query, student_embeddings, quality_assessment={"overall": "GOOD"})

    # Because margin is tiny (< min_margin), it must be conservative and flag NEEDS_REVIEW
    assert match["status"] == "NEEDS_REVIEW"
    assert match["margin"] < 0.08

def test_matcher_unknown_face():
    matcher = FaceMatcher(match_threshold=0.45, review_threshold=0.35, min_margin=0.08)

    v1 = np.zeros(128, dtype=np.float32)
    v1[0] = 1.0

    v_unknown = np.zeros(128, dtype=np.float32)
    v_unknown[127] = 1.0

    student_embeddings = {
        1: [v1.tolist()]
    }

    match = matcher.match_embedding(v_unknown.tolist(), student_embeddings, quality_assessment={"overall": "GOOD"})
    assert match["status"] == "UNKNOWN"
    assert match["student_id"] is None
