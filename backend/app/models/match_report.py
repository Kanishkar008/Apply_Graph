import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.resume import Resume
    from app.models.job import Job


class MatchReport(Base):
    """SQLAlchemy model for explainable, evidence-grounded job match reports."""

    __tablename__ = "match_reports"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    resume_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Deterministic composite score (0.0 to 100.0)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Component breakdown (required_skills, preferred_skills, experience, education, weights)
    score_breakdown: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Structured comparison items with dual source spans
    matched_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    missing_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    experience_comparison: Mapped[dict] = mapped_column(JSON, nullable=False)
    education_comparison: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Disclosure flags
    is_provisional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    provisional_reasons: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume")
    job: Mapped["Job"] = relationship("Job")
