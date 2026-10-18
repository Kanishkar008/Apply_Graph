"""Service for semantic evidence retrieval and diagnostic analysis.

Processes resume text with exact-span chunking and local MiniLM embeddings,
ranks passages by cosine similarity, suppresses duplicate spans, and applies
conservative negation diagnostics without altering deterministic matching scores.
"""

import logging
import re
from typing import List, Optional

import numpy as np

from app.schemas.resume_parsed import SourceSpan
from app.schemas.semantic_evidence import (
    SemanticEvidenceCandidate,
    SemanticEvidenceResponse,
    SemanticReviewState,
)
from app.services.semantic.embedder import MiniLMEmbedder
from app.services.semantic.passage_chunker import PassageChunk, PassageChunker

logger = logging.getLogger(__name__)


# Conservative phrase-boundary patterns targeting explicit lack of experience or negative assertions.
# Avoids matching isolated occurrences of ordinary words like "without" or "no" when used positively.
NEGATION_PATTERNS = [
    re.compile(r"\b(?:did\s+not\s+(?:use|have|deploy|manage|work\s+with|implement))\b", re.IGNORECASE),
    re.compile(r"\b(?:have\s+not\s+(?:used|deployed|worked\s+with|implemented))\b", re.IGNORECASE),
    re.compile(r"\b(?:no\s+(?:commercial|production|direct|hands-on|industry)\s+experience)\b", re.IGNORECASE),
    re.compile(r"\b(?:never\s+(?:deployed|managed|worked\s+with|used|configured))\b", re.IGNORECASE),
    re.compile(r"\b(?:without\s+(?:commercial|production|hands-on|direct)\s+experience)\b", re.IGNORECASE),
    re.compile(r"\b(?:familiar\s+with\b[^\.\;\n]{1,60}\bbut\s+no\s+(?:commercial|production|hands-on))\b", re.IGNORECASE),
    re.compile(r"\b(?:limited\s+(?:to\s+academic|experience\s+with|exposure\s+to|knowledge\s+of))\b", re.IGNORECASE),
    re.compile(r"\b(?:lack(?:s|ed|ing)?\s+(?:experience|familiarity|hands-on)\s+(?:in|with))\b", re.IGNORECASE),
]


class SemanticEvidenceFinder:
    """Orchestrates passage extraction, local embedding ranking, and diagnostic analysis."""

    @classmethod
    def detect_negation(cls, passage_text: str) -> Optional[str]:
        """Detect explicit disclaimers of experience or negative phrasing.

        Returns:
            "potential_negation" if counter-evidence patterns are detected, else None.
            Note: This is an advisory heuristic to highlight passages where candidate
            expresses absence or limitation of experience. It is not an automated qualification verdict.
        """
        if not passage_text:
            return None

        for pattern in NEGATION_PATTERNS:
            if pattern.search(passage_text):
                return "potential_negation"

        return None

    @classmethod
    def find_evidence(
        cls,
        raw_resume_text: Optional[str],
        requirement_text: str,
        match_id: str,
        resume_id: str,
        top_k: int = 5,
        min_similarity: float = 0.25,
        embedder: Optional[MiniLMEmbedder] = None,
    ) -> SemanticEvidenceResponse:
        """Retrieve and rank semantically relevant passages from raw resume text.

        Guarantees:
        - Every returned passage satisfies `raw_resume_text[char_start:char_end] == passage_text`.
        - Similarity scores are cosine dot-products of normalized embeddings in [-1.0, 1.0].
        - Duplicates and highly overlapping spans (IoU > 0.5) are deduplicated.
        - Fails safely on empty text with an empty candidate list.
        """
        clean_req = (requirement_text or "").strip()
        if not clean_req:
            raise ValueError("Requirement text must not be empty.")

        # If resume text is empty or whitespace-only, return empty candidates safely
        if not raw_resume_text or not raw_resume_text.strip():
            return SemanticEvidenceResponse(
                match_id=match_id,
                resume_id=resume_id,
                requirement_text=clean_req,
                total_passages_evaluated=0,
                min_similarity_threshold=min_similarity,
                candidates=[],
            )

        # 1. Chunk resume into passages with exact source offsets
        passages: List[PassageChunk] = PassageChunker.chunk_text(raw_resume_text)
        if not passages:
            return SemanticEvidenceResponse(
                match_id=match_id,
                resume_id=resume_id,
                requirement_text=clean_req,
                total_passages_evaluated=0,
                min_similarity_threshold=min_similarity,
                candidates=[],
            )

        # 2. Embed requirement and passages using lazy singleton embedder
        active_embedder = embedder or MiniLMEmbedder.get_instance()
        req_vector: np.ndarray = active_embedder.encode(clean_req, normalize_embeddings=True)
        passage_texts = [p.text for p in passages]
        passage_vectors: np.ndarray = active_embedder.encode(
            passage_texts,
            batch_size=32,
            normalize_embeddings=True,
        )

        # 3. Calculate batch cosine similarities
        sim_scores: np.ndarray = MiniLMEmbedder.batch_cosine_similarities(
            query_vec=req_vector,
            passage_vecs=passage_vectors,
        )

        # 4. Rank indices descending by similarity
        ranked_indices = np.argsort(-sim_scores)

        # 5. Filter by minimum similarity and deduplicate overlapping spans
        candidates: List[SemanticEvidenceCandidate] = []
        accepted_spans: List[tuple[int, int]] = []

        for idx in ranked_indices:
            score = float(sim_scores[idx])
            if score < min_similarity:
                break

            chunk = passages[idx]

            # Invariant check
            extracted = raw_resume_text[chunk.start_char : chunk.end_char]
            if extracted != chunk.text:
                logger.error(
                    "Provenance violation detected: text[%d:%d] != chunk.text. Skipping chunk.",
                    chunk.start_char,
                    chunk.end_char,
                )
                continue

            # Check for substantial overlap with already accepted candidate (IoU > 0.5)
            if cls._is_overlapping(chunk.start_char, chunk.end_char, accepted_spans):
                continue

            diag_flag = cls.detect_negation(chunk.text)

            candidate = SemanticEvidenceCandidate(
                passage_text=chunk.text,
                source_span=SourceSpan(
                    source_text=chunk.text,
                    char_start=chunk.start_char,
                    char_end=chunk.end_char,
                ),
                similarity_score=round(score, 4),
                diagnostic_flag=diag_flag,
                review_state=SemanticReviewState.UNREVIEWED,
            )

            candidates.append(candidate)
            accepted_spans.append((chunk.start_char, chunk.end_char))

            if len(candidates) >= top_k:
                break

        return SemanticEvidenceResponse(
            match_id=match_id,
            resume_id=resume_id,
            requirement_text=clean_req,
            total_passages_evaluated=len(passages),
            min_similarity_threshold=min_similarity,
            candidates=candidates,
        )

    @staticmethod
    def _is_overlapping(start: int, end: int, existing_spans: List[tuple[int, int]]) -> bool:
        """Check if [start, end] has Intersection-over-Union > 0.5 with any existing span."""
        len_a = end - start
        if len_a <= 0:
            return True

        for e_start, e_end in existing_spans:
            len_b = e_end - e_start
            intersection = max(0, min(end, e_end) - max(start, e_start))
            if intersection > 0:
                union = len_a + len_b - intersection
                iou = intersection / union if union > 0 else 0
                if iou > 0.5:
                    return True
        return False
