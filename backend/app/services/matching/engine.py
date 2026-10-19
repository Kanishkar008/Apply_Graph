"""Deterministic, explainable matching engine for ApplyGraph.

Compares a parsed resume against a parsed job description and produces
a fully grounded match report with dual source-evidence provenance.
Zero external LLM calls or probabilistic embeddings.
"""

import re
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from app.schemas.job_parsed import (
    ParsedJobData,
    RequirementLevel,
)
from app.schemas.match import (
    EducationComparison,
    ExperienceComparison,
    MatchedSkillItem,
    MissingSkillItem,
    ScoreBreakdown,
    SkillMatchStatus,
)
from app.schemas.resume_parsed import (
    FactOrigin,
    ParsedEducation,
    ParsedExperience,
    ParsedResumeData,
    ParsedSkill,
    SourceSpan,
)

# Degree rankings for hierarchical comparison
DEGREE_RANKS: Dict[str, int] = {
    "high school": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "ph.d": 5,
    "doctorate": 5,
}

# Related skill groupings for adjacent domain credit
RELATED_SKILL_MAP: Dict[str, Set[str]] = {
    "FastAPI": {"Flask", "Django", "Express", "Node.js"},
    "Django": {"FastAPI", "Flask"},
    "Flask": {"FastAPI", "Django"},
    "React": {"Next.js", "Vue.js", "Angular"},
    "Next.js": {"React"},
    "Vue.js": {"React", "Angular"},
    "Angular": {"React", "Vue.js"},
    "PostgreSQL": {"MySQL", "SQLite", "MongoDB"},
    "MySQL": {"PostgreSQL", "SQLite"},
    "AWS": {"Google Cloud", "Azure"},
    "Google Cloud": {"AWS", "Azure"},
    "Azure": {"AWS", "Google Cloud"},
    "Docker": {"Kubernetes"},
    "Kubernetes": {"Docker"},
}


class MatchingEngine:
    """Deterministic matcher evaluating skills, experience, and education."""

    @classmethod
    def evaluate_match(
        cls,
        parsed_resume: ParsedResumeData,
        parsed_job: ParsedJobData,
        resume_raw_text: str,
        job_raw_text: str,
    ) -> Dict:
        """Run complete explainable comparison and return dict matching MatchReport model."""
        provisional_reasons: List[str] = []

        # 1. Evaluate Skills (Required and Preferred)
        matched_skills, missing_skills, req_score, pref_score, skill_provisional = cls._compare_skills(
            parsed_resume=parsed_resume,
            parsed_job=parsed_job,
            resume_raw_text=resume_raw_text,
            job_raw_text=job_raw_text,
        )
        provisional_reasons.extend(skill_provisional)

        # 2. Evaluate Experience
        exp_comp, exp_score, exp_provisional = cls._compare_experience(
            parsed_resume=parsed_resume,
            parsed_job=parsed_job,
        )
        if exp_provisional:
            provisional_reasons.append(exp_provisional)

        # 3. Evaluate Education
        edu_comp, edu_score = cls._compare_education(
            parsed_resume=parsed_resume,
            parsed_job=parsed_job,
        )

        # 4. Compute Composite Score and Dynamic Weights
        overall_score, breakdown = cls._compute_composite_score(
            req_score=req_score,
            pref_score=pref_score,
            exp_score=exp_score,
            edu_score=edu_score,
        )

        is_provisional = len(provisional_reasons) > 0

        return {
            "overall_score": overall_score,
            "score_breakdown": breakdown.model_dump(),
            "matched_skills": [m.model_dump() for m in matched_skills],
            "missing_skills": [m.model_dump() for m in missing_skills],
            "experience_comparison": exp_comp.model_dump(),
            "education_comparison": edu_comp.model_dump(),
            "is_provisional": is_provisional,
            "provisional_reasons": provisional_reasons,
        }

    @classmethod
    def _compare_skills(
        cls,
        parsed_resume: ParsedResumeData,
        parsed_job: ParsedJobData,
        resume_raw_text: str,
        job_raw_text: str,
    ) -> Tuple[List[MatchedSkillItem], List[MissingSkillItem], float, float, List[str]]:
        """Compare required and preferred skills separately."""
        matched: List[MatchedSkillItem] = []
        missing: List[MissingSkillItem] = []
        provisional_reasons: List[str] = []

        # Candidate skill map (lowercased canonical name -> ParsedSkill)
        candidate_skills: Dict[str, ParsedSkill] = {
            s.name.lower(): s for s in parsed_resume.skills
        }

        # Check candidate experience bullets and projects for additional skill mentions
        extra_candidate_skills = set()
        for exp in parsed_resume.work_experience:
            for s in exp.skills_used:
                extra_candidate_skills.add(s.lower())
        for proj in parsed_resume.projects:
            for t in proj.technologies:
                extra_candidate_skills.add(t.lower())

        total_req_count = 0
        matched_req_count = 0.0

        total_pref_count = 0
        matched_pref_count = 0.0

        all_job_skills = parsed_job.required_skills + parsed_job.preferred_skills

        for job_skill in all_job_skills:
            skill_name = job_skill.name
            skill_lower = skill_name.lower()
            is_preferred = (job_skill.requirement_level == RequirementLevel.PREFERRED)
            is_ambiguous = (job_skill.requirement_level == RequirementLevel.AMBIGUOUS)

            if is_ambiguous:
                provisional_reasons.append(
                    f"Ambiguous requirement level for '{skill_name}' in job description."
                )

            if is_preferred:
                total_pref_count += 1
            elif not is_ambiguous:
                total_req_count += 1

            # Validate job source span against job_raw_text
            valid_job_source = None
            if job_skill.source and job_skill.source.verify_against_text(job_raw_text):
                valid_job_source = job_skill.source

            # Check 1: Exact Match in candidate skills
            if skill_lower in candidate_skills:
                cand_skill = candidate_skills[skill_lower]
                valid_resume_source = None
                if cand_skill.source and cand_skill.source.verify_against_text(resume_raw_text):
                    valid_resume_source = cand_skill.source

                matched.append(
                    MatchedSkillItem(
                        skill_name=skill_name,
                        category=job_skill.category or cand_skill.category,
                        requirement_level=job_skill.requirement_level,
                        status=SkillMatchStatus.EXACT_MATCH,
                        years_required=job_skill.years_required,
                        job_source=valid_job_source,
                        resume_source=valid_resume_source,
                        explanation=f"Exact mention of '{skill_name}' found in candidate profile with verified evidence.",
                    )
                )
                if is_preferred:
                    matched_pref_count += 1.0
                elif not is_ambiguous:
                    matched_req_count += 1.0
                continue

            # Check 2: Match in candidate work experience or project tags
            if skill_lower in extra_candidate_skills:
                matched.append(
                    MatchedSkillItem(
                        skill_name=skill_name,
                        category=job_skill.category,
                        requirement_level=job_skill.requirement_level,
                        status=SkillMatchStatus.EXACT_MATCH,
                        years_required=job_skill.years_required,
                        job_source=valid_job_source,
                        resume_source=None,
                        explanation=f"Exact mention of '{skill_name}' identified in candidate projects or experience highlights.",
                    )
                )
                if is_preferred:
                    matched_pref_count += 1.0
                elif not is_ambiguous:
                    matched_req_count += 1.0
                continue

            # Check 3: Related Skill (Adjacent domain)
            related_candidates = RELATED_SKILL_MAP.get(skill_name, set())
            found_related = None
            for rel in related_candidates:
                if rel.lower() in candidate_skills or rel.lower() in extra_candidate_skills:
                    found_related = rel
                    break

            if found_related:
                cand_rel_skill = candidate_skills.get(found_related.lower())
                valid_resume_source = None
                if cand_rel_skill and cand_rel_skill.source and cand_rel_skill.source.verify_against_text(resume_raw_text):
                    valid_resume_source = cand_rel_skill.source

                matched.append(
                    MatchedSkillItem(
                        skill_name=skill_name,
                        category=job_skill.category,
                        requirement_level=job_skill.requirement_level,
                        status=SkillMatchStatus.RELATED_SKILL,
                        years_required=job_skill.years_required,
                        job_source=valid_job_source,
                        resume_source=valid_resume_source,
                        explanation=(
                            f"Candidate profile lacks direct evidence of '{skill_name}', "
                            f"but has verified experience with related framework/tool '{found_related}'."
                        ),
                    )
                )
                # Partial credit (0.5) for adjacent framework
                if is_preferred:
                    matched_pref_count += 0.5
                elif not is_ambiguous:
                    matched_req_count += 0.5
                continue

            # No evidence found
            if is_ambiguous:
                missing.append(
                    MissingSkillItem(
                        skill_name=skill_name,
                        category=job_skill.category,
                        requirement_level=job_skill.requirement_level,
                        status=SkillMatchStatus.AMBIGUOUS_REQUIREMENT,
                        years_required=job_skill.years_required,
                        job_source=valid_job_source,
                        explanation=(
                            f"Ambiguous requirement level for '{skill_name}' in job description without sufficient context. "
                            "Excluded from verified scoring to avoid penalizing candidate."
                        ),
                    )
                )
            else:
                missing.append(
                    MissingSkillItem(
                        skill_name=skill_name,
                        category=job_skill.category,
                        requirement_level=job_skill.requirement_level,
                        status=SkillMatchStatus.MISSING_EVIDENCE,
                        years_required=job_skill.years_required,
                        job_source=valid_job_source,
                        explanation=(
                            f"No verified evidence of '{skill_name}' was found in candidate profile. "
                            "Treated as missing evidence, not proof of inability."
                        ),
                    )
                )

        # Calculate percentage scores
        req_score = 100.0 if total_req_count == 0 else (matched_req_count / total_req_count) * 100.0
        pref_score = 100.0 if total_pref_count == 0 else (matched_pref_count / total_pref_count) * 100.0

        return matched, missing, round(req_score, 1), round(pref_score, 1), provisional_reasons

    @classmethod
    def _compare_experience(
        cls,
        parsed_resume: ParsedResumeData,
        parsed_job: ParsedJobData,
    ) -> Tuple[ExperienceComparison, Optional[float], Optional[str]]:
        """Evaluate role experience requirements against candidate employment duration."""
        job_min_years: Optional[float] = None
        job_exp_source: Optional[SourceSpan] = None

        if parsed_job.experience_requirements:
            valid_years = [
                e.min_years for e in parsed_job.experience_requirements if e.min_years is not None
            ]
            if valid_years:
                job_min_years = min(valid_years)
                first_with_years = next(
                    e for e in parsed_job.experience_requirements if e.min_years == job_min_years
                )
                job_exp_source = first_with_years.source

        # Calculate candidate duration from work experience
        candidate_years = cls._calculate_candidate_experience_years(parsed_resume.work_experience)

        # If job does not specify general experience requirements
        if job_min_years is None:
            return (
                ExperienceComparison(
                    required_years=None,
                    candidate_years=candidate_years,
                    status="not_specified",
                    explanation="No explicit general experience duration required by job description.",
                    job_source=None,
                ),
                None,
                None,
            )

        # If candidate lacks parseable experience dates
        if candidate_years is None:
            return (
                ExperienceComparison(
                    required_years=job_min_years,
                    candidate_years=None,
                    status="insufficient_evidence",
                    explanation=(
                        f"Job explicitly requires {job_min_years:.0f}+ years experience, "
                        "but candidate resume lacks parseable employment date ranges."
                    ),
                    job_source=job_exp_source,
                ),
                None,
                "Candidate experience duration could not be evaluated due to missing date ranges.",
            )

        # Both present: compute evaluation
        if candidate_years >= job_min_years:
            score = 100.0
            status = "met"
            explanation = (
                f"Candidate has ~{candidate_years:.1f} years of detectable experience, "
                f"satisfying the {job_min_years:.0f}+ year requirement."
            )
        else:
            score = (candidate_years / job_min_years) * 100.0
            status = "partial"
            explanation = (
                f"Candidate has ~{candidate_years:.1f} years of detectable experience, "
                f"which is below the stated {job_min_years:.0f}+ year requirement."
            )

        return (
            ExperienceComparison(
                required_years=job_min_years,
                candidate_years=round(candidate_years, 1),
                status=status,
                explanation=explanation,
                job_source=job_exp_source,
            ),
            round(score, 1),
            None,
        )

    @classmethod
    def _calculate_candidate_experience_years(cls, experiences: List[ParsedExperience]) -> Optional[float]:
        """Calculate approximate cumulative experience years from chronological entries."""
        if not experiences:
            return None

        total_years = 0.0
        parsed_any = False
        current_year = datetime.now().year

        for exp in experiences:
            start_yr = cls._parse_year(exp.start_date)
            if not start_yr:
                continue

            end_yr = cls._parse_year(exp.end_date)
            if not end_yr:
                if exp.is_current or (exp.end_date and "present" in exp.end_date.lower()):
                    end_yr = current_year
                else:
                    end_yr = start_yr + 1

            if end_yr >= start_yr:
                duration = max(1.0, float(end_yr - start_yr))
                total_years += duration
                parsed_any = True

        return total_years if parsed_any else None

    @classmethod
    def _compare_education(
        cls,
        parsed_resume: ParsedResumeData,
        parsed_job: ParsedJobData,
    ) -> Tuple[EducationComparison, Optional[float]]:
        """Evaluate degree credentials hierarchically."""
        job_req_level = None
        job_source = None
        for edu in parsed_job.education_requirements:
            if edu.degree_level:
                job_req_level = edu.degree_level
                job_source = edu.source
                break

        if not job_req_level:
            return (
                EducationComparison(
                    required_level=None,
                    candidate_level=None,
                    status="not_specified",
                    explanation="No explicit degree credential required by job description.",
                    job_source=None,
                ),
                None,
            )

        # Candidate degree
        cand_highest_level = None
        cand_highest_rank = 0
        for edu in parsed_resume.education:
            deg = (edu.degree or "").lower()
            for key, rank in DEGREE_RANKS.items():
                if key in deg:
                    if rank > cand_highest_rank:
                        cand_highest_rank = rank
                        cand_highest_level = edu.degree
                    break

        req_rank = 0
        for key, rank in DEGREE_RANKS.items():
            if key in job_req_level.lower():
                req_rank = rank
                break

        if not cand_highest_level:
            return (
                EducationComparison(
                    required_level=job_req_level,
                    candidate_level=None,
                    status="insufficient_evidence",
                    explanation=f"Job requires '{job_req_level}', but candidate profile lists no formal degree credential.",
                    job_source=job_source,
                ),
                None,
            )

        if cand_highest_rank >= req_rank:
            return (
                EducationComparison(
                    required_level=job_req_level,
                    candidate_level=cand_highest_level,
                    status="met",
                    explanation=f"Candidate holds '{cand_highest_level}', satisfying the required '{job_req_level}' level.",
                    job_source=job_source,
                ),
                100.0,
            )
        else:
            return (
                EducationComparison(
                    required_level=job_req_level,
                    candidate_level=cand_highest_level,
                    status="partial",
                    explanation=f"Candidate holds '{cand_highest_level}', which is below the requested '{job_req_level}' level.",
                    job_source=job_source,
                ),
                50.0,
            )

    @classmethod
    def _compute_composite_score(
        cls,
        req_score: float,
        pref_score: float,
        exp_score: Optional[float],
        edu_score: Optional[float],
    ) -> Tuple[float, ScoreBreakdown]:
        """Compute transparent overall score dynamically normalizing available dimensions."""
        evaluable_components: List[str] = ["required_skills", "preferred_skills"]

        has_exp = exp_score is not None
        has_edu = edu_score is not None

        if has_exp and has_edu:
            w_req, w_pref, w_exp, w_edu = 0.60, 0.20, 0.10, 0.10
            evaluable_components.extend(["experience", "education"])
            total = (w_req * req_score) + (w_pref * pref_score) + (w_exp * exp_score) + (w_edu * edu_score)
        elif has_exp and not has_edu:
            w_req, w_pref, w_exp, w_edu = 0.65, 0.20, 0.15, 0.0
            evaluable_components.append("experience")
            total = (w_req * req_score) + (w_pref * pref_score) + (w_exp * exp_score)
        elif not has_exp and has_edu:
            w_req, w_pref, w_exp, w_edu = 0.65, 0.20, 0.0, 0.15
            evaluable_components.append("education")
            total = (w_req * req_score) + (w_pref * pref_score) + (w_edu * edu_score)
        else:
            w_req, w_pref, w_exp, w_edu = 0.75, 0.25, 0.0, 0.0
            total = (w_req * req_score) + (w_pref * pref_score)

        breakdown = ScoreBreakdown(
            required_skills_score=round(req_score, 1),
            required_skills_weight=w_req,
            preferred_skills_score=round(pref_score, 1),
            preferred_skills_weight=w_pref,
            experience_score=round(exp_score, 1) if exp_score is not None else None,
            experience_weight=w_exp,
            education_score=round(edu_score, 1) if edu_score is not None else None,
            education_weight=w_edu,
            evaluable_components=evaluable_components,
        )

        return round(total, 1), breakdown

    @staticmethod
    def _parse_year(date_str: Optional[str]) -> Optional[int]:
        if not date_str:
            return None
        match = re.search(r"\b(19\d{2}|20\d{2})\b", date_str)
        return int(match.group(1)) if match else None
