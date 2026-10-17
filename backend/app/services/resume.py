import io
import re
from pathlib import Path
from typing import Tuple, List, Optional
import pypdf
from pypdf.errors import PdfReadError
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.config import settings
from app.models.resume import Resume
from app.schemas.resume import (
    ResumeSummaryResponse,
    ResumeDetailResponse,
    ResumeListResponse,
)


def sanitize_filename(filename: Optional[str]) -> str:
    """Sanitize original filename to prevent directory traversal and injection.

    Strips directory separators, null bytes, and control characters, leaving
    a safe alphanumeric basename with standard extension.
    """
    if not filename or not filename.strip():
        return "uploaded_resume.txt"

    # Normalize backslashes (Windows) to forward slashes (POSIX) before extracting basename
    normalized = filename.replace("\\", "/")
    base_name = Path(normalized).name
    # Remove null bytes, path characters and control chars
    sanitized = re.sub(r"[\x00-\x1f\x7f/\\]", "", base_name).strip()
    # Replace dangerous characters with underscore
    sanitized = re.sub(r"[^\w\s\.-]", "_", sanitized)
    # Collapse multiple dots/spaces
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    if not sanitized or sanitized.startswith("."):
        sanitized = f"resume_{sanitized}".strip("_")
    return sanitized[:255]


def extract_text_from_pdf(content: bytes) -> str:
    """Extract textual content from PDF byte stream.

    Validates PDF format and ensures text can be extracted.
    Raises HTTPException if file is malformed, unreadable, or image-only (requiring OCR).
    """
    # Verify PDF signature in header
    if not content.startswith(b"%PDF"):
        # Some PDFs have slight leading whitespace/comments
        if b"%PDF" not in content[:1024]:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Invalid file signature: Content does not match standard PDF specification.",
            )

    try:
        pdf_stream = io.BytesIO(content)
        reader = pypdf.PdfReader(pdf_stream)
        if len(reader.pages) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF contains no pages.",
            )

        extracted_parts: List[str] = []
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                extracted_parts.append(page_text.strip())

        full_text = "\n\n".join(extracted_parts).strip()
        if not full_text:
            # Fallback to local OCR for scanned / image-only PDFs
            from app.services.ocr import OCRExtractor
            return OCRExtractor.extract_text_from_scanned_pdf(content)

        return full_text
    except HTTPException:
        raise
    except PdfReadError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed or encrypted PDF document: {str(err)}",
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read PDF document: {str(err)}",
        )


def extract_text_from_txt(content: bytes) -> str:
    """Extract textual content from plain-text bytes.

    Validates UTF-8 encoding and rejects binary files.
    """
    # Quick check for binary/null bytes
    if b"\x00" in content:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Binary file detected. Plain text files must be valid UTF-8 text.",
        )

    try:
        text = content.decode("utf-8").strip()
    except UnicodeDecodeError:
        try:
            # Fallback check for utf-8-sig
            text = content.decode("utf-8-sig").strip()
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plain text file must be UTF-8 encoded.",
            )

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded text resume is empty.",
        )

    return text


def validate_and_extract_content(filename: str, content: bytes) -> Tuple[str, str, str]:
    """Validate file size, extension, format signature, and extract readable text.

    Returns:
        (sanitized_filename, file_type, extracted_text)
    """
    safe_name = sanitize_filename(filename)
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file size ({file_size} bytes) exceeds the maximum limit of {max_mb:.1f} MB.",
        )

    ext = Path(safe_name).suffix.lower()
    if ext == ".pdf":
        file_type = "pdf"
        extracted_text = extract_text_from_pdf(content)
    elif ext in [".txt", ".text"]:
        file_type = "txt"
        extracted_text = extract_text_from_txt(content)
    else:
        # Check content signature before outright rejection
        if content.startswith(b"%PDF") or b"%PDF" in content[:1024]:
            file_type = "pdf"
            extracted_text = extract_text_from_pdf(content)
        else:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported file format. Only PDF (.pdf) and plain text (.txt) files are accepted.",
            )

    return safe_name, file_type, extracted_text


class ResumeService:
    """Service handling resume persistence, queries, and deletions."""

    @staticmethod
    def create_resume(
        db: Session,
        filename: str,
        content: bytes,
    ) -> ResumeDetailResponse:
        """Process upload, validate content, persist model, and return details."""
        safe_name, file_type, raw_text = validate_and_extract_content(filename, content)

        resume = Resume(
            filename=safe_name,
            file_type=file_type,
            file_size=len(content),
            raw_text=raw_text,
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        return ResumeDetailResponse.model_validate(resume)

    @staticmethod
    def list_resumes(db: Session, skip: int = 0, limit: int = 50) -> ResumeListResponse:
        """List metadata for stored resumes ordered by creation date."""
        query = select(Resume).order_by(desc(Resume.created_at)).offset(skip).limit(limit)
        resumes = db.execute(query).scalars().all()

        count_query = select(Resume)
        total = len(db.execute(count_query).scalars().all())

        items = [ResumeSummaryResponse.model_validate(r) for r in resumes]
        return ResumeListResponse(items=items, total=total)

    @staticmethod
    def get_resume(db: Session, resume_id: str) -> ResumeDetailResponse:
        """Retrieve full details of a specific resume including extracted text."""
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID '{resume_id}' not found.",
            )
        return ResumeDetailResponse.model_validate(resume)

    @staticmethod
    def delete_resume(db: Session, resume_id: str) -> None:
        """Delete a resume by ID."""
        resume = db.get(Resume, resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID '{resume_id}' not found.",
            )
        db.delete(resume)
        db.commit()
