"""Integration and unit tests for Explainable Job Matching (Phase 3B)."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.job_parsed import (
    ParsedJobData,
    ParsedJobEducationRequirement,
    ParsedJobExperienceRequirement,
    ParsedJobSkill,
    RequirementLevel,
)
from app.schemas.match import SkillMatchStatus
from app.schemas.resume_parsed import (
    FactOrigin,
    ParsedEducation,
    ParsedExperience,
    ParsedResumeData,
    ParsedSkill,
    SourceSpan,
)
from app.services.matching.engine import MatchingEngine

SAMPLE_JOB_RAW = """Staff Backend Engineer
Acme Corp | Remote

Requirements:
- 5+ years of software engineering experience.
- Python
- PostgreSQL
- Docker
- Kubernetes
- Bachelor's degree in Computer Science.

Preferred:
- Go
- AWS
"""

SAMPLE_RESUME_RAW = """Alex Smith
alex.smith@example.com

SKILLS:
Python, PostgreSQL, Docker, AWS

EXPERIENCE:
Senior Engineer | Tech Co | 2020 - 2024
- Built cloud backends using Python and PostgreSQL.

EDUCATION:
State University
Bachelor of Science in Computer Science | 2016 - 2020
"""


def test_hand_calculated_matching_score_formula():
    """Verify that the matching formula produces the exact mathematically calculated score.

    Example:
    - 4 Required skills: Python, PostgreSQL, Docker, Kubernetes.
    - 2 Preferred skills: Go, AWS.
    - 5 years experience required.
    - Bachelor's degree required.

    Candidate:
    - Has Python, PostgreSQL, Docker (3/4 = 75.0% required).
    - Has AWS (1/2 = 50.0% preferred).
    - 4 years detectable experience (4/5 = 80.0% experience).
    - Holds Bachelor's degree (100.0% education).

    Expected weights:
    - Required: 60%, Preferred: 20%, Experience: 10%, Education: 10%.
    - Overall Score = (0.60 * 75) + (0.20 * 50) + (0.10 * 80) + (0.10 * 100) = 45.0 + 10.0 + 8.0 + 10.0 = 73.0
    """
    job = ParsedJobData(
        title="Staff Engineer",
        required_skills=[
            ParsedJobSkill(name="Python", requirement_level=RequirementLevel.REQUIRED),
            ParsedJobSkill(name="PostgreSQL", requirement_level=RequirementLevel.REQUIRED),
            ParsedJobSkill(name="Docker", requirement_level=RequirementLevel.REQUIRED),
            ParsedJobSkill(name="React", requirement_level=RequirementLevel.REQUIRED),
        ],
        preferred_skills=[
            ParsedJobSkill(name="Go", requirement_level=RequirementLevel.PREFERRED),
            ParsedJobSkill(name="AWS", requirement_level=RequirementLevel.PREFERRED),
        ],
        experience_requirements=[
            ParsedJobExperienceRequirement(min_years=5.0, description="5+ years experience")
        ],
        education_requirements=[
            ParsedJobEducationRequirement(degree_level="Bachelor's", requirement_level=RequirementLevel.REQUIRED)
        ],
    )

    resume = ParsedResumeData(
        skills=[
            ParsedSkill(name="Python"),
            ParsedSkill(name="PostgreSQL"),
            ParsedSkill(name="Docker"),
            ParsedSkill(name="AWS"),
        ],
        work_experience=[
            ParsedExperience(role="Dev", start_date="2020", end_date="2024")  # 4 years
        ],
        education=[
            ParsedEducation(degree="Bachelor of Science in Computer Science")
        ],
    )

    result = MatchingEngine.evaluate_match(
        parsed_resume=resume,
        parsed_job=job,
        resume_raw_text=SAMPLE_RESUME_RAW,
        job_raw_text=SAMPLE_JOB_RAW,
    )

    breakdown = result["score_breakdown"]
    assert breakdown["required_skills_score"] == 75.0
    assert breakdown["required_skills_weight"] == 0.60
    assert breakdown["preferred_skills_score"] == 50.0
    assert breakdown["preferred_skills_weight"] == 0.20
    assert breakdown["experience_score"] == 80.0
    assert breakdown["experience_weight"] == 0.10
    assert breakdown["education_score"] == 100.0
    assert breakdown["education_weight"] == 0.10

    assert result["overall_score"] == 73.0
    assert result["is_provisional"] is False


def test_missing_data_insufficient_evidence_not_penalized():
    """Verify missing general experience or education does not arbitrarily penalize candidates."""
    # Job has no explicit degree requirement
    job = ParsedJobData(
        title="Developer",
        required_skills=[
            ParsedJobSkill(name="Python", requirement_level=RequirementLevel.REQUIRED),
            ParsedJobSkill(name="Docker", requirement_level=RequirementLevel.REQUIRED),
        ],
        preferred_skills=[],
        experience_requirements=[],
        education_requirements=[],
    )

    # Candidate has Python and Docker (100% required skills)
    resume = ParsedResumeData(
        skills=[ParsedSkill(name="Python"), ParsedSkill(name="Docker")],
        work_experience=[],
        education=[],
    )

    result = MatchingEngine.evaluate_match(
        parsed_resume=resume,
        parsed_job=job,
        resume_raw_text="Python Docker",
        job_raw_text="Python Docker",
    )

    # When only skills are evaluable, weights normalize to 75% req / 25% pref
    breakdown = result["score_breakdown"]
    assert breakdown["experience_score"] is None
    assert breakdown["education_score"] is None
    assert breakdown["required_skills_weight"] == 0.75
    assert breakdown["preferred_skills_weight"] == 0.25
    assert result["overall_score"] == 100.0


def test_related_skill_adjacent_domain_credit():
    """Verify candidate with adjacent framework (Flask) gets related credit for Django."""
    job = ParsedJobData(
        required_skills=[
            ParsedJobSkill(name="Django", category="framework", requirement_level=RequirementLevel.REQUIRED),
        ],
        preferred_skills=[],
    )

    resume = ParsedResumeData(
        skills=[ParsedSkill(name="Flask", category="framework")],
    )

    result = MatchingEngine.evaluate_match(
        parsed_resume=resume,
        parsed_job=job,
        resume_raw_text="Flask",
        job_raw_text="Django",
    )

    matched = result["matched_skills"]
    assert len(matched) == 1
    assert matched[0]["status"] == SkillMatchStatus.RELATED_SKILL.value
    assert "Flask" in matched[0]["explanation"]
    assert result["score_breakdown"]["required_skills_score"] == 50.0


def test_ambiguous_skills_flag_provisional():
    """Verify ambiguous skills in job description flag match report as provisional."""
    job = ParsedJobData(
        required_skills=[
            ParsedJobSkill(name="Python", requirement_level=RequirementLevel.AMBIGUOUS),
        ],
        preferred_skills=[],
    )
    resume = ParsedResumeData(skills=[ParsedSkill(name="Python")])

    result = MatchingEngine.evaluate_match(
        parsed_resume=resume,
        parsed_job=job,
        resume_raw_text="Python",
        job_raw_text="Python",
    )

    assert result["is_provisional"] is True
    assert any("Ambiguous requirement level" in r for r in result["provisional_reasons"])


@pytest.mark.asyncio
async def test_matching_api_flow_and_cascade_deletion():
    """Verify POST /api/v1/matches, caching idempotency, retrieval, and cascade deletion."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Resume
        r_resp = await client.post(
            "/api/v1/resumes",
            files={"file": ("candidate.txt", SAMPLE_RESUME_RAW.encode("utf-8"), "text/plain")},
        )
        assert r_resp.status_code == 201
        resume_id = r_resp.json()["id"]

        # 2. Create Job
        j_resp = await client.post(
            "/api/v1/jobs",
            json={"title": "Staff Engineer", "raw_text": SAMPLE_JOB_RAW},
        )
        assert j_resp.status_code == 201
        job_id = j_resp.json()["id"]

        try:
            # 3. Generate Match Report
            match_resp = await client.post(
                "/api/v1/matches",
                json={"resume_id": resume_id, "job_id": job_id},
            )
            assert match_resp.status_code == 200
            m_data = match_resp.json()
            match_id = m_data["id"]
            assert m_data["resume_id"] == resume_id
            assert m_data["job_id"] == job_id
            assert m_data["overall_score"] > 0
            assert "score_breakdown" in m_data
            assert len(m_data["matched_skills"]) > 0

            # 4. Idempotent retrieval with force=False
            repeat_resp = await client.post(
                "/api/v1/matches",
                json={"resume_id": resume_id, "job_id": job_id, "force": False},
            )
            assert repeat_resp.status_code == 200
            assert repeat_resp.json()["id"] == match_id

            # 5. Get Match Report by ID
            get_resp = await client.get(f"/api/v1/matches/{match_id}")
            assert get_resp.status_code == 200
            assert get_resp.json()["id"] == match_id

            # 6. List match reports
            list_resp = await client.get(f"/api/v1/matches?resume_id={resume_id}")
            assert list_resp.status_code == 200
            assert list_resp.json()["total"] >= 1

            # 7. Delete match report directly
            del_m_resp = await client.delete(f"/api/v1/matches/{match_id}")
            assert del_m_resp.status_code == 204
            assert (await client.get(f"/api/v1/matches/{match_id}")).status_code == 404

            # 8. Re-generate match report to test cascade delete
            rematch_resp = await client.post(
                "/api/v1/matches",
                json={"resume_id": resume_id, "job_id": job_id},
            )
            assert rematch_resp.status_code == 200
            new_match_id = rematch_resp.json()["id"]

            # Delete resume -> cascades to match_reports
            await client.delete(f"/api/v1/resumes/{resume_id}")
            assert (await client.get(f"/api/v1/matches/{new_match_id}")).status_code == 404

        finally:
            await client.delete(f"/api/v1/jobs/{job_id}")
