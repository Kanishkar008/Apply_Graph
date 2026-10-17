"""Integration tests for Phase 2B Structured Resume Intelligence endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.resume_parsed import FactOrigin, ParsedSkill

SAMPLE_RESUME_TEXT = """Sarah Connor
sarah.connor@example.com | (555) 987-6543 | Los Angeles, CA
https://linkedin.com/in/sarah-connor

PROFESSIONAL SUMMARY
Senior Cloud Architect with deep expertise in AWS, Kubernetes, and Python.

TECHNICAL SKILLS
Languages: Python, Go, SQL
Cloud & Tools: AWS, Docker, Kubernetes, Terraform, PostgreSQL

WORK EXPERIENCE
Principal Cloud Engineer
Cyberdyne Systems | 2021 - Present
- Architected zero-trust Kubernetes clusters on AWS serving 5M users.
- Designed automated database migration workflows with PostgreSQL.

DevOps Engineer
Tech Corp | 2018 - 2021
- Maintained Docker containers and CI/CD pipelines.

EDUCATION
University of California, Los Angeles
Bachelor of Science in Computer Science | 2014 - 2018

PROJECTS
Skynet Guard: Defense monitoring copilot built with FastAPI and PostgreSQL.
"""


@pytest.mark.asyncio
async def test_parse_resume_flow_and_idempotency():
    """Verify parsing a resume, inspecting structured data, and verifying idempotency."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload resume
        upload_resp = await client.post(
            "/api/v1/resumes",
            files={"file": ("sarah_connor.txt", SAMPLE_RESUME_TEXT.encode("utf-8"), "text/plain")},
        )
        assert upload_resp.status_code == 201
        resume_id = upload_resp.json()["id"]

        try:
            # 2. Parse resume
            parse_resp = await client.post(f"/api/v1/resumes/{resume_id}/parse")
            assert parse_resp.status_code == 200
            data = parse_resp.json()

            assert data["resume_id"] == resume_id
            assert data["is_user_corrected"] is False
            assert data["parsed_data"]["candidate_name"] == "Sarah Connor"
            assert data["parsed_data"]["email"] == "sarah.connor@example.com"
            assert "Los Angeles" in (data["parsed_data"]["location"] or "")

            # Check extracted skills
            skill_names = [s["name"] for s in data["parsed_data"]["skills"]]
            assert "Python" in skill_names
            assert "AWS" in skill_names
            assert "Docker" in skill_names
            assert "PostgreSQL" in skill_names

            # Verify immutable extraction snapshot matches initial parsed_data
            assert data["extracted_data"]["candidate_name"] == data["parsed_data"]["candidate_name"]
            assert len(data["extracted_data"]["skills"]) == len(data["parsed_data"]["skills"])

            # 3. Test GET /resumes/{id}/parsed
            get_resp = await client.get(f"/api/v1/resumes/{resume_id}/parsed")
            assert get_resp.status_code == 200
            assert get_resp.json()["id"] == data["id"]

            # 4. Test Idempotency (calling parse again without force returns existing profile)
            reparse_resp = await client.post(f"/api/v1/resumes/{resume_id}/parse")
            assert reparse_resp.status_code == 200
            assert reparse_resp.json()["id"] == data["id"]
        finally:
            # Cleanup
            await client.delete(f"/api/v1/resumes/{resume_id}")


@pytest.mark.asyncio
async def test_user_correction_persistence_and_reparse_policy():
    """Verify user correction updates, provenance distinction, and 409 conflict on force re-parse."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload resume
        upload_resp = await client.post(
            "/api/v1/resumes",
            files={"file": ("sarah_connor2.txt", SAMPLE_RESUME_TEXT.encode("utf-8"), "text/plain")},
        )
        assert upload_resp.status_code == 201
        resume_id = upload_resp.json()["id"]

        try:
            # 2. Initial parse
            init_resp = await client.post(f"/api/v1/resumes/{resume_id}/parse")
            assert init_resp.status_code == 200
            init_data = init_resp.json()

            # 3. User submits correction (add a new skill with USER_ADDED provenance and edit summary)
            updated_parsed_data = dict(init_data["parsed_data"])
            updated_parsed_data["skills"].append({
                "name": "Rust",
                "category": "language",
                "origin": "user_added",
                "source": None,
            })
            updated_parsed_data["summary"] = "Corrected professional summary by user."

            put_resp = await client.put(
                f"/api/v1/resumes/{resume_id}/parsed",
                json={"parsed_data": updated_parsed_data},
            )
            assert put_resp.status_code == 200
            corrected_data = put_resp.json()

            assert corrected_data["is_user_corrected"] is True
            assert corrected_data["parsed_data"]["summary"] == "Corrected professional summary by user."
            assert any(s["name"] == "Rust" and s["origin"] == "user_added" for s in corrected_data["parsed_data"]["skills"])

            # Verify that immutable extracted_data snapshot was NOT mutated by user correction!
            assert corrected_data["extracted_data"]["summary"] != "Corrected professional summary by user."
            assert not any(s["name"] == "Rust" for s in corrected_data["extracted_data"]["skills"])

            # 4. Re-parsing policy: force=true on corrected profile raises 409 Conflict
            conflict_resp = await client.post(f"/api/v1/resumes/{resume_id}/parse?force=true")
            assert conflict_resp.status_code == 409
            assert "manual user corrections" in conflict_resp.json()["detail"]

            # 5. Overwrite permitted when overwrite_user_corrections=true
            overwrite_resp = await client.post(
                f"/api/v1/resumes/{resume_id}/parse?force=true&overwrite_user_corrections=true"
            )
            assert overwrite_resp.status_code == 200
            overwritten_data = overwrite_resp.json()
            assert overwritten_data["is_user_corrected"] is False
            assert not any(s["name"] == "Rust" for s in overwritten_data["parsed_data"]["skills"])

        finally:
            await client.delete(f"/api/v1/resumes/{resume_id}")


@pytest.mark.asyncio
async def test_cascade_deletion_of_parsed_resumes():
    """Verify that deleting a resume cascades and deletes its parsed profile record."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload & Parse
        upload_resp = await client.post(
            "/api/v1/resumes",
            files={"file": ("delete_test.txt", SAMPLE_RESUME_TEXT.encode("utf-8"), "text/plain")},
        )
        resume_id = upload_resp.json()["id"]

        parse_resp = await client.post(f"/api/v1/resumes/{resume_id}/parse")
        assert parse_resp.status_code == 200

        # Delete resume
        del_resp = await client.delete(f"/api/v1/resumes/{resume_id}")
        assert del_resp.status_code == 204

        # Verify parsed profile is also gone
        get_parsed = await client.get(f"/api/v1/resumes/{resume_id}/parsed")
        assert get_parsed.status_code == 404
