from fastapi import APIRouter, status
from app.schemas.health import HealthResponse
from app.services.health import get_system_health

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns current status of the ApplyGraph API, runtime environment, and database connectivity.",
)
def get_health() -> HealthResponse:
    """Return health check metadata for monitoring and frontend status display."""
    return get_system_health()
