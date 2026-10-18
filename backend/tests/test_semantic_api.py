"""Tests for Phase 3C.2 Semantic Evidence Retrieval service and API endpoint."""

import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch

from app.main import app
from app.schemas.semantic_evidence import SemanticReviewState
from app.services.semantic.evidence_finder import SemanticEvidenceFinder


# =========================================================================
# Mock Embedder Fixtures
# =========================================================================

class MockDeterministicEmbedder:
    """Mock embedder returning deterministic normalized 384-d vectors based on keywords."""

    EMBEDDING_DIM: int = 384

    def encode(self, texts, batch_size=32, normalize_embeddings=True):
        is_single = isinstance(texts, str)
        items = [texts] if is_single else texts

        vectors = []
        for text in items:
            t = text.lower()
            vec = np.zeros(self.EMBEDDING_DIM, dtype=np.float32)

            # Assign orthogonal basis dimensions for specific topics
            if "kubernetes" in t or "k8s" in t or "cluster" in t:
                vec[0] = 1.0
            if "docker" in t or "container" in t:
                vec[1] = 1.0
            if "python" in t or "fastapi" in t:
                vec[2] = 1.0
            if "marketing" in t or "social" in t or "seo" in t:
                vec[10] = 1.0

            # Default small signal if nothing matched
            if np.linalg.norm(vec) == 0.0:
                vec[100] = 0.1

            # Normalize
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            vectors.append(vec)

        res = np.array(vectors, dtype=np.float32)
        return res[0] if is_single else res


# =========================================================================
# Service Unit Tests: SemanticEvidenceFinder
# =========================================================================

def test_find_evidence_ranks_relevant_passages_first():
    """Verify relevant passages are retrieved and ranked before unrelated ones."""
    resume_text = (
        "Alice Smith\nCloud Architect\n\n"
        "Architected and deployed multi-tenant Kubernetes clusters on AWS EKS.\n"
        "Configured Helm charts and automated pod autoscaling policies.\n\n"
        "Created digital marketing campaigns and managed company social media accounts.\n\n"
        "Led incident response and post-mortem reviews for production outages."
    )

    mock_embedder = MockDeterministicEmbedder()

    resp = SemanticEvidenceFinder.find_evidence(
        raw_resume_text=resume_text,
        requirement_text="Experience deploying Kubernetes clusters and container workloads",
        match_id="test-match-1",
        resume_id="test-resume-1",
        top_k=3,
        min_similarity=0.1,
        embedder=mock_embedder,
    )

    assert resp.match_id == "test-match-1"
    assert resp.total_passages_evaluated >= 4
    assert len(resp.candidates) > 0

    # Top candidate should be the Kubernetes passage
    top = resp.candidates[0]
    assert "Kubernetes" in top.passage_text
    assert top.similarity_score > 0.5

    # Check strict provenance invariant: resume_text[start:end] == passage_text
    for cand in resp.candidates:
        extracted = resume_text[cand.source_span.char_start : cand.source_span.char_end]
        assert extracted == cand.passage_text
        assert cand.review_state == SemanticReviewState.UNREVIEWED


def test_find_evidence_handles_empty_and_whitespace_resume():
    """Verify empty or whitespace resume yields empty candidates without error."""
    mock_embedder = MockDeterministicEmbedder()

    resp_empty = SemanticEvidenceFinder.find_evidence(
        raw_resume_text="",
        requirement_text="Python experience",
        match_id="m1",
        resume_id="r1",
        embedder=mock_embedder,
    )
    assert resp_empty.candidates == []
    assert resp_empty.total_passages_evaluated == 0

    resp_ws = SemanticEvidenceFinder.find_evidence(
        raw_resume_text="   \n\n\t  ",
        requirement_text="Python experience",
        match_id="m1",
        resume_id="r1",
        embedder=mock_embedder,
    )
    assert resp_ws.candidates == []


def test_find_evidence_empty_requirement_raises():
    """Verify empty or whitespace requirement raises ValueError."""
    with pytest.raises(ValueError, match="Requirement text must not be empty"):
        SemanticEvidenceFinder.find_evidence(
            raw_resume_text="Some resume text",
            requirement_text="   ",
            match_id="m1",
            resume_id="r1",
        )


def test_negation_heuristics():
    """Verify detection of explicit negative and counter-evidence phrasing."""
    # Negative statements
    assert SemanticEvidenceFinder.detect_negation("Did not use Kubernetes in commercial environments.") == "potential_negation"
    assert SemanticEvidenceFinder.detect_negation("Have not deployed production systems with AWS.") == "potential_negation"
    assert SemanticEvidenceFinder.detect_negation("Candidate has no commercial experience with Golang.") == "potential_negation"
    assert SemanticEvidenceFinder.detect_negation("Never deployed Kafka clusters.") == "potential_negation"
    assert SemanticEvidenceFinder.detect_negation("Familiar with Docker concepts, but no commercial experience.") == "potential_negation"
    assert SemanticEvidenceFinder.detect_negation("Task was completed without hands-on experience in Rust.") == "potential_negation"

    # Positive statements (should NOT be flagged)
    assert SemanticEvidenceFinder.detect_negation("Deployed multi-region Kubernetes clusters with zero downtime.") is None
    assert SemanticEvidenceFinder.detect_negation("Migrated backend to FastAPI without disrupting active users.") is None
    assert SemanticEvidenceFinder.detect_negation("Managed database scaling with no outages during peak season.") is None


def test_deduplication_and_top_k():
    """Verify top_k limit and suppression of duplicate spans."""
    resume_text = (
        "Engineered Kubernetes clusters for microservices.\n\n"
        "Engineered Kubernetes clusters for microservices.\n\n"
        "Built automated CI/CD deployment pipelines using Docker."
    )

    mock_embedder = MockDeterministicEmbedder()

    resp = SemanticEvidenceFinder.find_evidence(
        raw_resume_text=resume_text,
        requirement_text="Kubernetes microservices",
        match_id="m1",
        resume_id="r1",
        top_k=2,
        min_similarity=0.1,
        embedder=mock_embedder,
    )

    # Should not duplicate the identical span
    assert len(resp.candidates) <= 2
    for c in resp.candidates:
        assert resume_text[c.source_span.char_start : c.source_span.char_end] == c.passage_text


# =========================================================================
# API Endpoint Integration Tests: POST /api/v1/matches/{match_id}/semantic-evidence
# =========================================================================

@pytest.mark.asyncio
async def test_api_semantic_evidence_endpoint_success():
    """Verify full end-to-end API call on existing match report and resume via HTTP."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest Resume
        resume_content = (
            "Morgan Reed\nCloud DevOps Engineer\n\n"
            "Maintained enterprise Kubernetes clusters and configured Helm deployments in AWS.\n\n"
            "Implemented CI/CD pipelines using GitHub Actions and ArgoCD."
        )
        r_resp = await client.post(
            "/api/v1/resumes",
            files={"file": ("morgan_devops.txt", resume_content.encode("utf-8"), "text/plain")},
        )
        assert r_resp.status_code == 201
        resume_id = r_resp.json()["id"]

        # 2. Ingest Job
        job_content = (
            "Cloud Infrastructure Lead\n"
            "Requirements:\n"
            "- Hands-on experience with Kubernetes and container deployment in production."
        )
        j_resp = await client.post(
            "/api/v1/jobs",
            json={"title": "Cloud Infrastructure Lead", "raw_text": job_content},
        )
        assert j_resp.status_code == 201
        job_id = j_resp.json()["id"]

        try:
            # 3. Create Match Report
            m_resp = await client.post(
                "/api/v1/matches",
                json={"resume_id": resume_id, "job_id": job_id},
            )
            assert m_resp.status_code == 200
            match_data = m_resp.json()
            match_id = match_data["id"]
            orig_overall_score = match_data["overall_score"]
            orig_breakdown = match_data["score_breakdown"]

            # 4. Query Semantic Evidence for missing or specific requirement
            mock_embedder = MockDeterministicEmbedder()
            with patch("app.services.semantic.embedder.MiniLMEmbedder.get_instance", return_value=mock_embedder):
                sem_resp = await client.post(
                    f"/api/v1/matches/{match_id}/semantic-evidence",
                    json={
                        "requirement_text": "Experience with Kubernetes and Helm",
                        "top_k": 3,
                        "min_similarity": 0.2,
                    },
                )
                assert sem_resp.status_code == 200
                data = sem_resp.json()
                assert data["match_id"] == match_id
                assert data["resume_id"] == resume_id
                assert len(data["candidates"]) > 0

                top_candidate = data["candidates"][0]
                assert "Kubernetes" in top_candidate["passage_text"]
                start = top_candidate["source_span"]["char_start"]
                end = top_candidate["source_span"]["char_end"]
                assert start is not None and end is not None
                # Check exact source substring match
                assert resume_content[start:end] == top_candidate["passage_text"]

            # 5. Verify that deterministic Qualification Index and score breakdown remain 100% unchanged
            verify_m_resp = await client.get(f"/api/v1/matches/{match_id}")
            assert verify_m_resp.status_code == 200
            current_m_data = verify_m_resp.json()
            assert current_m_data["overall_score"] == orig_overall_score
            assert current_m_data["score_breakdown"] == orig_breakdown

        finally:
            await client.delete(f"/api/v1/resumes/{resume_id}")
            await client.delete(f"/api/v1/jobs/{job_id}")


@pytest.mark.asyncio
async def test_api_semantic_evidence_nonexistent_match():
    """Verify 404 returned when querying nonexistent match_id."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/matches/00000000-0000-0000-0000-000000000000/semantic-evidence",
            json={"requirement_text": "Python experience"},
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_api_semantic_evidence_validation_errors():
    """Verify Pydantic validation on empty requirement or invalid top_k."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty requirement
        res1 = await client.post(
            "/api/v1/matches/some-id/semantic-evidence",
            json={"requirement_text": ""},
        )
        assert res1.status_code == 422

        # Invalid top_k (exceeds max 10)
        res2 = await client.post(
            "/api/v1/matches/some-id/semantic-evidence",
            json={"requirement_text": "Python", "top_k": 50},
        )
        assert res2.status_code == 422


@pytest.mark.asyncio
async def test_api_semantic_evidence_missing_model_files_returns_503():
    """Verify graceful HTTP 503 response when local model cache is absent, hiding disk paths."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create minimal resume & job
        r_resp = await client.post(
            "/api/v1/resumes",
            files={"file": ("temp.txt", b"Engineer with experience.", "text/plain")},
        )
        resume_id = r_resp.json()["id"]

        j_resp = await client.post(
            "/api/v1/jobs",
            json={"title": "DevOps", "raw_text": "Required: K8s"},
        )
        job_id = j_resp.json()["id"]

        try:
            m_resp = await client.post(
                "/api/v1/matches",
                json={"resume_id": resume_id, "job_id": job_id},
            )
            match_id = m_resp.json()["id"]

            with patch(
                "app.services.semantic.evidence_finder.SemanticEvidenceFinder.find_evidence",
                side_effect=FileNotFoundError("Local model cache not found on disk at /secret/path"),
            ):
                response = await client.post(
                    f"/api/v1/matches/{match_id}/semantic-evidence",
                    json={"requirement_text": "Kubernetes"},
                )
                assert response.status_code == 503
                detail = response.json()["detail"]
                assert "embedding model is not installed or configured" in detail
                assert "/secret/path" not in detail
        finally:
            await client.delete(f"/api/v1/resumes/{resume_id}")
            await client.delete(f"/api/v1/jobs/{job_id}")
