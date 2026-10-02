"""
Optimization #4: In-Memory Embedding Cache
==========================================
Caches student embeddings in memory keyed by (class_id, student_id).
Avoids N SQL queries per request for every enrolled student.
Cache is TTL-invalidated (5 minutes by default) and can be manually
busted whenever a new face embedding is registered or deleted.
"""
import time
import threading
from typing import Dict, List, Optional, Tuple

_CACHE_TTL_SECONDS = 300  # 5 minutes


class EmbeddingCache:
    """
    Thread-safe in-memory LRU-ish store for student face embeddings.
    Key: class_id (int)
    Value: (timestamp, student_embeddings_map, enrolled_list)
    """

    def __init__(self, ttl_seconds: int = _CACHE_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._lock = threading.Lock()
        # { class_id: (cached_at_ts, student_embeddings_map, enrolled_list) }
        self._cache: Dict[int, Tuple[float, Dict, List]] = {}

    def get(self, class_id: int) -> Optional[Tuple[Dict, List]]:
        """
        Returns (student_embeddings_map, enrolled_list) if cache hit and not expired.
        Returns None on cache miss or expiry.
        """
        with self._lock:
            entry = self._cache.get(class_id)
            if entry is None:
                return None
            cached_at, emb_map, enrolled = entry
            if time.monotonic() - cached_at > self._ttl:
                del self._cache[class_id]
                return None
            return emb_map, enrolled

    def set(self, class_id: int, student_embeddings_map: Dict, enrolled_list: List) -> None:
        """Store/refresh the cache entry for a class."""
        with self._lock:
            self._cache[class_id] = (time.monotonic(), student_embeddings_map, enrolled_list)

    def invalidate(self, class_id: int) -> None:
        """Force-evict a class from cache (call after new embedding upload or deletion)."""
        with self._lock:
            self._cache.pop(class_id, None)

    def invalidate_all(self) -> None:
        """Wipe the entire cache."""
        with self._lock:
            self._cache.clear()

    def stats(self) -> Dict:
        with self._lock:
            now = time.monotonic()
            alive = {k: round(self._ttl - (now - v[0]), 1) for k, v in self._cache.items()}
            return {"cached_classes": list(self._cache.keys()), "ttl_remaining_sec": alive}


# Singleton — imported by attendance.py
embedding_cache = EmbeddingCache()
