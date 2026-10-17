from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    """Payload for creating a job description via raw text input."""

    title: Optional[str] = Field(None, max_length=255, description="Job title if known")
    company: Optional[str] = Field(None, max_length=255, description="Company name if known")
    location: Optional[str] = Field(None, max_length=255, description="Location if known")
    raw_text: str = Field(..., min_length=1, description="Raw job description text")


class JobSummaryResponse(BaseModel):
    """Summary job response without heavy raw text payload."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique job identifier")
    title: Optional[str] = Field(None, description="Job title")
    company: Optional[str] = Field(None, description="Hiring company")
    location: Optional[str] = Field(None, description="Work location")
    source_type: str = Field("text", description="Origin format: text, pdf, txt, scanned_pdf")
    file_size: int = Field(0, description="Payload size in bytes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")


class JobDetailResponse(JobSummaryResponse):
    """Detailed job response including raw text payload."""

    raw_text: str = Field(..., description="Raw job description text")


class JobListResponse(BaseModel):
    """Paginated collection of job descriptions."""

    items: List[JobSummaryResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total count of jobs")
    page: int = Field(1, ge=1, description="Current page number")
    page_size: int = Field(10, ge=1, description="Items per page")
