"""Integration tests for Job Description ingestion, retrieval, pagination, and deletion."""

import io
import pytest
from httpx import ASGITransport, AsyncClient
import pypdf

from app.main import app

SAMPLE_JOB_TEXT = """Senior Backend Engineer - ApplyGraph
Location: Remote
Employment Type: Full-time

About the Role:
We are looking for a Senior Backend Engineer to build evidence-based systems.

Key Responsibilities:
- Design high-throughput REST APIs using FastAPI and PostgreSQL.
- Architect containerized microservices deployed to AWS.
- Collaborate with frontend engineers to deliver intuitive interfaces.

Requirements:
- 5+ years of software engineering experience.
- 3+ years of Python backend development.
- Strong proficiency in PostgreSQL and Docker.
- Bachelor's degree in Computer Science or equivalent.

Preferred Qualifications:
- Experience with Kubernetes and Redis is a plus.
- Familiarity with TypeScript and React.

Salary Range:
$140,000 - $180,000 per year
"""


def create_dummy_pdf(text: str) -> bytes:
    """Generate a minimal in-memory PDF containing the given text."""
    writer = pypdf.PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    writer.add_annotation(
        page,
        pypdf.generic.DictionaryObject({
            pypdf.generic.NameObject("/Subtype"): pypdf.generic.NameObject("/Text"),
            pypdf.generic.NameObject("/Contents"): pypdf.generic.TextStringObject(text),
        }),
    )
    # Use standard text extraction stream with font
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_create_job_from_json_text():
    """Verify creating a job description via JSON text payload."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "title": "Staff Backend Engineer",
            "company": "ApplyGraph Labs",
            "location": "San Francisco, CA",
            "raw_text": SAMPLE_JOB_TEXT,
        }
        resp = await client.post("/api/v1/jobs", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] is not None
        assert data["title"] == "Staff Backend Engineer"
        assert data["company"] == "ApplyGraph Labs"
        assert data["location"] == "San Francisco, CA"
        assert data["source_type"] == "text"
        assert "5+ years of software engineering experience" in data["raw_text"]

        # Cleanup
        del_resp = await client.delete(f"/api/v1/jobs/{data['id']}")
        assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_create_job_from_multipart_text_file():
    """Verify uploading a plain-text job description."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/jobs",
            files={"file": ("job_description.txt", SAMPLE_JOB_TEXT.encode("utf-8"), "text/plain")},
            data={"title": "Custom Title"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Custom Title"
        assert data["source_type"] == "txt"
        assert data["file_size"] == len(SAMPLE_JOB_TEXT.encode("utf-8"))

        del_resp = await client.delete(f"/api/v1/jobs/{data['id']}")
        assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_create_job_from_multipart_raw_text():
    """Verify uploading raw text directly through multipart form data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/jobs",
            data={
                "raw_text": SAMPLE_JOB_TEXT,
                "title": "Multipart Text Job",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Multipart Text Job"
        assert data["source_type"] == "text"

        del_resp = await client.delete(f"/api/v1/jobs/{data['id']}")
        assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_job_validation_errors():
    """Verify rejection of empty files, empty text, and invalid types."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Empty text
        resp1 = await client.post("/api/v1/jobs", json={"raw_text": "   "})
        assert resp1.status_code in (400, 422)

        # 2. Empty file
        resp2 = await client.post(
            "/api/v1/jobs",
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert resp2.status_code == 400

        # 3. Unsupported file extension
        resp3 = await client.post(
            "/api/v1/jobs",
            files={"file": ("malware.exe", b"binarycontent", "application/octet-stream")},
        )
        assert resp3.status_code == 415


@pytest.mark.asyncio
async def test_jobs_pagination_and_cascade_delete():
    """Verify pagination controls and cascade deletion of job + parsed intelligence."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create 3 jobs
        job_ids = []
        for i in range(3):
            resp = await client.post(
                "/api/v1/jobs",
                json={
                    "title": f"Pagination Job {i}",
                    "raw_text": f"Role {i}\nRequirements:\n- Python\n- Docker\nResponsibilities:\n- Build things",
                },
            )
            assert resp.status_code == 201
            job_ids.append(resp.json()["id"])

        # Test pagination
        list_resp = await client.get("/api/v1/jobs?page=1&page_size=2")
        assert list_resp.status_code == 200
        p_data = list_resp.json()
        assert p_data["page"] == 1
        assert p_data["page_size"] == 2
        assert len(p_data["items"]) == 2
        assert p_data["total"] >= 3

        # Parse one of them
        parse_resp = await client.post(f"/api/v1/jobs/{job_ids[0]}/parse")
        assert parse_resp.status_code == 200
        parsed_id = parse_resp.json()["id"]

        # Delete the job
        del_resp = await client.delete(f"/api/v1/jobs/{job_ids[0]}")
        assert del_resp.status_code == 204

        # Confirm job is 404
        assert (await client.get(f"/api/v1/jobs/{job_ids[0]}")).status_code == 404
        # Confirm parsed profile was cascade deleted
        assert (await client.get(f"/api/v1/jobs/{job_ids[0]}/parsed")).status_code == 404

        # Cleanup remaining
        for jid in job_ids[1:]:
            await client.delete(f"/api/v1/jobs/{jid}")
