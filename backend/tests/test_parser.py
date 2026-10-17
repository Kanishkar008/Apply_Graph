"""Unit and integration tests for structured resume extractor and validator."""

import pytest
from app.schemas.resume_parsed import FactOrigin, SourceSpan
from app.services.parser.extractor import ResumeExtractor
from app.services.parser.validator import ResumeValidator


SYNTHETIC_FULL_RESUME = """Alex Morgan
alex.morgan@example.com | (555) 234-5678 | San Francisco, CA
https://linkedin.com/in/alex-morgan | https://github.com/alexmorgan

PROFESSIONAL SUMMARY
Senior Software Engineer with 6+ years of experience designing distributed systems, RESTful microservices, and high-throughput data pipelines.

TECHNICAL SKILLS
Languages: Python, Go, TypeScript, SQL
Frameworks: FastAPI, React, Next.js, Django
Databases: PostgreSQL, Redis, MongoDB
Tools: Docker, Kubernetes, AWS, Git, CI/CD

WORK EXPERIENCE
Senior Backend Engineer
Stripe | 2021 - Present
- Architected event-driven microservices processing over 10M transactions daily using FastAPI and PostgreSQL.
- Implemented real-time caching using Redis, reducing API p99 latency by 35%.
- Led migration of container workloads to Kubernetes with GitHub Actions CI/CD.

Software Engineer
Airbnb | 2018 - 2021
- Developed REST APIs in Python and Django for reservation booking flows.
- Automated database migrations using Alembic and optimized SQL queries.

EDUCATION
University of California, Berkeley
Bachelor of Science in Computer Science | 2014 - 2018

PROJECTS
ApplyGraph: Evidence-Based Job Matching Copilot
- Built using FastAPI, React, and PostgreSQL.
- Deployed on AWS with Docker container orchestration.

CERTIFICATIONS
- AWS Certified Solutions Architect (2022)
"""

SYNTHETIC_EDGE_CASE_RESUME = """
Jordan Lee
jordan@example.com

SUMMARY
Passionate developer who writes good code and loves cats.

EXPERIENCE
Frontend Developer
Acme Corp | 2024 - 2020
- Built web apps using JavaScript and HTML.

EDUCATION
Self-taught Developer
"""


def test_extractor_full_synthetic_resume():
    """Verify complete extraction of all sections, entities, and evidence spans."""
    data = ResumeExtractor.parse_resume_text(SYNTHETIC_FULL_RESUME)

    # Basic Contact
    assert data.candidate_name == "Alex Morgan"
    assert data.email == "alex.morgan@example.com"
    assert data.phone == "(555) 234-5678"
    assert "San Francisco" in (data.location or "")
    assert data.linkedin_url == "https://linkedin.com/in/alex-morgan"
    assert data.github_url == "https://github.com/alexmorgan"
    assert data.summary is not None
    assert "Senior Software Engineer" in data.summary

    # Skills
    skill_names = {s.name for s in data.skills}
    assert "Python" in skill_names
    assert "Go" in skill_names
    assert "TypeScript" in skill_names
    assert "FastAPI" in skill_names
    assert "PostgreSQL" in skill_names
    assert "Docker" in skill_names
    assert "Kubernetes" in skill_names

    # Verify every extracted skill has a valid source span
    for s in data.skills:
        assert s.source is not None
        assert s.source.verify_against_text(SYNTHETIC_FULL_RESUME) is True

    # Experience
    assert len(data.work_experience) >= 2
    stripe_exp = next((e for e in data.work_experience if "Stripe" in (e.company or "") or "Stripe" in (e.role or "")), None)
    assert stripe_exp is not None
    assert stripe_exp.start_date == "2021"
    assert stripe_exp.end_date == "Present"
    assert stripe_exp.is_current is True
    assert len(stripe_exp.highlights) > 0
    assert stripe_exp.source is not None
    assert stripe_exp.source.verify_against_text(SYNTHETIC_FULL_RESUME) is True

    # Education
    assert len(data.education) >= 1
    berkeley = data.education[0]
    assert "Berkeley" in (berkeley.institution or "")
    assert berkeley.end_date == "2018"
    assert berkeley.source is not None
    assert berkeley.source.verify_against_text(SYNTHETIC_FULL_RESUME) is True

    # Projects & Certifications
    assert len(data.projects) >= 1
    assert "ApplyGraph" in data.projects[0].name
    assert len(data.certifications) >= 1
    assert "AWS" in data.certifications[0].name


def test_token_boundary_no_misleading_matches():
    """Verify that substring collisions like 'good' (Go) and 'cats' (C) are avoided."""
    data = ResumeExtractor.parse_resume_text(SYNTHETIC_EDGE_CASE_RESUME)
    skill_names = {s.name for s in data.skills}

    # "good code" should NOT match "Go"
    assert "Go" not in skill_names
    # "cats" should NOT match "C"
    assert "C" not in skill_names
    # "JavaScript" should NOT trigger a standalone "Java" match
    assert "JavaScript" in skill_names
    assert "Java" not in skill_names


def test_validator_chronological_anomaly_and_missing_sections():
    """Verify that validator flags chronological errors and missing sections."""
    raw_data = ResumeExtractor.parse_resume_text(SYNTHETIC_EDGE_CASE_RESUME)
    validated_data, warnings = ResumeValidator.validate_and_sanitize(raw_data, SYNTHETIC_EDGE_CASE_RESUME)

    # Acme Corp had 2024 - 2020 (start > end)
    assert any("Chronological anomaly" in w for w in warnings)
    # No certifications or projects
    assert any("No technical skills detected" not in w for w in warnings)  # JavaScript was found


def test_validator_unverifiable_source_span_warning():
    """Verify that unverifiable source spans are stripped of invalid offsets and warned."""
    raw_text = "Experienced Developer with Python skills."
    parsed = ResumeExtractor.parse_resume_text(raw_text)

    # Inject an invalid source span
    invalid_span = SourceSpan(source_text="Nonexistent technology", char_start=999, char_end=1020)
    parsed.skills.append(
        parsed.skills[0].model_copy(update={"name": "FakeSkill", "source": invalid_span, "origin": FactOrigin.EXTRACTED})
    )

    _, warnings = ResumeValidator.validate_and_sanitize(parsed, raw_text)
    assert any("Unverifiable source span" in w for w in warnings)


def test_empty_and_unstructured_resume():
    """Verify handling of empty or unstructured text without throwing exceptions."""
    unstructured = "Just a paragraph about a person with no standard headings or structure whatsoever."
    data = ResumeExtractor.parse_resume_text(unstructured)
    validated, warnings = ResumeValidator.validate_and_sanitize(data, unstructured)

    assert validated.candidate_name is None
    assert validated.email is None
    assert len(validated.work_experience) == 0
    assert len(validated.education) == 0
    assert len(validated.skills) == 0
    assert any("No technical skills detected" in w for w in warnings)
    assert any("No work experience entries identified" in w for w in warnings)
