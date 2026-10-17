"""Service managing structured job intelligence, audit snapshots, and user corrections."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.parsed_job import ParsedJob
from app.schemas.job_parsed import (
    ParsedJobResponse,
    ParsedJobUpdateRequest,
)
from app.services.job_parser.extractor import JobExtractor
from app.services.job_parser.validator import JobValidator


class ParsedJobService:
    """Handles structured job parsing, retrieval, audit tracking, and user corrections."""

    @staticmethod
    def parse_job(
        db: Session,
        job_id: str,
        force: bool = False,
        overwrite_user_corrections: bool = False,
    ) -> ParsedJobResponse:
        """Parse raw job description text into structured intelligence.

        Policy for existing parsed profiles:
        - If profile exists and force=False: returns existing profile idempotently.
        - If profile exists, is user-corrected (is_user_corrected=True), and force=True:
          raises HTTP 409 Conflict unless overwrite_user_corrections=True is provided.
        - If profile exists and is uncorrected (or overwrite permitted):
          re-extracts from raw text and updates parsed_data and extracted_data snapshot.
        """
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description with ID '{job_id}' not found.",
            )

        existing = job.parsed_profile
        if existing and not force:
            return ParsedJobResponse.model_validate(existing)

        if existing and force:
            if existing.is_user_corrected and not overwrite_user_corrections:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Job description has manual user corrections. Re-parsing with force=true will overwrite "
                        "these changes. Pass 'overwrite_user_corrections=true' to confirm overwrite."
                    ),
                )

        # Execute extraction and validation
        raw_parsed = JobExtractor.parse_job_text(job.raw_text)
        validated_data, warnings = JobValidator.validate_and_sanitize(raw_parsed, job.raw_text)

        data_dict = validated_data.model_dump()

        if existing:
            existing.parsed_data = data_dict
            existing.extracted_data = data_dict
            existing.parse_warnings = warnings
            existing.is_user_corrected = False
            db.commit()
            db.refresh(existing)
            return ParsedJobResponse.model_validate(existing)

        profile = ParsedJob(
            job_id=job.id,
            parsed_data=data_dict,
            extracted_data=data_dict,
            parse_warnings=warnings,
            is_user_corrected=False,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return ParsedJobResponse.model_validate(profile)

    @staticmethod
    def get_parsed_job(db: Session, job_id: str) -> ParsedJobResponse:
        """Retrieve existing structured intelligence for a job description."""
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description with ID '{job_id}' not found.",
            )

        if not job.parsed_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description '{job_id}' has not been parsed yet. Trigger POST /api/v1/jobs/{job_id}/parse first.",
            )

        return ParsedJobResponse.model_validate(job.parsed_profile)

    @staticmethod
    def update_parsed_job(
        db: Session,
        job_id: str,
        update_req: ParsedJobUpdateRequest,
    ) -> ParsedJobResponse:
        """Apply user reviews and corrections to structured job intelligence.

        Preserves immutable extracted_data snapshot for auditability,
        updates parsed_data with verified changes, and marks is_user_corrected=True.
        """
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description with ID '{job_id}' not found.",
            )

        existing = job.parsed_profile
        if not existing:
            raw_parsed = JobExtractor.parse_job_text(job.raw_text)
            validated_init, warnings_init = JobValidator.validate_and_sanitize(raw_parsed, job.raw_text)
            init_dict = validated_init.model_dump()
            existing = ParsedJob(
                job_id=job.id,
                parsed_data=init_dict,
                extracted_data=init_dict,
                parse_warnings=warnings_init,
                is_user_corrected=False,
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)

        # Validate corrected data
        validated_data, warnings = JobValidator.validate_and_sanitize(
            update_req.parsed_data,
            job.raw_text,
        )

        existing.parsed_data = validated_data.model_dump()
        existing.parse_warnings = warnings
        existing.is_user_corrected = True
        # Note: existing.extracted_data is intentionally NOT modified to preserve provenance snapshot!

        db.commit()
        db.refresh(existing)
        return ParsedJobResponse.model_validate(existing)
