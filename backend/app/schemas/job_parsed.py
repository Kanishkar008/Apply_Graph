from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.resume_parsed import FactOrigin, SourceSpan


class RequirementLevel(str, Enum):
    """Categorizes whether a skill/qualification is required or preferred."""

    REQUIRED = "required"
    PREFERRED = "preferred"
    AMBIGUOUS = "ambiguous"


class ParsedJobSkill(BaseModel):
    """Structured skill requirement with section classification and explicit experience linkage."""

    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Normalized skill name (e.g. Python, Docker, React)")
    category: Optional[str] = Field(None, description="Skill category (language, framework, cloud, etc.)")
    requirement_level: RequirementLevel = Field(
        RequirementLevel.REQUIRED,
        description="Whether skill is required, preferred, or ambiguous based on section/context",
    )
    years_required: Optional[float] = Field(
        None,
        ge=0,
        description="Explicit years required for this specific skill if explicitly stated (e.g. 5+ years of Python)",
    )
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Exact verbatim text evidence span")


class ParsedJobExperienceRequirement(BaseModel):
    """General or role-level experience requirement."""

    model_config = ConfigDict(from_attributes=True)

    min_years: Optional[float] = Field(None, ge=0, description="Minimum general years required")
    max_years: Optional[float] = Field(None, ge=0, description="Maximum general years if specified as range")
    description: Optional[str] = Field(None, description="Verbatim or summarized requirement context")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedJobEducationRequirement(BaseModel):
    """Education credential requirement."""

    model_config = ConfigDict(from_attributes=True)

    degree_level: Optional[str] = Field(None, description="Degree level (e.g. Bachelor's, Master's, Ph.D.)")
    field_of_study: Optional[str] = Field(None, description="Major or area (e.g. Computer Science, Engineering)")
    requirement_level: RequirementLevel = Field(RequirementLevel.REQUIRED, description="Required vs preferred")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedJobSalary(BaseModel):
    """Explicitly stated compensation range."""

    model_config = ConfigDict(from_attributes=True)

    min_amount: Optional[float] = Field(None, ge=0, description="Minimum salary")
    max_amount: Optional[float] = Field(None, ge=0, description="Maximum salary")
    currency: Optional[str] = Field(None, description="Currency code or symbol (e.g. USD, $)")
    interval: Optional[str] = Field(None, description="Payment interval: yearly, monthly, hourly")
    raw_salary_text: Optional[str] = Field(None, description="Verbatim compensation string")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedJobResponsibility(BaseModel):
    """Individual responsibility item or bullet."""

    model_config = ConfigDict(from_attributes=True)

    text: str = Field(..., description="Responsibility description")
    origin: FactOrigin = Field(FactOrigin.EXTRACTED, description="Provenance")
    source: Optional[SourceSpan] = Field(None, description="Evidence span")


class ParsedJobData(BaseModel):
    """Comprehensive structured intelligence extracted from a job description."""

    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = Field(None, description="Job title if extracted or confirmed")
    company: Optional[str] = Field(None, description="Hiring organization")
    location: Optional[str] = Field(None, description="Location or Remote/Hybrid status")
    employment_type: Optional[str] = Field(None, description="Employment type (Full-time, Part-time, Contract, etc.)")
    required_skills: List[ParsedJobSkill] = Field(default_factory=list, description="Mandatory required skills")
    preferred_skills: List[ParsedJobSkill] = Field(default_factory=list, description="Bonus / preferred skills")
    experience_requirements: List[ParsedJobExperienceRequirement] = Field(
        default_factory=list, description="Overall experience requirements"
    )
    education_requirements: List[ParsedJobEducationRequirement] = Field(
        default_factory=list, description="Education requirements"
    )
    responsibilities: List[ParsedJobResponsibility] = Field(
        default_factory=list, description="Core responsibilities"
    )
    salary: Optional[ParsedJobSalary] = Field(None, description="Compensation information if explicitly stated")


class ParsedJobResponse(BaseModel):
    """Complete parsed job response including audit snapshot and user correction state."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Parsed profile unique identifier")
    job_id: str = Field(..., description="Associated job description ID")
    parsed_data: ParsedJobData = Field(..., description="Active structured data (includes any user corrections)")
    extracted_data: Optional[ParsedJobData] = Field(
        None,
        description="Immutable snapshot of the original parser extraction for auditability and diffing",
    )
    is_user_corrected: bool = Field(False, description="Flag indicating if user has manually edited the parsed data")
    parse_warnings: List[str] = Field(default_factory=list, description="Ambiguity or section warnings detected by validator")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last updated timestamp")


class ParsedJobUpdateRequest(BaseModel):
    """Payload for submitting user corrections to structured job intelligence."""

    parsed_data: ParsedJobData = Field(..., description="Updated structured job data with user edits")
