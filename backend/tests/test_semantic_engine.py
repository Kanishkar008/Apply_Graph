"""Unit tests for exact-span passage chunking and MiniLM embedder utilities."""

import os
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from app.services.semantic.embedder import MiniLMEmbedder
from app.services.semantic.passage_chunker import PassageChunker


# =========================================================================
# PassageChunker Tests
# =========================================================================

def test_chunker_empty_and_whitespace():
    """Verify empty or whitespace-only texts yield no chunks."""
    assert PassageChunker.chunk_text("") == []
    assert PassageChunker.chunk_text(None) == []
    assert PassageChunker.chunk_text("   \n\n\t  ") == []


def test_chunker_exact_offsets_on_paragraphs():
    """Verify that chunks accurately map to substrings of original text."""
    sample_text = (
        "Morgan Reed\nSenior Distributed Systems Engineer\n\n"
        "Architected real-time stream processing pipelines using Apache Kafka and Go.\n"
        "Reduced event processing latency by 45% across multi-region deployments.\n\n"
        "Led a team of 6 backend engineers maintaining microservices in Kubernetes."
    )

    chunks = PassageChunker.chunk_text(sample_text)
    assert len(chunks) >= 3

    for chunk in chunks:
        # Strict provenance invariant: text[start:end] == chunk.text
        extracted_slice = sample_text[chunk.start_char : chunk.end_char]
        assert extracted_slice == chunk.text
        assert len(chunk.text) >= PassageChunker.MIN_PASSAGE_CHARS


def test_chunker_bullet_points():
    """Verify bullet points are parsed into individual passages with exact offsets."""
    text_with_bullets = (
        "Key Accomplishments:\n"
        "* Designed and deployed microservices using FastAPI and PostgreSQL.\n"
        "* Implemented end-to-end tracing with OpenTelemetry and Jaeger.\n"
        "* Configured Prometheus metrics and Grafana dashboards for cluster alerts."
    )

    chunks = PassageChunker.chunk_text(text_with_bullets)
    assert len(chunks) >= 3

    for chunk in chunks:
        assert text_with_bullets[chunk.start_char : chunk.end_char] == chunk.text


def test_chunker_oversized_sentence_splitting():
    """Verify oversized blocks exceeding max_chars are divided into sentence passages."""
    long_sentence_1 = "Developed high-throughput transaction ledger in Rust that processed over 50,000 transactions per second."
    long_sentence_2 = "Managed complex distributed database replication across three distinct cloud regions with zero data loss."
    long_sentence_3 = "Collaborated closely with security auditors to achieve SOC-2 Type II compliance within six months."

    oversized_block = f"{long_sentence_1} {long_sentence_2} {long_sentence_3}"
    assert len(oversized_block) > 250

    # Test with small max_chars to force sentence segmentation
    chunks = PassageChunker.chunk_text(oversized_block, max_chars=120)
    assert len(chunks) >= 2

    for chunk in chunks:
        assert oversized_block[chunk.start_char : chunk.end_char] == chunk.text
        assert not chunk.text.startswith(" ")
        assert not chunk.text.endswith(" ")


def test_chunker_messy_ocr_and_repeated_phrases():
    """Verify repeated phrases or weird spacing preserve accurate offsets."""
    messy_text = (
        "Python Engineer   Python Engineer\n\n\n"
        "Python Python Python\n\n"
        "Experience with Docker, Kubernetes, Docker, and CI/CD automation."
    )

    chunks = PassageChunker.chunk_text(messy_text)
    for chunk in chunks:
        assert messy_text[chunk.start_char : chunk.end_char] == chunk.text


# =========================================================================
# Cosine Similarity & Math Utilities Tests (No Model Required)
# =========================================================================

def test_cosine_similarity_identical_vectors():
    """Identical vectors must return 1.0."""
    vec = np.array([0.5, 0.5, 0.5, 0.5], dtype=np.float32)
    sim = MiniLMEmbedder.cosine_similarity(vec, vec)
    assert pytest.approx(sim, abs=1e-5) == 1.0


def test_cosine_similarity_orthogonal_vectors():
    """Orthogonal vectors must return 0.0."""
    vec_a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    vec_b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    sim = MiniLMEmbedder.cosine_similarity(vec_a, vec_b)
    assert pytest.approx(sim, abs=1e-5) == 0.0


def test_cosine_similarity_opposite_vectors():
    """Opposite vectors must return -1.0."""
    vec_a = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    vec_b = np.array([-1.0, -2.0, -3.0], dtype=np.float32)
    sim = MiniLMEmbedder.cosine_similarity(vec_a, vec_b)
    assert pytest.approx(sim, abs=1e-5) == -1.0


def test_cosine_similarity_zero_vector():
    """Zero vector must safely return 0.0 without ZeroDivisionError."""
    vec_a = np.array([0.0, 0.0, 0.0], dtype=np.float32)
    vec_b = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    sim = MiniLMEmbedder.cosine_similarity(vec_a, vec_b)
    assert sim == 0.0


def test_batch_cosine_similarities():
    """Batch calculation matches single calculations and maintains order."""
    query = np.array([1.0, 0.0], dtype=np.float32)
    passages = np.array(
        [
            [1.0, 0.0],   # Identical -> 1.0
            [0.0, 1.0],   # Orthogonal -> 0.0
            [-1.0, 0.0],  # Opposite -> -1.0
            [0.7071, 0.7071], # ~45 degrees -> ~0.7071
        ],
        dtype=np.float32,
    )

    batch_sims = MiniLMEmbedder.batch_cosine_similarities(query, passages)
    assert len(batch_sims) == 4
    assert pytest.approx(batch_sims[0], abs=1e-4) == 1.0
    assert pytest.approx(batch_sims[1], abs=1e-4) == 0.0
    assert pytest.approx(batch_sims[2], abs=1e-4) == -1.0
    assert pytest.approx(batch_sims[3], abs=1e-3) == 0.7071


def test_batch_cosine_similarities_empty():
    """Empty passage matrix returns empty array."""
    query = np.array([1.0, 0.0], dtype=np.float32)
    passages = np.empty((0, 2), dtype=np.float32)
    batch_sims = MiniLMEmbedder.batch_cosine_similarities(query, passages)
    assert batch_sims.shape == (0,)


# =========================================================================
# Mocked Embedder Tests (No Real Model Loading)
# =========================================================================

def test_embedder_singleton_instance():
    """Verify MiniLMEmbedder enforces singleton pattern."""
    inst1 = MiniLMEmbedder()
    inst2 = MiniLMEmbedder.get_instance()
    assert inst1 is inst2


def test_embedder_missing_cache_raises():
    """Verify embedder raises FileNotFoundError if model snapshot path is invalid."""
    embedder = MiniLMEmbedder()
    embedder._model = None  # Reset state

    with patch("app.core.config.Settings.model_snapshot_path", new_callable=lambda: property(lambda self: None)):
        with pytest.raises(FileNotFoundError, match="Local model cache for 'all-MiniLM-L6-v2' not found"):
            embedder.encode("Sample query")


def test_embedder_mocked_encoding():
    """Verify encode method validates dimension, normalizes, and handles batching."""
    embedder = MiniLMEmbedder()

    mock_model = MagicMock()
    # Return fake 384-dimensional vectors
    fake_vec = np.ones((1, 384), dtype=np.float32)
    fake_vec = fake_vec / np.linalg.norm(fake_vec)
    mock_model.encode.return_value = fake_vec

    with patch.object(embedder, "_ensure_loaded"):
        embedder._model = mock_model

        # Test single query
        vec = embedder.encode("Docker deployment")
        assert vec.shape == (384,)
        assert np.isclose(np.linalg.norm(vec), 1.0)

        # Test empty input
        empty_res = embedder.encode([])
        assert empty_res.shape == (0, 384)


def test_embedder_detects_non_finite_values():
    """Verify embedder raises ValueError if non-finite vectors are encountered."""
    embedder = MiniLMEmbedder()
    mock_model = MagicMock()
    bad_vec = np.array([[np.nan] * 384], dtype=np.float32)
    mock_model.encode.return_value = bad_vec

    with patch.object(embedder, "_ensure_loaded"):
        embedder._model = mock_model
        with pytest.raises(ValueError, match="non-finite"):
            embedder.encode("Test")


# =========================================================================
# Real Model Offline Smoke Test (Marked for selective execution)
# =========================================================================

@pytest.mark.offline_model
def test_real_model_offline_smoke():
    """Smoke test running actual offline inference using cached snapshot."""
    embedder = MiniLMEmbedder.get_instance()
    # Force real load
    embedder._model = None

    query = "Experience with Kubernetes cluster orchestration and Helm"
    passages = [
        "Led team deploying multi-region Kubernetes clusters with Helm charts.",
        "Created marketing campaigns and increased social media conversions.",
    ]

    q_vec = embedder.encode(query)
    p_vecs = embedder.encode(passages)

    assert q_vec.shape == (384,)
    assert p_vecs.shape == (2, 384)

    scores = MiniLMEmbedder.batch_cosine_similarities(q_vec, p_vecs)
    # The Kubernetes passage must score significantly higher than social media marketing
    assert scores[0] > scores[1]
    assert scores[0] > 0.60
