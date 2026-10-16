"""Database models package.

In Phase 1, core schema entities are deferred to subsequent phases.
Alembic's target_metadata references Base from app.db.base.
"""
from app.db.base import Base

__all__ = ["Base"]
