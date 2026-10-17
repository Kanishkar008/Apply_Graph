from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.job import (
    JobCreate,
    JobDetailResponse,
    JobListResponse,
)
from app.schemas.job_parsed import (
    ParsedJobResponse,
    ParsedJobUpdateRequest,
)
from app.services.job_service import JobService
from app.services.parsed_job_service import ParsedJobService

router = APIRouter()


@router.post(
    "",
    response_model=JobDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or Upload Job Description",
    description="Accepts job description as JSON text or multipart file upload (.txt, .pdf, including scanned PDFs with OCR fallback).",
)
async def create_job(
    request: Request,
    db: Session = Depends(get_db),
) -> JobDetailResponse:
    """Create a new job description via text entry or file upload."""
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = JobCreate(**body)
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=e.errors(),
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload.",
            )

        job = JobService.create_job_from_text(
            db=db,
            raw_text=payload.raw_text,
            title=payload.title,
            company=payload.company,
            location=payload.location,
        )
        return JobDetailResponse.model_validate(job)

    elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        title = form.get("title")
        company = form.get("company")
        location = form.get("location")
        raw_text = form.get("raw_text")

        title_str = str(title) if title else None
        company_str = str(company) if company else None
        location_str = str(location) if location else None

        if uploaded_file and hasattr(uploaded_file, "read"):
            content = await uploaded_file.read()
            filename = getattr(uploaded_file, "filename", "uploaded_job.txt")
            job = JobService.create_job_from_file(
                db=db,
                filename=filename,
                content=content,
                title=title_str,
                company=company_str,
                location=location_str,
            )
            return JobDetailResponse.model_validate(job)
        elif raw_text:
            job = JobService.create_job_from_text(
                db=db,
                raw_text=str(raw_text),
                title=title_str,
                company=company_str,
                location=location_str,
            )
            return JobDetailResponse.model_validate(job)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must provide either 'file' or 'raw_text' in multipart form data.",
            )
    else:
        # Fallback to JSON
        try:
            body = await request.json()
            payload = JobCreate(**body)
            job = JobService.create_job_from_text(
                db=db,
                raw_text=payload.raw_text,
                title=payload.title,
                company=payload.company,
                location=payload.location,
            )
            return JobDetailResponse.model_validate(job)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expected application/json or multipart/form-data payload.",
            )


@router.get(
    "",
    response_model=JobListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Job Descriptions with Pagination",
    description="Returns paginated metadata for ingested job descriptions ordered newest first.",
)
def list_jobs(
    page: int = Query(1, ge=1, description="Page number starting at 1"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> JobListResponse:
    """Retrieve paginated list of stored job descriptions."""
    return JobService.get_jobs(db=db, page=page, page_size=page_size)


@router.get(
    "/{job_id}",
    response_model=JobDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Job Description by ID",
    description="Returns detailed metadata and raw text for the specified job description.",
)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
) -> JobDetailResponse:
    """Retrieve details and raw text of a single job description."""
    job = JobService.get_job_by_id(db=db, job_id=job_id)
    return JobDetailResponse.model_validate(job)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Job Description",
    description="Removes the specified job description and cascades deletion to its parsed intelligence profile.",
)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Delete a job description by ID."""
    JobService.delete_job(db=db, job_id=job_id)


@router.post(
    "/{job_id}/parse",
    response_model=ParsedJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse Job Description into Structured Intelligence",
    description="Extracts required and preferred skills, experience, education, salary, and responsibilities with source evidence spans.",
)
def parse_job(
    job_id: str,
    force: bool = Query(False, description="Re-run extraction even if profile already exists"),
    overwrite_user_corrections: bool = Query(
        False,
        description="Explicit confirmation required to overwrite user corrections when force=True",
    ),
    db: Session = Depends(get_db),
) -> ParsedJobResponse:
    """Parse raw job description text into structured requirements."""
    return ParsedJobService.parse_job(
        db=db,
        job_id=job_id,
        force=force,
        overwrite_user_corrections=overwrite_user_corrections,
    )


@router.get(
    "/{job_id}/parsed",
    response_model=ParsedJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Parsed Job Intelligence",
    description="Retrieves the structured profile, immutable audit snapshot, and validation warnings for a job description.",
)
def get_parsed_job(
    job_id: str,
    db: Session = Depends(get_db),
) -> ParsedJobResponse:
    """Retrieve structured job requirements."""
    return ParsedJobService.get_parsed_job(db=db, job_id=job_id)


@router.put(
    "/{job_id}/parsed",
    response_model=ParsedJobResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Parsed Job Intelligence with User Corrections",
    description="Stores user corrections separately while preserving the original extraction snapshot.",
)
def update_parsed_job(
    job_id: str,
    update_req: ParsedJobUpdateRequest,
    db: Session = Depends(get_db),
) -> ParsedJobResponse:
    """Submit user reviews and corrections for job requirements."""
    return ParsedJobService.update_parsed_job(
        db=db,
        job_id=job_id,
        update_req=update_req,
    )
