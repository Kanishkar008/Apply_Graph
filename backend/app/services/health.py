from datetime import datetime, timezone
from app.core.config import settings
from app.db.session import check_db_connection
from app.schemas.health import HealthResponse, DatabaseHealth


def get_system_health() -> HealthResponse:
    """Evaluate application and database health."""
    db_connected, db_details = check_db_connection()
    return HealthResponse(
        status="ok",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        database=DatabaseHealth(
            connected=db_connected,
            details=db_details,
        ),
    )
