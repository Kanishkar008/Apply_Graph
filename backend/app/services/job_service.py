"""Service for job description ingestion, file validation, OCR extraction, and retrieval."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import Job
from app.schemas.job import (
    JobDetailResponse,
    JobListResponse,
    JobSummaryResponse,
)
from app.services.job_parser.extractor import JobExtractor
from app.services.resume import (
    extract_text_from_pdf,
    extract_text_from_txt,
    sanitize_filename,
)


class JobService:
    """Manages job descriptions, text ingestion, and file upload pipelines."""

    @staticmethod
    def create_job_from_text(
        db: Session,
        raw_text: str,
        title: Optional[str] = None,
        company: Optional[str] = None,
        location: Optional[str] = None,
    ) -> Job:
        """Create a job description directly from plain text input."""
        cleaned_text = raw_text.strip()
        if not cleaned_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job description text cannot be empty.",
            )

        # Check payload size
        byte_size = len(cleaned_text.encode("utf-8"))
        if byte_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Job description payload exceeds limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes.",
            )

        # Extract metadata if not provided
        meta = JobExtractor._extract_metadata(cleaned_text)
        final_title = title.strip() if title and title.strip() else meta.get("title")
        final_company = company.strip() if company and company.strip() else meta.get("company")
        final_location = location.strip() if location and location.strip() else meta.get("location")

        job = Job(
            title=final_title[:255] if final_title else None,
            company=final_company[:255] if final_company else None,
            location=final_location[:255] if final_location else None,
            source_type="text",
            file_size=byte_size,
            raw_text=cleaned_text,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def create_job_from_file(
        db: Session,
        filename: str,
        content: bytes,
        title: Optional[str] = None,
        company: Optional[str] = None,
        location: Optional[str] = None,
    ) -> Job:
        """Create a job description by uploading a TXT or PDF (with local OCR fallback)."""
        file_size = len(content)
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size {file_size} bytes exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes.",
            )

        safe_name = sanitize_filename(filename)
        lower_name = safe_name.lower()

        source_type = "txt"
        if lower_name.endswith(".pdf"):
            source_type = "pdf"
            extracted_text = extract_text_from_pdf(content)
        elif lower_name.endswith(".txt"):
            source_type = "txt"
            extracted_text = extract_text_from_txt(content)
        else:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported file type. Only PDF (.pdf) and plain text (.txt) files are accepted.",
            )

        cleaned_text = extracted_text.strip()
        if not cleaned_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No readable text could be extracted from the uploaded document.",
            )

        meta = JobExtractor._extract_metadata(cleaned_text)
        final_title = title.strip() if title and title.strip() else meta.get("title")
        final_company = company.strip() if company and company.strip() else meta.get("company")
        final_location = location.strip() if location and location.strip() else meta.get("location")

        job = Job(
            title=final_title[:255] if final_title else safe_name,
            company=final_company[:255] if final_company else None,
            location=final_location[:255] if final_location else None,
            source_type=source_type,
            file_size=file_size,
            raw_text=cleaned_text,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_jobs(db: Session, page: int = 1, page_size: int = 10) -> JobListResponse:
        """Retrieve paginated collection of job descriptions ordered by newest first."""
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 10

        offset = (page - 1) * page_size
        total = db.scalar(select(func.count(Job.id))) or 0

        stmt = select(Job).order_by(desc(Job.created_at)).offset(offset).limit(page_size)
        items = db.scalars(stmt).all()

        return JobListResponse(
            items=[JobSummaryResponse.model_validate(j) for j in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def get_job_by_id(db: Session, job_id: str) -> Job:
        """Fetch single job description or raise 404."""
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description with ID '{job_id}' not found.",
            )
        return job

    @staticmethod
    def delete_job(db: Session, job_id: str) -> None:
        """Delete job description and cascade delete its parsed profile."""
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job description with ID '{job_id}' not found.",
            )
        db.delete(job)
        db.commit()
