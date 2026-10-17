"""Tests for deterministic job description parsing, provenance offsets, and user corrections."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.job_parsed import (
    ParsedJobData,
    ParsedJobSkill,
    ParsedJobUpdateRequest,
    RequirementLevel,
)
from app.schemas.resume_parsed import FactOrigin, SourceSpan
from app.services.job_parser.extractor import JobExtractor
from app.services.job_parser.validator import JobValidator

SAMPLE_JD = """Lead Full-Stack Architect
Acme Corp | San Francisco, CA | Full-time

About Us:
We are innovating data intelligence pipelines.

Key Responsibilities:
- Design and deploy cloud-native backend services using FastAPI and PostgreSQL.
- Lead architectural reviews for web applications built with React and TypeScript.
- Optimize database performance and implement caching with Redis.

Minimum Qualifications:
- 7+ years of professional software engineering experience.
- 5+ years of hands-on experience with Python.
- Demonstrated mastery of PostgreSQL database design.
- Hands-on experience with Docker and Kubernetes.
- Bachelor's degree in Computer Science or related field.

Preferred Qualifications:
- 2+ years of experience with Go.
- Experience with GraphQL is a plus.
- Familiarity with AWS cloud architecture.

Salary & Benefits:
$160,000 - $210,000 per year plus equity and health benefits.
"""

AMBIGUOUS_JD = """Software Developer
Tech Inc.

We work with many technologies:
Python, Docker, React, and Redis.
"""


def test_extractor_required_vs_preferred_and_skill_years():
    """Verify that skills are classified into required/preferred sections and years are explicitly linked."""
    parsed = JobExtractor.parse_job_text(SAMPLE_JD)

    # Required skills
    req_skill_names = {s.name for s in parsed.required_skills}
    assert "Python" in req_skill_names
    assert "PostgreSQL" in req_skill_names
    assert "Docker" in req_skill_names
    assert "Kubernetes" in req_skill_names

    # Preferred skills
    pref_skill_names = {s.name for s in parsed.preferred_skills}
    assert "Go" in pref_skill_names
    assert "GraphQL" in pref_skill_names
    assert "AWS" in pref_skill_names

    # Check skill-specific years association:
    # Python explicitly had "5+ years of hands-on experience with Python"
    py_skill = next(s for s in parsed.required_skills if s.name == "Python")
    assert py_skill.years_required == 5.0

    # Go explicitly had "2+ years of experience with Go"
    go_skill = next(s for s in parsed.preferred_skills if s.name == "Go")
    assert go_skill.years_required == 2.0

    # PostgreSQL was not given explicit years (only "Demonstrated mastery")
    pg_skill = next(s for s in parsed.required_skills if s.name == "PostgreSQL")
    assert pg_skill.years_required is None

    # General experience
    assert len(parsed.experience_requirements) >= 1
    gen_exp = parsed.experience_requirements[0]
    assert gen_exp.min_years == 7.0

    # Education
    assert len(parsed.education_requirements) >= 1
    edu = parsed.education_requirements[0]
    assert edu.degree_level == "Bachelor's"
    assert "Computer Science" in edu.field_of_study

    # Salary
    assert parsed.salary is not None
    assert parsed.salary.min_amount == 160000.0
    assert parsed.salary.max_amount == 210000.0
    assert parsed.salary.currency == "USD"
    assert parsed.salary.interval == "yearly"


def test_extractor_provenance_offsets():
    """Verify all extracted SourceSpans map directly and verbatim to raw_text."""
    parsed = JobExtractor.parse_job_text(SAMPLE_JD)

    # Skills offsets
    for s in parsed.required_skills + parsed.preferred_skills:
        assert s.source is not None
        assert s.source.char_start is not None
        assert s.source.char_end is not None
        assert SAMPLE_JD[s.source.char_start : s.source.char_end] == s.source.source_text

    # Responsibilities offsets
    for r in parsed.responsibilities:
        assert r.source is not None
        assert SAMPLE_JD[r.source.char_start : r.source.char_end] == r.source.source_text

    # Salary offsets
    assert parsed.salary.source is not None
    assert (
        SAMPLE_JD[parsed.salary.source.char_start : parsed.salary.source.char_end]
        == parsed.salary.source.source_text
    )


def test_validator_detects_ambiguity():
    """Verify validator flags ambiguous skill requirements when context lacks clear designation."""
    parsed = JobExtractor.parse_job_text(AMBIGUOUS_JD)
    validated, warnings = JobValidator.validate_and_sanitize(parsed, AMBIGUOUS_JD)

    # In AMBIGUOUS_JD, skills are in a generic sentence without required/preferred sections
    ambiguous_warnings = [w for w in warnings if "Ambiguous requirement level" in w]
    assert len(ambiguous_warnings) > 0


@pytest.mark.asyncio
async def test_job_parse_api_and_correction_flow():
    """Verify parse endpoint, audit preservation, conflict detection, and user corrections."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Job
        create_resp = await client.post(
            "/api/v1/jobs",
            json={"title": "Lead Architect", "raw_text": SAMPLE_JD},
        )
        assert create_resp.status_code == 201
        job_id = create_resp.json()["id"]

        try:
            # 2. Parse Job
            parse_resp = await client.post(f"/api/v1/jobs/{job_id}/parse")
            assert parse_resp.status_code == 200
            data = parse_resp.json()
            assert data["is_user_corrected"] is False
            assert data["extracted_data"] is not None
            assert len(data["parsed_data"]["required_skills"]) > 0

            # 3. Idempotent repeated parse
            repeat_resp = await client.post(f"/api/v1/jobs/{job_id}/parse")
            assert repeat_resp.status_code == 200
            assert repeat_resp.json()["id"] == data["id"]

            # 4. User submits corrections (e.g. adding a custom skill requirement)
            corrected_parsed_data = dict(data["parsed_data"])
            corrected_parsed_data["required_skills"].append({
                "name": "Rust",
                "category": "language",
                "requirement_level": "required",
                "years_required": 3.0,
                "origin": "user_added",
                "source": None,
            })

            put_resp = await client.put(
                f"/api/v1/jobs/{job_id}/parsed",
                json={"parsed_data": corrected_parsed_data},
            )
            assert put_resp.status_code == 200
            updated_data = put_resp.json()
            assert updated_data["is_user_corrected"] is True
            # Extracted data snapshot must NOT be altered
            assert updated_data["extracted_data"] == data["extracted_data"]
            # Rust is in parsed_data
            assert any(s["name"] == "Rust" for s in updated_data["parsed_data"]["required_skills"])

            # 5. Forced re-parse without overwrite flag must return HTTP 409 Conflict
            conflict_resp = await client.post(f"/api/v1/jobs/{job_id}/parse?force=true")
            assert conflict_resp.status_code == 409

            # 6. Forced re-parse with overwrite flag succeeds and resets corrections
            override_resp = await client.post(
                f"/api/v1/jobs/{job_id}/parse?force=true&overwrite_user_corrections=true"
            )
            assert override_resp.status_code == 200
            reparsed_data = override_resp.json()
            assert reparsed_data["is_user_corrected"] is False
            assert not any(s["name"] == "Rust" for s in reparsed_data["parsed_data"]["required_skills"])

        finally:
            await client.delete(f"/api/v1/jobs/{job_id}")
