"""Service managing structured resume intelligence, audit snapshots, and user corrections."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.parsed_resume import ParsedResume
from app.models.resume import Resume
from app.schemas.resume_parsed import (
    FactOrigin,
    ParsedResumeData,
    ParsedResumeResponse,
    ParsedResumeUpdateRequest,
)
from app.services.parser.extractor import ResumeExtractor
from app.services.parser.validator import ResumeValidator


class ParsedResumeService:
    """Handles structured resume parsing, retrieval, and user correction workflows."""

    @staticmethod
    def parse_resume(
        db: Session,
        resume_id: str,
        force: bool = False,
        overwrite_user_corrections: bool = False,
    ) -> ParsedResumeResponse:
        """Parse raw resume text into structured intelligence.

        Policy for existing parsed profiles:
        - If profile exists and `force=False`: Returns existing profile idempotently.
        - If profile exists, is user-corrected (`is_user_corrected=True`), and `force=True`:
          Raises HTTP 409 Conflict unless `overwrite_user_corrections=True` is explicitly specified.
        - If profile exists and is uncorrected (or overwrite permitted):
          Re-extracts from raw text and updates both parsed_data and extracted_data.
        """
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID '{resume_id}' not found.",
            )

        existing = resume.parsed_profile
        if existing and not force:
            return ParsedResumeResponse.model_validate(existing)

        if existing and force:
            if existing.is_user_corrected and not overwrite_user_corrections:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Resume has manual user corrections. Re-parsing with force=true will overwrite "
                        "these changes. Pass 'overwrite_user_corrections=true' to confirm overwrite."
                    ),
                )

        # Execute extraction and validation
        raw_parsed = ResumeExtractor.parse_resume_text(resume.raw_text)
        validated_data, warnings = ResumeValidator.validate_and_sanitize(raw_parsed, resume.raw_text)

        data_dict = validated_data.model_dump()

        if existing:
            existing.parsed_data = data_dict
            existing.extracted_data = data_dict
            existing.parse_warnings = warnings
            existing.is_user_corrected = False
            db.commit()
            db.refresh(existing)
            return ParsedResumeResponse.model_validate(existing)

        profile = ParsedResume(
            resume_id=resume.id,
            parsed_data=data_dict,
            extracted_data=data_dict,
            parse_warnings=warnings,
            is_user_corrected=False,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return ParsedResumeResponse.model_validate(profile)

    @staticmethod
    def get_parsed_resume(db: Session, resume_id: str) -> ParsedResumeResponse:
        """Retrieve existing structured intelligence for a resume."""
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID '{resume_id}' not found.",
            )

        if not resume.parsed_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume '{resume_id}' has not been parsed yet. Trigger POST /api/v1/resumes/{resume_id}/parse first.",
            )

        return ParsedResumeResponse.model_validate(resume.parsed_profile)

    @staticmethod
    def update_parsed_resume(
        db: Session,
        resume_id: str,
        update_req: ParsedResumeUpdateRequest,
    ) -> ParsedResumeResponse:
        """Apply user reviews and corrections to structured resume data.

        Preserves the immutable `extracted_data` snapshot for auditability,
        updates `parsed_data` with verified changes, and marks `is_user_corrected=True`.
        """
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID '{resume_id}' not found.",
            )

        existing = resume.parsed_profile
        if not existing:
            # Baseline parse to establish initial extracted_data snapshot
            raw_parsed = ResumeExtractor.parse_resume_text(resume.raw_text)
            validated_init, warnings_init = ResumeValidator.validate_and_sanitize(raw_parsed, resume.raw_text)
            init_dict = validated_init.model_dump()
            existing = ParsedResume(
                resume_id=resume.id,
                parsed_data=init_dict,
                extracted_data=init_dict,
                parse_warnings=warnings_init,
                is_user_corrected=False,
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)

        # Validate corrected data
        validated_data, warnings = ResumeValidator.validate_and_sanitize(
            update_req.parsed_data,
            resume.raw_text,
        )

        existing.parsed_data = validated_data.model_dump()
        existing.parse_warnings = warnings
        existing.is_user_corrected = True
        # Note: existing.extracted_data is intentionally NOT modified to preserve provenance audit!

        db.commit()
        db.refresh(existing)
        return ParsedResumeResponse.model_validate(existing)
