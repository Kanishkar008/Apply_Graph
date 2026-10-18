"""Pydantic schemas for semantic evidence retrieval requests and responses."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.resume_parsed import SourceSpan


class SemanticReviewState(str, Enum):
    """Transient human review classification for a retrieved semantic evidence candidate."""

    UNREVIEWED = "unreviewed"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    UNCERTAIN = "uncertain"


class SemanticEvidenceRequest(BaseModel):
    """Request payload to query semantically relevant passages for a job requirement.

    Can specify an explicit `requirement_text` or target a missing skill by name.
    """

    model_config = ConfigDict(from_attributes=True)

    requirement_text: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="The requirement, competency, or skill statement to search for in candidate resume.",
    )
    top_k: int = Field(
        5,
        ge=1,
        le=10,
        description="Maximum number of ranked evidence passages to return (1-10).",
    )
    min_similarity: float = Field(
        0.25,
        ge=-1.0,
        le=1.0,
        description="Minimum cosine similarity cutoff. Similarity is a retrieval rank signal, not a qualification probability.",
    )


class SemanticEvidenceCandidate(BaseModel):
    """A semantically retrieved passage from the resume grounded by exact character offsets."""

    model_config = ConfigDict(from_attributes=True)

    passage_text: str = Field(
        ...,
        description="Exact, verbatim textual passage excerpted from the candidate resume.",
    )
    source_span: SourceSpan = Field(
        ...,
        description="Exact 0-indexed character offsets in the original raw resume text.",
    )
    similarity_score: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Cosine similarity between requirement and passage vectors in [-1.0, 1.0].",
    )
    diagnostic_flag: Optional[str] = Field(
        None,
        description="Heuristic flag such as 'potential_negation' when counter-evidence phrases are detected.",
    )
    review_state: SemanticReviewState = Field(
        default=SemanticReviewState.UNREVIEWED,
        description="Transient human review state (unreviewed, confirmed, rejected, uncertain).",
    )


class SemanticEvidenceResponse(BaseModel):
    """Response containing retrieved semantic evidence candidates with provenance."""

    model_config = ConfigDict(from_attributes=True)

    match_id: str = Field(..., description="ID of the associated match report")
    resume_id: str = Field(..., description="ID of the candidate resume")
    requirement_text: str = Field(..., description="The query requirement evaluated")
    total_passages_evaluated: int = Field(
        ...,
        ge=0,
        description="Number of candidate passages parsed from the raw resume text.",
    )
    min_similarity_threshold: float = Field(
        ...,
        description="Cosine similarity cutoff applied to this retrieval.",
    )
    candidates: List[SemanticEvidenceCandidate] = Field(
        default_factory=list,
        description="Ranked list of semantically relevant passages meeting threshold, sorted by similarity descending.",
    )
    methodology_note: str = Field(
        default=(
            "Cosine similarity is a semantic retrieval rank signal and does not represent "
            "a qualification probability, hiring decision, or factual truth. Every candidate passage "
            "is strictly anchored to original resume source text."
        ),
        description="Interpretive disclaimer on semantic similarity usage.",
    )
