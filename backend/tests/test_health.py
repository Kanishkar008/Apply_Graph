from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.schemas.health import HealthResponse
from app.core.config import Settings
from app.db.session import get_db


def test_health_endpoint_live_db(client: TestClient) -> None:
    """Test that GET /api/v1/health returns 200 and reports live database connectivity."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ApplyGraph API"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data
    assert "database" in data
    assert isinstance(data["database"]["connected"], bool)
    assert data["database"]["connected"] is True
    assert data["database"]["details"] == "Database connection operational"

    # Validate against Pydantic schema
    health_obj = HealthResponse.model_validate(data)
    assert health_obj.status == "ok"
    assert health_obj.database.connected is True


def test_health_endpoint_db_failure_resilience(client: TestClient) -> None:
    """Test that health endpoint returns 200 with error diagnostic when DB is unavailable."""
    with patch("app.services.health.check_db_connection") as mock_check:
        mock_check.return_value = (False, "Database connection refused on port 5432")

        response = client.get("/api/v1/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "ok"
        assert data["database"]["connected"] is False
        assert "Database connection refused" in data["database"]["details"]

        health_obj = HealthResponse.model_validate(data)
        assert health_obj.database.connected is False


def test_root_endpoint(client: TestClient) -> None:
    """Test that GET / returns root service metadata and documentation links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ApplyGraph API"
    assert "health" in data
    assert "documentation" in data


def test_cors_headers(client: TestClient) -> None:
    """Test that CORS headers are returned for configured origin."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_settings_cors_parsing() -> None:
    """Test Settings CORS origins parsing for JSON strings, CSV strings, and lists."""
    s1 = Settings(BACKEND_CORS_ORIGINS='["http://localhost:3000", "http://localhost:5173"]')
    assert s1.BACKEND_CORS_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]

    s2 = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000, http://localhost:5173")
    assert s2.BACKEND_CORS_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]


def test_get_db_dependency() -> None:
    """Test that get_db dependency yields a valid SQLAlchemy Session and cleans up."""
    gen = get_db()
    try:
        session = next(gen)
        assert isinstance(session, Session)
        try:
            next(gen)
        except StopIteration:
            pass
    finally:
        gen.close()
