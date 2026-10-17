from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict, Field


class ResumeSummaryResponse(BaseModel):
    """Resume metadata response without raw text payload."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique resume identifier")
    filename: str = Field(..., description="Sanitized original filename")
    file_type: str = Field(..., description="Detected file type (pdf, txt)")
    file_size: int = Field(..., description="File size in bytes")
    created_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")


class ResumeDetailResponse(ResumeSummaryResponse):
    """Detailed resume response including extracted textual content."""

    raw_text: str = Field(..., description="Extracted plain text content")


class ResumeListResponse(BaseModel):
    """Paginated or listed collection of uploaded resumes."""

    items: List[ResumeSummaryResponse]
    total: int
