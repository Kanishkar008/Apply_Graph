"""Service for managing explainable match reports, caching, and persistence."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.match_report import MatchReport
from app.models.resume import Resume
from app.schemas.job_parsed import ParsedJobData
from app.schemas.match import (
    MatchReportListResponse,
    MatchReportResponse,
    MatchReportSummary,
    ScoreBreakdown,
)
from app.schemas.resume_parsed import ParsedResumeData
from app.services.matching.engine import MatchingEngine
from app.services.parsed_job_service import ParsedJobService
from app.services.parsed_resume_service import ParsedResumeService


class MatchService:
    """Orchestrates match evaluations, profile verification, and cached persistence."""

    @staticmethod
    def generate_or_get_match(
        db: Session,
        resume_id: str,
        job_id: str,
        force: bool = False,
    ) -> MatchReportResponse:
        """Run explainable matching between resume and job description.

        Idempotent: returns existing report if neither profile has changed since last match.
        """
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID '{resume_id}' not found.",
            )

        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description with ID '{job_id}' not found.",
            )

        # Ensure both profiles are parsed
        if not resume.parsed_profile:
            ParsedResumeService.parse_resume(db, resume_id)
            db.refresh(resume)

        if not job.parsed_profile:
            ParsedJobService.parse_job(db, job_id)
            db.refresh(job)

        # Check existing match report
        stmt = (
            select(MatchReport)
            .where(MatchReport.resume_id == resume_id, MatchReport.job_id == job_id)
            .order_by(desc(MatchReport.updated_at))
        )
        existing = db.scalars(stmt).first()

        if existing and not force:
            # Check if profiles have been modified after report creation
            profiles_newer = (
                resume.parsed_profile.updated_at > existing.updated_at
                or job.parsed_profile.updated_at > existing.updated_at
            )
            if not profiles_newer:
                return MatchService._to_response(existing)

        # Execute deterministic matching
        resume_data = ParsedResumeData.model_validate(resume.parsed_profile.parsed_data)
        job_data = ParsedJobData.model_validate(job.parsed_profile.parsed_data)

        eval_result = MatchingEngine.evaluate_match(
            parsed_resume=resume_data,
            parsed_job=job_data,
            resume_raw_text=resume.raw_text,
            job_raw_text=job.raw_text,
        )

        if existing:
            existing.overall_score = eval_result["overall_score"]
            existing.score_breakdown = eval_result["score_breakdown"]
            existing.matched_skills = eval_result["matched_skills"]
            existing.missing_skills = eval_result["missing_skills"]
            existing.experience_comparison = eval_result["experience_comparison"]
            existing.education_comparison = eval_result["education_comparison"]
            existing.is_provisional = eval_result["is_provisional"]
            existing.provisional_reasons = eval_result["provisional_reasons"]
            db.commit()
            db.refresh(existing)
            return MatchService._to_response(existing)

        report = MatchReport(
            resume_id=resume.id,
            job_id=job.id,
            overall_score=eval_result["overall_score"],
            score_breakdown=eval_result["score_breakdown"],
            matched_skills=eval_result["matched_skills"],
            missing_skills=eval_result["missing_skills"],
            experience_comparison=eval_result["experience_comparison"],
            education_comparison=eval_result["education_comparison"],
            is_provisional=eval_result["is_provisional"],
            provisional_reasons=eval_result["provisional_reasons"],
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return MatchService._to_response(report)

    @staticmethod
    def get_match_report(db: Session, match_id: str) -> MatchReportResponse:
        """Retrieve existing match report by ID."""
        report = db.get(MatchReport, match_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Match report with ID '{match_id}' not found.",
            )
        return MatchService._to_response(report)

    @staticmethod
    def list_match_reports(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        resume_id: Optional[str] = None,
        job_id: Optional[str] = None,
    ) -> MatchReportListResponse:
        """List match reports with pagination and optional filters."""
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 10

        query = select(MatchReport)
        count_query = select(func.count(MatchReport.id))

        if resume_id:
            query = query.where(MatchReport.resume_id == resume_id)
            count_query = count_query.where(MatchReport.resume_id == resume_id)
        if job_id:
            query = query.where(MatchReport.job_id == job_id)
            count_query = count_query.where(MatchReport.job_id == job_id)

        total = db.scalar(count_query) or 0
        offset = (page - 1) * page_size
        items = db.scalars(query.order_by(desc(MatchReport.created_at)).offset(offset).limit(page_size)).all()

        return MatchReportListResponse(
            items=[MatchReportSummary.model_validate(r) for r in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def delete_match_report(db: Session, match_id: str) -> None:
        """Delete single match report."""
        report = db.get(MatchReport, match_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Match report with ID '{match_id}' not found.",
            )
        db.delete(report)
        db.commit()

    @staticmethod
    def _to_response(report: MatchReport) -> MatchReportResponse:
        return MatchReportResponse(
            id=report.id,
            resume_id=report.resume_id,
            job_id=report.job_id,
            overall_score=report.overall_score,
            score_breakdown=ScoreBreakdown.model_validate(report.score_breakdown),
            matched_skills=report.matched_skills,
            missing_skills=report.missing_skills,
            experience_comparison=report.experience_comparison,
            education_comparison=report.education_comparison,
            is_provisional=report.is_provisional,
            provisional_reasons=report.provisional_reasons,
            created_at=report.created_at,
            updated_at=report.updated_at,
        )
