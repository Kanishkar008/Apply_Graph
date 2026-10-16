from typing import Generator, Tuple, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Configure SQLAlchemy engine with pool_pre_ping for connection resilience
engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    echo=(settings.ENVIRONMENT == "development_debug"),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a scoped SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Tuple[bool, Optional[str]]:
    """Safe check to verify PostgreSQL connectivity without raising unhandled exceptions.

    Returns:
        (is_connected, details_or_error)
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, "Database connection operational"
    except Exception as exc:
        return False, f"Database unavailable: {str(exc)}"
