import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.job import Job


class ParsedJob(Base):
    """SQLAlchemy model for structured job description intelligence and provenance audit."""

    __tablename__ = "parsed_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    # Active structured data (including any user corrections)
    parsed_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Immutable snapshot of original parser extraction
    extracted_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Ambiguity, format, and section warnings detected by validator
    parse_warnings: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    # Flag to differentiate raw parsed from user-reviewed profiles
    is_user_corrected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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

    job: Mapped["Job"] = relationship("Job", back_populates="parsed_profile")
