from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.match_report import MatchReport
from app.models.resume import Resume
from app.schemas.match import (
    MatchReportListResponse,
    MatchReportResponse,
    MatchRequest,
)
from app.schemas.semantic_evidence import (
    SemanticEvidenceRequest,
    SemanticEvidenceResponse,
)
from app.services.matching.service import MatchService
from app.services.semantic.evidence_finder import SemanticEvidenceFinder

router = APIRouter()


@router.post(
    "",
    response_model=MatchReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Explainable Job Match Report",
    description="Compares a parsed candidate resume against a parsed job description and returns an evidence-grounded qualification index with dual source-span provenance.",
)
def create_match_report(
    payload: MatchRequest,
    db: Session = Depends(get_db),
) -> MatchReportResponse:
    """Generate or retrieve cached match report for a resume and job description."""
    return MatchService.generate_or_get_match(
        db=db,
        resume_id=payload.resume_id,
        job_id=payload.job_id,
        force=payload.force,
    )


@router.get(
    "/{match_id}",
    response_model=MatchReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Match Report by ID",
    description="Retrieves a complete explainable match report by unique identifier.",
)
def get_match_report(
    match_id: str,
    db: Session = Depends(get_db),
) -> MatchReportResponse:
    """Retrieve detailed match report."""
    return MatchService.get_match_report(db=db, match_id=match_id)


@router.get(
    "",
    response_model=MatchReportListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Match Reports with Pagination",
    description="Retrieves stored match reports with pagination and optional resume_id or job_id filters.",
)
def list_match_reports(
    page: int = Query(1, ge=1, description="Page number starting at 1"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    resume_id: Optional[str] = Query(None, description="Filter by candidate resume ID"),
    job_id: Optional[str] = Query(None, description="Filter by job description ID"),
    db: Session = Depends(get_db),
) -> MatchReportListResponse:
    """List match reports."""
    return MatchService.list_match_reports(
        db=db,
        page=page,
        page_size=page_size,
        resume_id=resume_id,
        job_id=job_id,
    )


@router.delete(
    "/{match_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Match Report",
    description="Removes the specified match report.",
)
def delete_match_report(
    match_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Delete a match report by ID."""
    MatchService.delete_match_report(db=db, match_id=match_id)


@router.post(
    "/{match_id}/semantic-evidence",
    response_model=SemanticEvidenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve Semantic Evidence Passages for a Match Report",
    description=(
        "Retrieves semantically relevant textual passages from the candidate resume associated "
        "with this match report for a specific job requirement query. Uses local all-MiniLM-L6-v2 embeddings. "
        "Cosine similarity serves as a ranking signal, not a qualification probability."
    ),
)
def get_semantic_evidence_for_match(
    match_id: str,
    payload: SemanticEvidenceRequest,
    db: Session = Depends(get_db),
) -> SemanticEvidenceResponse:
    """Retrieve semantically relevant candidate resume passages for a requirement."""
    # 1. Fetch match report and verify relationship
    match_report = db.get(MatchReport, match_id)
    if not match_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match report with ID '{match_id}' not found.",
        )

    # 2. Fetch associated resume
    resume = db.get(Resume, match_report.resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated candidate resume '{match_report.resume_id}' not found.",
        )

    # 3. Retrieve evidence passages safely
    try:
        return SemanticEvidenceFinder.find_evidence(
            raw_resume_text=resume.raw_text,
            requirement_text=payload.requirement_text,
            match_id=match_id,
            resume_id=resume.id,
            top_k=payload.top_k,
            min_similarity=payload.min_similarity,
        )
    except FileNotFoundError as err:
        # Hide internal disk paths, provide clear actionable message
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local semantic embedding model is not installed or configured on the server.",
        ) from err
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        ) from val_err
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute semantic evidence retrieval.",
        ) from exc
