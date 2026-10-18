"""Local MiniLM embedding and cosine similarity service.

Provides lazy-loaded singleton inference for sentence-transformers/all-MiniLM-L6-v2
operating strictly offline with CPU inference and validated vector outputs.
"""

import logging
import os
from typing import List, Optional, Tuple, Union

import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class MiniLMEmbedder:
    """Lazy-loaded, singleton embedder using local all-MiniLM-L6-v2 snapshot."""

    _instance: Optional["MiniLMEmbedder"] = None
    _model: Optional[object] = None
    _model_path: Optional[str] = None

    EMBEDDING_DIM: int = 384

    def __new__(cls) -> "MiniLMEmbedder":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> "MiniLMEmbedder":
        """Get or initialize the process-wide singleton embedder instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        """Check if the model is currently loaded in memory."""
        return self._model is not None

    def _ensure_loaded(self) -> None:
        """Load the model lazily if not already present in memory."""
        if self._model is not None:
            return

        snapshot_dir = settings.model_snapshot_path
        if not snapshot_dir or not os.path.isdir(snapshot_dir):
            raise FileNotFoundError(
                "Local model cache for 'all-MiniLM-L6-v2' not found. "
                "Ensure model snapshot is present in 'models_cache' and offline mode is configured."
            )

        # Confirm critical weights file is present before attempting load
        weights_file = os.path.join(snapshot_dir, "model.safetensors")
        config_file = os.path.join(snapshot_dir, "config.json")
        if not os.path.isfile(weights_file) or not os.path.isfile(config_file):
            raise FileNotFoundError(
                f"Model snapshot directory '{snapshot_dir}' is incomplete. "
                "Missing 'model.safetensors' or 'config.json'."
            )

        # Enforce offline mode in environment
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"

        try:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading local MiniLM model from snapshot: %s", snapshot_dir)
            self._model = SentenceTransformer(snapshot_dir, device="cpu")
            self._model_path = snapshot_dir
        except Exception as exc:
            logger.error("Failed to load local MiniLM model from '%s': %s", snapshot_dir, exc)
            raise RuntimeError(f"Failed to initialize local MiniLM model: {exc}") from exc

    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32,
        normalize_embeddings: bool = True,
    ) -> np.ndarray:
        """Generate 384-dimensional dense embeddings for a string or list of strings.

        Args:
            texts: A single text string or list of text strings.
            batch_size: Batch size for encoding passages.
            normalize_embeddings: If True, vectors are L2-normalized so dot product equals cosine similarity.

        Returns:
            np.ndarray of shape (EMBEDDING_DIM,) for a single string or (N, EMBEDDING_DIM) for a list.
        """
        is_single = isinstance(texts, str)
        input_list = [texts] if is_single else texts

        if not input_list:
            return np.empty((0, self.EMBEDDING_DIM), dtype=np.float32)

        self._ensure_loaded()

        raw_vectors = self._model.encode(
            input_list,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=normalize_embeddings,
            convert_to_numpy=True,
        )

        vectors = np.asarray(raw_vectors, dtype=np.float32)

        # Validate vector dimensions and finite values
        if not np.all(np.isfinite(vectors)):
            raise ValueError("Model produced non-finite (NaN or Inf) values in embedding.")

        if vectors.shape[-1] != self.EMBEDDING_DIM:
            raise ValueError(
                f"Unexpected embedding dimension: expected {self.EMBEDDING_DIM}, got {vectors.shape[-1]}"
            )

        return vectors[0] if is_single else vectors

    @staticmethod
    def cosine_similarity(
        vec_a: np.ndarray,
        vec_b: np.ndarray,
    ) -> float:
        """Compute the cosine similarity between two 1D vectors."""
        a = np.asarray(vec_a, dtype=np.float32)
        b = np.asarray(vec_b, dtype=np.float32)

        if a.ndim != 1 or b.ndim != 1 or a.shape[0] != b.shape[0]:
            raise ValueError(f"Vectors must be 1D with identical dimension. Got {a.shape} and {b.shape}")

        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        sim = float(np.dot(a, b) / (norm_a * norm_b))
        # Clamp to [-1.0, 1.0] to account for small floating point inaccuracies
        return max(-1.0, min(1.0, sim))

    @staticmethod
    def batch_cosine_similarities(
        query_vec: np.ndarray,
        passage_vecs: np.ndarray,
    ) -> np.ndarray:
        """Compute cosine similarities between a single 1D query vector and an (N, D) matrix of passage vectors."""
        q = np.asarray(query_vec, dtype=np.float32)
        p = np.asarray(passage_vecs, dtype=np.float32)

        if p.size == 0:
            return np.empty((0,), dtype=np.float32)

        if q.ndim != 1 or p.ndim != 2 or q.shape[0] != p.shape[1]:
            raise ValueError(
                f"Dimension mismatch: query shape {q.shape}, passages shape {p.shape}"
            )

        norm_q = np.linalg.norm(q)
        norm_p = np.linalg.norm(p, axis=1)

        # Avoid divide by zero
        denom = norm_q * norm_p
        denom[denom == 0.0] = 1.0

        scores = np.dot(p, q) / denom
        return np.clip(scores, -1.0, 1.0)
