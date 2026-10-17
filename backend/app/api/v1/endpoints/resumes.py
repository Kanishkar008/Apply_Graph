from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    status,
    Query,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.resume import (
    ResumeSummaryResponse,
    ResumeDetailResponse,
)
from app.schemas.resume_parsed import (
    ParsedResumeResponse,
    ParsedResumeUpdateRequest,
)
from app.services.resume import ResumeService
from app.services.parsed_resume_service import ParsedResumeService

router = APIRouter()


@router.post(
    "",
    response_model=ResumeDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and Ingest Candidate Resume",
    description="Accepts a PDF or plain-text resume file, validates format and size, extracts readable text, and stores metadata in PostgreSQL.",
)
async def upload_resume(
    file: UploadFile = File(..., description="Resume document in PDF (.pdf) or text (.txt) format"),
    db: Session = Depends(get_db),
) -> ResumeDetailResponse:
    """Handle resume file upload, content parsing, and persistence."""
    content = await file.read()
    return ResumeService.create_resume(
        db=db,
        filename=file.filename or "uploaded_resume.txt",
        content=content,
    )


@router.get(
    "",
    response_model=List[ResumeSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="List Ingested Resumes",
    description="Returns metadata for stored resumes without including the full extracted text payload.",
)
def list_resumes(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
) -> List[ResumeSummaryResponse]:
    """Retrieve metadata list of all stored resumes."""
    result = ResumeService.list_resumes(db=db, skip=skip, limit=limit)
    return result.items


@router.get(
    "/{resume_id}",
    response_model=ResumeDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Resume by ID",
    description="Returns full metadata and extracted plain-text content for the specified resume.",
)
def get_resume(
    resume_id: str,
    db: Session = Depends(get_db),
) -> ResumeDetailResponse:
    """Retrieve details and extracted text of a single resume."""
    return ResumeService.get_resume(db=db, resume_id=resume_id)


@router.delete(
    "/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Resume",
    description="Removes the specified resume and its extracted text from the database.",
)
def delete_resume(
    resume_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Delete a resume by ID."""
    ResumeService.delete_resume(db=db, resume_id=resume_id)


@router.post(
    "/{resume_id}/parse",
    response_model=ParsedResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse Resume into Structured Intelligence",
    description="Transforms raw resume text into verified skills, experience, education, projects, certifications, and dates with evidence provenance.",
)
def parse_resume(
    resume_id: str,
    force: bool = Query(False, description="Re-run parsing even if already parsed"),
    overwrite_user_corrections: bool = Query(
        False,
        description="Explicit authorization to overwrite existing manual user edits when force=true",
    ),
    db: Session = Depends(get_db),
) -> ParsedResumeResponse:
    """Extract structured data from resume text and persist profile."""
    return ParsedResumeService.parse_resume(
        db=db,
        resume_id=resume_id,
        force=force,
        overwrite_user_corrections=overwrite_user_corrections,
    )


@router.get(
    "/{resume_id}/parsed",
    response_model=ParsedResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Structured Resume Intelligence",
    description="Retrieves the structured intelligence profile, verifiable evidence spans, and user correction status.",
)
def get_parsed_resume(
    resume_id: str,
    db: Session = Depends(get_db),
) -> ParsedResumeResponse:
    """Retrieve structured parsed data for a resume."""
    return ParsedResumeService.get_parsed_resume(db=db, resume_id=resume_id)


@router.put(
    "/{resume_id}/parsed",
    response_model=ParsedResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Correct / Update Structured Resume Intelligence",
    description="Allows users to inspect and correct extracted facts, updating active parsed data while preserving the original immutable parser extraction snapshot.",
)
def update_parsed_resume(
    resume_id: str,
    payload: ParsedResumeUpdateRequest,
    db: Session = Depends(get_db),
) -> ParsedResumeResponse:
    """Save user corrections to the structured resume profile."""
    return ParsedResumeService.update_parsed_resume(
        db=db,
        resume_id=resume_id,
        update_req=payload,
    )

