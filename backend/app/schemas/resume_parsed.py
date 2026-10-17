from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class FactOrigin(str, Enum):
    """Tracks whether a fact originated from the parser or direct user input."""

    EXTRACTED = "extracted"
    USER_ADDED = "user_added"
    USER_EDITED = "user_edited"


class SourceSpan(BaseModel):
    """Evidence span anchoring an extracted fact to the original raw text.

    Guarantees verifiable provenance:
    - `source_text` is the exact verbatim snippet from the resume text.
    - `char_start` and `char_end` are the 0-indexed character offsets in raw_text.
    """

    model_config = ConfigDict(from_attributes=True)

    source_text: str = Field(..., description="Exact verbatim snippet extracted from raw resume text")
    char_start: Optional[int] = Field(None, ge=0, description="Start character index in resume raw_text")
    char_end: Optional[int] = Field(None, ge=0, description="End character index in resume raw_text")

    def verify_against_text(self, raw_text: str) -> bool:
        """Verify whether this evidence span accurately matches the raw text."""
        if not self.source_text:
            return False
        if self.char_start is not None and self.char_end is not None:
            if 0 <= self.char_start < self.char_end <= len(raw_text):
                actual_slice = raw_text[self.char_start : self.char_end]
                if actual_slice == self.source_text:
                    return True
        # Fallback check: source_text exists anywhere in raw_text
        return self.source_text in raw_text


class ParsedSkill(BaseModel):
    """Extracted or user-specified skill mention."""

    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Normalized skill name (e.g. Python, Docker)")
    category: Optional[str] = Field(None, description="Category: language, framework, database, tool, cloud, soft_skill")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance: extracted, user_added, or user_edited")
    source: Optional[SourceSpan] = Field(None, description="Evidence span for extracted facts; None for user-added")


class ParsedExperience(BaseModel):
    """Work experience entry."""

    model_config = ConfigDict(from_attributes=True)

    company: Optional[str] = Field(None, description="Employer or organization name")
    role: Optional[str] = Field(None, description="Job title or designation")
    start_date: Optional[str] = Field(None, description="Normalized start date (e.g., '2021-06' or '2021')")
    end_date: Optional[str] = Field(None, description="Normalized end date or 'Present'")
    is_current: bool = Field(False, description="Whether this is the candidate's active role")
    location: Optional[str] = Field(None, description="City, state, or Remote")
    description: Optional[str] = Field(None, description="Role summary or narrative")
    highlights: List[str] = Field(default_factory=list, description="Bullet points / achievements")
    skills_used: List[str] = Field(default_factory=list, description="Explicit skills mentioned in this role")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedEducation(BaseModel):
    """Education history entry."""

    model_config = ConfigDict(from_attributes=True)

    institution: Optional[str] = Field(None, description="School, university, or academy name")
    degree: Optional[str] = Field(None, description="Degree or credential (e.g., B.S., M.S., Ph.D.)")
    field_of_study: Optional[str] = Field(None, description="Major or specialization")
    start_date: Optional[str] = Field(None, description="Start date/year")
    end_date: Optional[str] = Field(None, description="Graduation date/year or 'Expected 2026'")
    gpa: Optional[str] = Field(None, description="Reported GPA or honors (if explicitly stated in text)")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedProject(BaseModel):
    """Project portfolio entry."""

    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Project title")
    description: Optional[str] = Field(None, description="Project summary")
    url: Optional[str] = Field(None, description="Live URL or repository link")
    technologies: List[str] = Field(default_factory=list, description="Referenced technologies")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedCertification(BaseModel):
    """Professional certification or license."""

    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Certification name")
    issuer: Optional[str] = Field(None, description="Issuing body (e.g., AWS, Cisco, Coursera)")
    date: Optional[str] = Field(None, description="Issue date or year")
    url: Optional[str] = Field(None, description="Credential URL or ID")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedResumeData(BaseModel):
    """Comprehensive structured intelligence extracted from the resume."""

    model_config = ConfigDict(from_attributes=True)

    candidate_name: Optional[str] = Field(None, description="Candidate full name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    location: Optional[str] = Field(None, description="Candidate location")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")
    summary: Optional[str] = Field(None, description="Professional summary or objective")
    skills: List[ParsedSkill] = Field(default_factory=list, description="Extracted skills")
    work_experience: List[ParsedExperience] = Field(default_factory=list, description="Work experience entries")
    education: List[ParsedEducation] = Field(default_factory=list, description="Education history entries")
    projects: List[ParsedProject] = Field(default_factory=list, description="Projects")
    certifications: List[ParsedCertification] = Field(default_factory=list, description="Certifications")


class ParsedResumeResponse(BaseModel):
    """Complete parsed resume response including audit snapshot and user correction state."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Parsed profile unique identifier")
    resume_id: str = Field(..., description="Associated resume ID")
    parsed_data: ParsedResumeData = Field(..., description="Active structured data (includes any user corrections)")
    extracted_data: Optional[ParsedResumeData] = Field(
        None,
        description="Immutable snapshot of the original parser extraction for auditability and diffing",
    )
    is_user_corrected: bool = Field(False, description="Flag indicating if user has manually edited the parsed data")
    parse_warnings: List[str] = Field(default_factory=list, description="Ambiguity or formatting warnings detected by validator")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last updated timestamp")


class ParsedResumeUpdateRequest(BaseModel):
    """Payload for submitting user corrections to structured resume intelligence."""

    parsed_data: ParsedResumeData = Field(..., description="Updated structured resume data with user edits")
