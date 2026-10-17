"""Deterministic validator for parsed resume data.

Validates:
- Verifiable provenance (verifies that SourceSpans actually exist in raw_text)
- Chronological consistency (start_date <= end_date where parseable)
- Normalization and deduplication of skills
- Flags ambiguities, anomalies, and missing core sections without inventing data
"""

import re
from typing import List, Optional, Tuple

from app.schemas.resume_parsed import (
    FactOrigin,
    ParsedEducation,
    ParsedExperience,
    ParsedProject,
    ParsedResumeData,
    ParsedSkill,
    SourceSpan,
)


def parse_year(date_str: Optional[str]) -> Optional[int]:
    """Extract a 4-digit year from a date string for chronological comparison."""
    if not date_str:
        return None
    match = re.search(r"\b(19\d{2}|20\d{2})\b", date_str)
    return int(match.group(1)) if match else None


class ResumeValidator:
    """Performs deterministic schema, chronological, and provenance validation."""

    @classmethod
    def validate_and_sanitize(
        cls,
        parsed_data: ParsedResumeData,
        raw_text: str,
    ) -> Tuple[ParsedResumeData, List[str]]:
        """Validate parsed entities, verify source evidence spans, and collect warnings."""
        warnings: List[str] = []

        # 1. Validate Candidate Basics
        if not parsed_data.candidate_name:
            warnings.append("Ambiguous or missing candidate name.")
        if not parsed_data.email:
            warnings.append("No email address detected.")

        # 2. Validate & Deduplicate Skills
        validated_skills: List[ParsedSkill] = []
        seen_skills = set()
        for skill in parsed_data.skills:
            norm_name = skill.name.strip()
            if not norm_name:
                continue
            norm_lower = norm_name.lower()
            if norm_lower in seen_skills:
                continue

            # Verify evidence span if extracted
            if skill.origin == FactOrigin.EXTRACTED and skill.source:
                if not skill.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for skill '{skill.name}': "
                        f"'{skill.source.source_text[:30]}...' not found at indicated offset."
                    )
                    # Clear invalid offset to avoid false precision
                    skill.source.char_start = None
                    skill.source.char_end = None

            seen_skills.add(norm_lower)
            validated_skills.append(skill)

        if not validated_skills:
            warnings.append("No technical skills detected in resume.")

        # 3. Validate Work Experience & Chronology
        validated_experience: List[ParsedExperience] = []
        for idx, exp in enumerate(parsed_data.work_experience):
            # Check source evidence span
            if exp.origin == FactOrigin.EXTRACTED and exp.source:
                if not exp.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for experience #{idx + 1} ({exp.role or 'Unknown role'}): "
                        "indicated text span does not match raw text."
                    )
                    exp.source.char_start = None
                    exp.source.char_end = None

            # Chronological validation
            start_yr = parse_year(exp.start_date)
            end_yr = parse_year(exp.end_date)
            if start_yr and end_yr and not exp.is_current:
                if start_yr > end_yr:
                    warnings.append(
                        f"Chronological anomaly in experience #{idx + 1} ({exp.company or 'Unknown company'}): "
                        f"start year ({start_yr}) is later than end year ({end_yr})."
                    )

            if not exp.role and not exp.company:
                warnings.append(f"Experience entry #{idx + 1} is missing both role title and company name.")

            validated_experience.append(exp)

        if not validated_experience:
            warnings.append("No work experience entries identified.")

        # 4. Validate Education History
        validated_education: List[ParsedEducation] = []
        for idx, edu in enumerate(parsed_data.education):
            if edu.origin == FactOrigin.EXTRACTED and edu.source:
                if not edu.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for education #{idx + 1} ({edu.institution or 'Unknown institution'}): "
                        "indicated text span does not match raw text."
                    )
                    edu.source.char_start = None
                    edu.source.char_end = None

            if not edu.institution and not edu.degree:
                warnings.append(f"Education entry #{idx + 1} missing both degree and institution.")

            validated_education.append(edu)

        if not validated_education:
            warnings.append("No education entries identified.")

        # 5. Validate Projects
        validated_projects: List[ParsedProject] = []
        for idx, proj in enumerate(parsed_data.projects):
            if proj.origin == FactOrigin.EXTRACTED and proj.source:
                if not proj.source.verify_against_text(raw_text):
                    proj.source.char_start = None
                    proj.source.char_end = None
            validated_projects.append(proj)

        # Build validated container
        cleaned_data = ParsedResumeData(
            candidate_name=parsed_data.candidate_name,
            email=parsed_data.email,
            phone=parsed_data.phone,
            location=parsed_data.location,
            linkedin_url=parsed_data.linkedin_url,
            github_url=parsed_data.github_url,
            summary=parsed_data.summary,
            skills=validated_skills,
            work_experience=validated_experience,
            education=validated_education,
            projects=validated_projects,
            certifications=parsed_data.certifications,
        )

        return cleaned_data, warnings
