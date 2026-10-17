from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.job_parsed import RequirementLevel
from app.schemas.resume_parsed import SourceSpan


class SkillMatchStatus(str, Enum):
    """Categorizes the nature of a skill requirement evaluation."""

    EXACT_MATCH = "exact_match"
    RELATED_SKILL = "related_skill"
    MISSING_EVIDENCE = "missing_evidence"
    UNMET_REQUIREMENT = "unmet_requirement"
    AMBIGUOUS_REQUIREMENT = "ambiguous_requirement"


class MatchRequest(BaseModel):
    """Request payload to initiate deterministic job-resume matching."""

    resume_id: str = Field(..., description="ID of ingested resume")
    job_id: str = Field(..., description="ID of ingested job description")
    force: bool = Field(False, description="Whether to recompute report if cached report exists")


class MatchedSkillItem(BaseModel):
    """Structured record of a matched skill with dual-evidence provenance."""

    model_config = ConfigDict(from_attributes=True)

    skill_name: str
    category: Optional[str] = None
    requirement_level: RequirementLevel
    status: SkillMatchStatus
    years_required: Optional[float] = None
    job_source: Optional[SourceSpan] = None
    resume_source: Optional[SourceSpan] = None
    explanation: str


class MissingSkillItem(BaseModel):
    """Record of a job requirement with no verified evidence in candidate profile."""

    model_config = ConfigDict(from_attributes=True)

    skill_name: str
    category: Optional[str] = None
    requirement_level: RequirementLevel
    status: SkillMatchStatus = SkillMatchStatus.MISSING_EVIDENCE
    years_required: Optional[float] = None
    job_source: Optional[SourceSpan] = None
    explanation: str


class ExperienceComparison(BaseModel):
    """Evaluation of general work experience."""

    model_config = ConfigDict(from_attributes=True)

    required_years: Optional[float] = None
    candidate_years: Optional[float] = None
    status: str = Field(..., description="met, partial, unmet, or insufficient_evidence")
    explanation: str
    job_source: Optional[SourceSpan] = None


class EducationComparison(BaseModel):
    """Evaluation of degree credentials."""

    model_config = ConfigDict(from_attributes=True)

    required_level: Optional[str] = None
    candidate_level: Optional[str] = None
    status: str = Field(..., description="met, partial, unmet, or insufficient_evidence")
    explanation: str
    job_source: Optional[SourceSpan] = None


class ScoreBreakdown(BaseModel):
    """Complete transparent mathematical breakdown of the Qualification Index."""

    model_config = ConfigDict(from_attributes=True)

    required_skills_score: float = Field(..., description="0-100 score on mandatory skills")
    required_skills_weight: float = Field(..., description="Normalized weight")
    preferred_skills_score: float = Field(..., description="0-100 score on preferred skills")
    preferred_skills_weight: float = Field(..., description="Normalized weight")
    experience_score: Optional[float] = Field(None, description="0-100 score or None if unscored")
    experience_weight: float = Field(..., description="Normalized weight")
    education_score: Optional[float] = Field(None, description="0-100 score or None if unscored")
    education_weight: float = Field(..., description="Normalized weight")
    evaluable_components: List[str] = Field(default_factory=list)


class MatchReportResponse(BaseModel):
    """Comprehensive explainable match report."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    job_id: str
    overall_score: float = Field(..., description="0-100 evidence-grounded qualification index")
    score_breakdown: ScoreBreakdown
    matched_skills: List[MatchedSkillItem] = Field(default_factory=list)
    missing_skills: List[MissingSkillItem] = Field(default_factory=list)
    experience_comparison: ExperienceComparison
    education_comparison: EducationComparison
    is_provisional: bool = Field(False, description="Whether score contains provisional disclosures")
    provisional_reasons: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class MatchReportSummary(BaseModel):
    """Summary of match report for listings."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    job_id: str
    overall_score: float
    is_provisional: bool
    created_at: datetime


class MatchReportListResponse(BaseModel):
    """Paginated collection of match reports."""

    items: List[MatchReportSummary] = Field(default_factory=list)
    total: int
    page: int = 1
    page_size: int = 10
