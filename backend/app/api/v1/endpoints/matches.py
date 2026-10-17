from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.match import (
    MatchReportListResponse,
    MatchReportResponse,
    MatchRequest,
)
from app.services.matching.service import MatchService

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
