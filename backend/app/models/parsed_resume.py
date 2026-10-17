import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.resume import Resume


class ParsedResume(Base):
    """SQLAlchemy model for structured resume intelligence and provenance audit."""

    __tablename__ = "parsed_resumes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    resume_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    # Active structured data (including any user corrections)
    parsed_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Immutable snapshot of the original parser extraction
    extracted_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Ambiguity, format, and chronological warnings detected by validator
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

    resume: Mapped["Resume"] = relationship("Resume", back_populates="parsed_profile")
