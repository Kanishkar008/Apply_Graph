"""Deterministic validator for parsed job description data.

Validates:
- Verifiable provenance (verifies that SourceSpans accurately match raw_text offsets)
- Conservative skill classification (flags ambiguous requirements)
- Experience requirement consistency
- Detection of missing core job sections without guessing or hallucinating facts
"""

from typing import List, Tuple

from app.schemas.job_parsed import (
    ParsedJobData,
    ParsedJobEducationRequirement,
    ParsedJobExperienceRequirement,
    ParsedJobResponsibility,
    ParsedJobSkill,
    RequirementLevel,
)
from app.schemas.resume_parsed import FactOrigin


class JobValidator:
    """Performs deterministic provenance, consistency, and section validation for jobs."""

    @classmethod
    def validate_and_sanitize(
        cls,
        parsed_data: ParsedJobData,
        raw_text: str,
    ) -> Tuple[ParsedJobData, List[str]]:
        """Validate parsed entities against raw_text, audit source spans, and collect warnings."""
        warnings: List[str] = []

        # 1. Metadata check
        if not parsed_data.title:
            warnings.append("Ambiguous or missing job title.")

        # 2. Validate Required Skills & Provenance
        validated_required_skills: List[ParsedJobSkill] = []
        for skill in parsed_data.required_skills:
            if skill.origin == FactOrigin.EXTRACTED and skill.source:
                if not skill.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for skill '{skill.name}': "
                        f"snippet '{skill.source.source_text[:30]}' not found at offset."
                    )
                    skill.source.char_start = None
                    skill.source.char_end = None

            if skill.requirement_level == RequirementLevel.AMBIGUOUS:
                warnings.append(
                    f"Ambiguous requirement level for skill '{skill.name}': "
                    "text does not explicitly designate as required or preferred."
                )

            validated_required_skills.append(skill)

        # 3. Validate Preferred Skills & Provenance
        validated_preferred_skills: List[ParsedJobSkill] = []
        for skill in parsed_data.preferred_skills:
            if skill.origin == FactOrigin.EXTRACTED and skill.source:
                if not skill.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for preferred skill '{skill.name}': "
                        f"snippet '{skill.source.source_text[:30]}' not found at offset."
                    )
                    skill.source.char_start = None
                    skill.source.char_end = None

            validated_preferred_skills.append(skill)

        total_skills = len(validated_required_skills) + len(validated_preferred_skills)
        if total_skills == 0:
            warnings.append("No technical skills detected in job description.")

        # 4. Validate Experience Requirements
        validated_exp_reqs: List[ParsedJobExperienceRequirement] = []
        for idx, exp in enumerate(parsed_data.experience_requirements):
            if exp.origin == FactOrigin.EXTRACTED and exp.source:
                if not exp.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for experience requirement #{idx + 1}: "
                        "snippet not found at indicated character offset."
                    )
                    exp.source.char_start = None
                    exp.source.char_end = None

            if exp.min_years and exp.max_years and exp.min_years > exp.max_years:
                warnings.append(
                    f"Experience range anomaly #{idx + 1}: "
                    f"min_years ({exp.min_years}) exceeds max_years ({exp.max_years})."
                )

            validated_exp_reqs.append(exp)

        # 5. Validate Education Requirements
        validated_edu_reqs: List[ParsedJobEducationRequirement] = []
        for idx, edu in enumerate(parsed_data.education_requirements):
            if edu.origin == FactOrigin.EXTRACTED and edu.source:
                if not edu.source.verify_against_text(raw_text):
                    warnings.append(
                        f"Unverifiable source span for education requirement #{idx + 1}: "
                        "snippet not found at indicated character offset."
                    )
                    edu.source.char_start = None
                    edu.source.char_end = None

            validated_edu_reqs.append(edu)

        # 6. Validate Responsibilities
        validated_responsibilities: List[ParsedJobResponsibility] = []
        for idx, resp in enumerate(parsed_data.responsibilities):
            if resp.origin == FactOrigin.EXTRACTED and resp.source:
                if not resp.source.verify_against_text(raw_text):
                    resp.source.char_start = None
                    resp.source.char_end = None
            validated_responsibilities.append(resp)

        if not validated_responsibilities:
            warnings.append("No core responsibilities section identified.")

        # 7. Validate Salary
        validated_salary = parsed_data.salary
        if validated_salary and validated_salary.origin == FactOrigin.EXTRACTED and validated_salary.source:
            if not validated_salary.source.verify_against_text(raw_text):
                validated_salary.source.char_start = None
                validated_salary.source.char_end = None

        cleaned_data = ParsedJobData(
            title=parsed_data.title,
            company=parsed_data.company,
            location=parsed_data.location,
            employment_type=parsed_data.employment_type,
            required_skills=validated_required_skills,
            preferred_skills=validated_preferred_skills,
            experience_requirements=validated_exp_reqs,
            education_requirements=validated_edu_reqs,
            responsibilities=validated_responsibilities,
            salary=validated_salary,
        )

        return cleaned_data, warnings
