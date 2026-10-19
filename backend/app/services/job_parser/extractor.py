"""Deterministic extractor for Job Descriptions.

Parses unstructured job description text into structured intelligence:
- Categorized skills (Required vs Preferred vs Ambiguous)
- Skill-specific years of experience (only when explicitly linked)
- General experience requirements
- Education credentials
- Salary / compensation
- Responsibilities
- Job metadata (title, company, location, employment type)

Guarantees 100% deterministic, offline extraction with verifiable SourceSpans.
No external LLM calls or probabilistic embeddings.
"""

import re
from typing import Dict, List, Optional, Tuple

from app.schemas.job_parsed import (
    ParsedJobData,
    ParsedJobEducationRequirement,
    ParsedJobExperienceRequirement,
    ParsedJobResponsibility,
    ParsedJobSalary,
    ParsedJobSkill,
    RequirementLevel,
)
from app.schemas.resume_parsed import FactOrigin, SourceSpan
from app.services.parser.skills_taxonomy import (
    ALLOWLISTED_SINGLE_LETTER_TECH,
    SKILLS_TAXONOMY,
    has_single_letter_skill_context,
    is_ordinary_prose_single_letter,
)


class JobExtractor:
    """Deterministic extractor for job descriptions with exact character offsets."""

    @classmethod
    def parse_job_text(cls, raw_text: str) -> ParsedJobData:
        """Parse raw job description text into structured ParsedJobData."""
        if not raw_text or not raw_text.strip():
            return ParsedJobData()

        sections = cls._segment_sections(raw_text)
        metadata = cls._extract_metadata(raw_text)
        required_skills, preferred_skills = cls._extract_skills(raw_text, sections)
        exp_reqs = cls._extract_experience_requirements(raw_text, sections)
        edu_reqs = cls._extract_education_requirements(raw_text, sections)
        responsibilities = cls._extract_responsibilities(raw_text, sections)
        salary = cls._extract_salary(raw_text)

        return ParsedJobData(
            title=metadata.get("title"),
            company=metadata.get("company"),
            location=metadata.get("location"),
            employment_type=metadata.get("employment_type"),
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            experience_requirements=exp_reqs,
            education_requirements=edu_reqs,
            responsibilities=responsibilities,
            salary=salary,
        )

    # ------------------------------------------------------------------
    # 1. Section Segmentation
    # ------------------------------------------------------------------
    @classmethod
    def _segment_sections(cls, raw_text: str) -> List[Dict]:
        """Segment the job text into labeled sections with character boundaries.

        Categories:
        - 'required': Requirements, Qualifications, Must Have, Minimum Requirements
        - 'preferred': Preferred, Nice to Have, Bonus, Desired, Pluses
        - 'responsibilities': Responsibilities, What You'll Do, Duties
        - 'education': Education, Academic Requirements
        - 'compensation': Salary, Compensation, Benefits
        - 'general': Unclassified or general sections
        """
        lines = raw_text.splitlines(keepends=True)
        sections: List[Dict] = []
        current_offset = 0

        # Regex headers
        req_pattern = re.compile(
            r"^\s*(?:[\d\.\-\*#]+\s*)?(?:minimum\s+|basic\s+|core\s+|mandatory\s+)?(?:requirements|qualifications|what\s+you(?:'ll|\s+will)?\s+(?:need|bring)|must\s+haves?|who\s+you\s+are)\b",
            re.IGNORECASE,
        )
        pref_pattern = re.compile(
            r"^\s*(?:[\d\.\-\*#]+\s*)?(?:preferred|nice\s+to\s+have|bonus|desired|additional|pluses|plus|bonus\s+points)\s*(?:qualifications|requirements|skills)?\b",
            re.IGNORECASE,
        )
        resp_pattern = re.compile(
            r"^\s*(?:[\d\.\-\*#]+\s*)?(?:responsibilities|duties|what\s+you(?:'ll|\s+will)\s+do|key\s+responsibilities|role\s+responsibilities|about\s+the\s+role)\b",
            re.IGNORECASE,
        )
        edu_pattern = re.compile(
            r"^\s*(?:[\d\.\-\*#]+\s*)?(?:education|academic\s+requirements|degree\s+requirements)\b",
            re.IGNORECASE,
        )
        comp_pattern = re.compile(
            r"^\s*(?:[\d\.\-\*#]+\s*)?(?:compensation|salary|pay\s+range|benefits)\b",
            re.IGNORECASE,
        )

        current_type = "general"
        section_start = 0

        for line in lines:
            line_len = len(line)
            stripped = line.strip().lower()

            new_type = None
            if pref_pattern.match(stripped):
                new_type = "preferred"
            elif req_pattern.match(stripped):
                new_type = "required"
            elif resp_pattern.match(stripped):
                new_type = "responsibilities"
            elif edu_pattern.match(stripped):
                new_type = "education"
            elif comp_pattern.match(stripped):
                new_type = "compensation"

            if new_type and new_type != current_type:
                # Close previous section
                if current_offset > section_start:
                    sections.append({
                        "type": current_type,
                        "start": section_start,
                        "end": current_offset,
                    })
                current_type = new_type
                section_start = current_offset

            current_offset += line_len

        # Append final section
        sections.append({
            "type": current_type,
            "start": section_start,
            "end": len(raw_text),
        })

        return sections

    @classmethod
    def _get_section_type_at_offset(cls, offset: int, sections: List[Dict]) -> str:
        """Find the section type containing the given character offset."""
        for sec in sections:
            if sec["start"] <= offset < sec["end"]:
                return sec["type"]
        return "general"

    # ------------------------------------------------------------------
    # 2. Skills Extraction & Categorization
    # ------------------------------------------------------------------
    @classmethod
    def _extract_skills(
        cls,
        raw_text: str,
        sections: List[Dict],
    ) -> Tuple[List[ParsedJobSkill], List[ParsedJobSkill]]:
        """Extract skills from taxonomy with strict token boundaries.

        Separates into required and preferred based on:
        1. Section heading context (preferred section -> preferred)
        2. In-line modifiers ('preferred', 'nice to have', 'bonus', 'plus')
        3. Ambiguous section without clear indicators -> marked AMBIGUOUS
        Associates years of experience only when explicitly linked in the text.
        """
        required_skills: List[ParsedJobSkill] = []
        preferred_skills: List[ParsedJobSkill] = []
        seen_skills = set()

        for canonical_name, (category, patterns) in SKILLS_TAXONOMY.items():
            best_match: Optional[re.Match] = None
            for pattern in patterns:
                match = pattern.search(raw_text)
                if match:
                    if best_match is None or match.start() < best_match.start():
                        best_match = match

            if not best_match:
                continue

            skill_name_lower = canonical_name.lower()
            if skill_name_lower in seen_skills:
                continue

            char_start = best_match.start()
            char_end = best_match.end()
            source_text = raw_text[char_start:char_end]

            # Context-aware validation for single-letter terms (e.g. R, C)
            is_single_letter = len(canonical_name) == 1
            if is_single_letter:
                if canonical_name not in ALLOWLISTED_SINGLE_LETTER_TECH:
                    continue
                if is_ordinary_prose_single_letter(canonical_name, raw_text, char_start, char_end):
                    continue

            # Determine line context
            line_start = raw_text.rfind("\n", 0, char_start)
            line_start = 0 if line_start == -1 else line_start + 1
            line_end = raw_text.find("\n", char_end)
            line_end = len(raw_text) if line_end == -1 else line_end
            line_text = raw_text[line_start:line_end].lower()

            section_type = cls._get_section_type_at_offset(char_start, sections)

            has_single_context = (
                has_single_letter_skill_context(canonical_name, raw_text, char_start, char_end, section_type)
                if is_single_letter
                else True
            )

            # Check explicit in-line modifier keywords
            has_pref_modifier = bool(
                re.search(r"\b(preferred|nice\s+to\s+have|bonus|optional|plus|pluses|desired)\b", line_text)
            )
            has_req_modifier = bool(
                re.search(r"\b(required|must\s+have|essential|minimum|mandatory)\b", line_text)
            )

            # Determine requirement level
            if is_single_letter and not has_single_context:
                # Standalone single-letter tech without confirming context -> marked AMBIGUOUS
                req_level = RequirementLevel.AMBIGUOUS
            elif has_pref_modifier:
                req_level = RequirementLevel.PREFERRED
            elif has_req_modifier:
                req_level = RequirementLevel.REQUIRED
            elif section_type == "preferred":
                req_level = RequirementLevel.PREFERRED
            elif section_type == "required":
                req_level = RequirementLevel.REQUIRED
            else:
                # In general/responsibilities without explicit modifiers:
                # Mark as ambiguous to distinguish unclassified from confirmed requirements
                req_level = RequirementLevel.AMBIGUOUS

            # Check for explicit skill-specific years of experience
            years_req = cls._extract_skill_years(raw_text, canonical_name, line_start, line_end)

            skill_obj = ParsedJobSkill(
                name=canonical_name,
                category=category,
                requirement_level=req_level,
                years_required=years_req,
                origin=FactOrigin.EXTRACTED,
                source=SourceSpan(
                    source_text=source_text,
                    char_start=char_start,
                    char_end=char_end,
                ),
            )

            seen_skills.add(skill_name_lower)
            if req_level == RequirementLevel.PREFERRED:
                preferred_skills.append(skill_obj)
            else:
                # Required and Ambiguous both placed in required_skills list with their respective requirement_level
                required_skills.append(skill_obj)

        return required_skills, preferred_skills

    @classmethod
    def _extract_skill_years(
        cls,
        raw_text: str,
        skill_name: str,
        line_start: int,
        line_end: int,
    ) -> Optional[float]:
        """Associate years of experience only when explicitly connected to the skill.

        Examples of explicit association:
        - '5+ years of Python'
        - '3-5 years experience with React'
        - 'Python: 4+ years'
        - 'At least 3 years Python development'
        """
        line_snippet = raw_text[line_start:line_end]
        escaped_skill = re.escape(skill_name)

        # Pattern 1: 'X+ years of [skill]' or 'X-Y years of [skill]'
        p1 = re.compile(
            r"(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:to|-)?\s*(\d+(?:\.\d+)?)?\s*\+?\s*(?:years|yrs)(?:\s+of)?(?:\s+(?:hands-on|professional|work))?(?:\s+experience)?(?:\s+(?:in|with|using))?\s+[^,.;\n]*\b"
            + escaped_skill
            + r"\b",
            re.IGNORECASE,
        )
        m1 = p1.search(line_snippet)
        if m1:
            try:
                return float(m1.group(1))
            except (ValueError, TypeError):
                pass

        # Pattern 2: '[skill] ... X+ years'
        p2 = re.compile(
            r"\b"
            + escaped_skill
            + r"\b[^,.;\n]*?(?:[:(]|\s+-\s+)?\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:to|-)?\s*(\d+(?:\.\d+)?)?\s*\+?\s*(?:years|yrs)",
            re.IGNORECASE,
        )
        m2 = p2.search(line_snippet)
        if m2:
            try:
                return float(m2.group(1))
            except (ValueError, TypeError):
                pass

        return None

    # ------------------------------------------------------------------
    # 3. General Experience Requirements
    # ------------------------------------------------------------------
    @classmethod
    def _extract_experience_requirements(
        cls,
        raw_text: str,
        sections: List[Dict],
    ) -> List[ParsedJobExperienceRequirement]:
        """Extract general role experience requirements (e.g., '5+ years of software engineering experience')."""
        exp_reqs: List[ParsedJobExperienceRequirement] = []

        pattern = re.compile(
            r"\b(?:(?:at\s+least|minimum\s+of)\s+)?(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)(?:\s+of)?\s+([^\n\.;]+)|\b(?:(?:at\s+least|minimum\s+of)\s+)?(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)(?:\s+of)?\s+([^\n\.;]+)",
            re.IGNORECASE,
        )

        for match in pattern.finditer(raw_text):
            char_start = match.start()
            char_end = match.end()
            source_text = raw_text[char_start:char_end].strip()

            # Discard if this looks like a skill-specific bullet already captured
            # Check groups
            if match.group(1) and match.group(2):
                min_yr = float(match.group(1))
                max_yr = float(match.group(2))
                context = (match.group(3) or "").strip()
            elif match.group(4):
                min_yr = float(match.group(4))
                max_yr = None
                context = (match.group(5) or "").strip()
            else:
                continue

            # Don't capture unrealistic numbers (> 40 years)
            if min_yr > 40:
                continue

            exp_reqs.append(
                ParsedJobExperienceRequirement(
                    min_years=min_yr,
                    max_years=max_yr,
                    description=source_text,
                    origin=FactOrigin.EXTRACTED,
                    source=SourceSpan(
                        source_text=source_text,
                        char_start=char_start,
                        char_end=char_end,
                    ),
                )
            )

        return exp_reqs

    # ------------------------------------------------------------------
    # 4. Education Requirements
    # ------------------------------------------------------------------
    @classmethod
    def _extract_education_requirements(
        cls,
        raw_text: str,
        sections: List[Dict],
    ) -> List[ParsedJobEducationRequirement]:
        """Extract explicit education/degree requirements."""
        edu_reqs: List[ParsedJobEducationRequirement] = []

        degree_pattern = re.compile(
            r"\b(bachelor(?:'s)?|b\.s\.|b\.a\.|master(?:'s)?|m\.s\.|ph\.d\.|doctorate|associate(?:'s)?)\b\s*(?:degree)?(?:\s+in\s+([^\n,\.;]+))?",
            re.IGNORECASE,
        )

        for match in degree_pattern.finditer(raw_text):
            char_start = match.start()
            char_end = match.end()
            source_text = raw_text[char_start:char_end].strip()

            raw_degree = match.group(1).lower()
            if "bachelor" in raw_degree or "b.s" in raw_degree or "b.a" in raw_degree:
                degree_level = "Bachelor's"
            elif "master" in raw_degree or "m.s" in raw_degree:
                degree_level = "Master's"
            elif "ph" in raw_degree or "doctorate" in raw_degree:
                degree_level = "Ph.D."
            elif "associate" in raw_degree:
                degree_level = "Associate's"
            else:
                degree_level = raw_degree.capitalize()

            field_of_study = match.group(2).strip() if match.group(2) else None
            if field_of_study:
                # Clean trailing filler words like 'or related field'
                field_of_study = re.sub(r"\s+or\s+equivalent.*$", "", field_of_study, flags=re.IGNORECASE).strip()

            sec_type = cls._get_section_type_at_offset(char_start, sections)
            req_level = RequirementLevel.PREFERRED if sec_type == "preferred" else RequirementLevel.REQUIRED

            edu_reqs.append(
                ParsedJobEducationRequirement(
                    degree_level=degree_level,
                    field_of_study=field_of_study,
                    requirement_level=req_level,
                    origin=FactOrigin.EXTRACTED,
                    source=SourceSpan(
                        source_text=source_text,
                        char_start=char_start,
                        char_end=char_end,
                    ),
                )
            )

        return edu_reqs

    # ------------------------------------------------------------------
    # 5. Responsibilities
    # ------------------------------------------------------------------
    @classmethod
    def _extract_responsibilities(
        cls,
        raw_text: str,
        sections: List[Dict],
    ) -> List[ParsedJobResponsibility]:
        """Extract core responsibility bullet points."""
        responsibilities: List[ParsedJobResponsibility] = []

        resp_sections = [s for s in sections if s["type"] == "responsibilities"]
        for sec in resp_sections:
            sec_text = raw_text[sec["start"] : sec["end"]]
            lines = sec_text.splitlines(keepends=True)
            offset = sec["start"]

            for line in lines:
                line_len = len(line)
                stripped = line.strip()

                # Check if it's a bullet point
                bullet_match = re.match(r"^\s*[\-\*•\d\.]+\s*(.+)$", stripped)
                if bullet_match and len(bullet_match.group(1)) > 15:
                    resp_text = bullet_match.group(1).strip()
                    # Calculate exact offset for the extracted text
                    content_start = offset + line.find(resp_text)
                    content_end = content_start + len(resp_text)

                    responsibilities.append(
                        ParsedJobResponsibility(
                            text=resp_text,
                            origin=FactOrigin.EXTRACTED,
                            source=SourceSpan(
                                source_text=raw_text[content_start:content_end],
                                char_start=content_start,
                                char_end=content_end,
                            ),
                        )
                    )

                offset += line_len

        return responsibilities

    # ------------------------------------------------------------------
    # 6. Salary Extraction
    # ------------------------------------------------------------------
    @classmethod
    def _extract_salary(cls, raw_text: str) -> Optional[ParsedJobSalary]:
        """Extract explicitly stated compensation range."""
        salary_pattern = re.compile(
            r"(\$|USD|EUR|£)\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?k?)\s*(?:-|to|\–)\s*(\$|USD|EUR|£)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?k?)\s*(?:(?:/|\s+per\s+)?(year|yr|annual|month|mo|hour|hr))?",
            re.IGNORECASE,
        )

        match = salary_pattern.search(raw_text)
        if not match:
            return None

        matched_raw = raw_text[match.start() : match.end()]
        lstripped = matched_raw.lstrip()
        char_start = match.start() + (len(matched_raw) - len(lstripped))
        rstripped = lstripped.rstrip()
        char_end = char_start + len(rstripped)
        source_text = rstripped

        currency = match.group(1).upper()
        if currency == "$":
            currency = "USD"
        elif currency == "£":
            currency = "GBP"
        elif currency == "€":
            currency = "EUR"

        def parse_amount(val_str: str) -> Optional[float]:
            clean = val_str.replace(",", "").strip().lower()
            if clean.endswith("k"):
                return float(clean[:-1]) * 1000
            return float(clean)

        try:
            min_amt = parse_amount(match.group(2))
            max_amt = parse_amount(match.group(4))
        except (ValueError, TypeError):
            return None

        raw_interval = (match.group(5) or "").lower()
        if raw_interval in ("year", "yr", "annual"):
            interval = "yearly"
        elif raw_interval in ("month", "mo"):
            interval = "monthly"
        elif raw_interval in ("hour", "hr"):
            interval = "hourly"
        else:
            # Default to yearly if > 30000, hourly if < 300
            interval = "yearly" if (min_amt and min_amt > 10000) else "hourly"

        return ParsedJobSalary(
            min_amount=min_amt,
            max_amount=max_amt,
            currency=currency,
            interval=interval,
            raw_salary_text=source_text,
            origin=FactOrigin.EXTRACTED,
            source=SourceSpan(
                source_text=source_text,
                char_start=char_start,
                char_end=char_end,
            ),
        )

    # ------------------------------------------------------------------
    # 7. Metadata Extraction
    # ------------------------------------------------------------------
    @classmethod
    def _extract_metadata(cls, raw_text: str) -> Dict[str, Optional[str]]:
        """Extract title, company, location, and employment type heuristically."""
        meta: Dict[str, Optional[str]] = {
            "title": None,
            "company": None,
            "location": None,
            "employment_type": None,
        }

        # Employment type
        emp_match = re.search(
            r"\b(full[\s-]time|part[\s-]time|contract(?:or)?|internship|temporary)\b",
            raw_text,
            re.IGNORECASE,
        )
        if emp_match:
            meta["employment_type"] = emp_match.group(1).capitalize().replace(" ", "-")

        # Location / Remote
        loc_match = re.search(
            r"\b(remote|hybrid|on[\s-]site|(?:san francisco|new york|seattle|austin|chicago|london|berlin|toronto|bangalore|remote\s*\([^\)]+\)))\b",
            raw_text,
            re.IGNORECASE,
        )
        if loc_match:
            meta["location"] = loc_match.group(1).title()

        # Job title / company from header (first 3 lines)
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()][:3]
        if lines:
            first_line = lines[0]
            # Check for patterns like "Title at Company" or "Title - Company"
            split_match = re.split(r"\s+(?:at|@|–|-|\|)\s+", first_line, maxsplit=1)
            if len(split_match) == 2:
                meta["title"] = split_match[0].strip()[:255]
                meta["company"] = split_match[1].strip()[:255]
            elif len(first_line) < 80:
                meta["title"] = first_line[:255]

        return meta
