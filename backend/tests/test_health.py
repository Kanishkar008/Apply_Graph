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


def test_cors_headers_localhost(client: TestClient) -> None:
    """Test that CORS headers are returned for localhost origins."""
    for origin in ["http://localhost:5173", "http://127.0.0.1:5173"]:
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin


def test_cors_headers_production_origin(client: TestClient) -> None:
    """Test that CORS headers are returned for production Vercel frontend origin."""
    prod_origin = "https://apply-graph.vercel.app"

    # Preflight OPTIONS
    opt_resp = client.options(
        "/api/v1/health",
        headers={
            "Origin": prod_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert opt_resp.status_code == 200
    assert opt_resp.headers.get("access-control-allow-origin") == prod_origin
    assert opt_resp.headers.get("access-control-allow-credentials") == "true"

    # Actual GET
    get_resp = client.get(
        "/api/v1/health",
        headers={"Origin": prod_origin},
    )
    assert get_resp.status_code == 200
    assert get_resp.headers.get("access-control-allow-origin") == prod_origin


def test_cors_resumes_and_jobs_endpoints(client: TestClient) -> None:
    """Test CORS headers on resumes and jobs endpoints for production origin."""
    prod_origin = "https://apply-graph.vercel.app"

    # Resumes preflight and GET
    res_opt = client.options(
        "/api/v1/resumes",
        headers={
            "Origin": prod_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_opt.status_code == 200
    assert res_opt.headers.get("access-control-allow-origin") == prod_origin

    res_get = client.get("/api/v1/resumes", headers={"Origin": prod_origin})
    assert res_get.status_code == 200
    assert res_get.headers.get("access-control-allow-origin") == prod_origin

    # Jobs preflight and GET
    job_opt = client.options(
        "/api/v1/jobs",
        headers={
            "Origin": prod_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert job_opt.status_code == 200
    assert job_opt.headers.get("access-control-allow-origin") == prod_origin

    job_get = client.get("/api/v1/jobs", headers={"Origin": prod_origin})
    assert job_get.status_code == 200
    assert job_get.headers.get("access-control-allow-origin") == prod_origin


def test_cors_headers_preserved_on_error_response(client: TestClient) -> None:
    """Test that CORS headers are present even on 4xx/5xx responses."""
    prod_origin = "https://apply-graph.vercel.app"
    response = client.get(
        "/api/v1/nonexistent-endpoint-test",
        headers={"Origin": prod_origin},
    )
    assert response.status_code == 404
    assert response.headers.get("access-control-allow-origin") == prod_origin


def test_cors_disallowed_origin_rejected(client: TestClient) -> None:
    """Test that unauthorized origins do not receive allow-origin headers."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://malicious-site.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert response.headers.get("access-control-allow-origin") is None


def test_settings_cors_parsing() -> None:
    """Test Settings CORS origins parsing for JSON strings, CSV strings, and lists."""
    s1 = Settings(BACKEND_CORS_ORIGINS='["https://apply-graph.vercel.app"]')
    assert "https://apply-graph.vercel.app" in s1.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in s1.BACKEND_CORS_ORIGINS

    s2 = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000, https://apply-graph.vercel.app/")
    assert "https://apply-graph.vercel.app" in s2.BACKEND_CORS_ORIGINS
    assert "http://localhost:3000" in s2.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in s2.BACKEND_CORS_ORIGINS


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
