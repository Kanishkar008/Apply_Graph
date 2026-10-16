from fastapi.testclient import TestClient
from app.schemas.health import HealthResponse


def test_health_endpoint(client: TestClient) -> None:
    """Test that GET /api/v1/health returns 200 and valid health payload."""
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

    # Validate against Pydantic schema
    health_obj = HealthResponse.model_validate(data)
    assert health_obj.status == "ok"


def test_root_endpoint(client: TestClient) -> None:
    """Test that GET / returns root service information."""
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
