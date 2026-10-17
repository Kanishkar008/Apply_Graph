"""Deterministic resume extractor.

Extracts structured sections, entities, dates, and evidence spans from raw resume text.
All extracted facts are strictly anchored to verbatim substrings of the original text.
No external network or AI calls are used.
"""

import re
from typing import Dict, List, Optional, Tuple

from app.schemas.resume_parsed import (
    FactOrigin,
    ParsedCertification,
    ParsedEducation,
    ParsedExperience,
    ParsedProject,
    ParsedResumeData,
    ParsedSkill,
    SourceSpan,
)
from app.services.parser.skills_taxonomy import SKILLS_TAXONOMY


def find_verifiable_span(raw_text: str, snippet: str, search_start: int = 0) -> Optional[SourceSpan]:
    """Find exact occurrence of snippet in raw_text and return SourceSpan with verified offsets."""
    if not snippet:
        return None
    idx = raw_text.find(snippet, search_start)
    if idx == -1:
        # Try finding anywhere if search_start missed it
        idx = raw_text.find(snippet)
    if idx == -1:
        # Never invent offsets if not found verbatim
        return SourceSpan(source_text=snippet, char_start=None, char_end=None)

    end_idx = idx + len(snippet)
    return SourceSpan(source_text=snippet, char_start=idx, char_end=end_idx)


class SectionSpan:
    """Represents a discovered resume section boundary."""

    def __init__(self, name: str, start: int, end: int, text: str):
        self.name = name
        self.start = start
        self.end = end
        self.text = text


class ResumeExtractor:
    """Deterministic, rule-based extractor for resume raw text."""

    SECTION_PATTERNS = {
        "summary": re.compile(
            r"^(?:professional\s+summary|summary|profile|about\s+me|executive\s+summary|objective)\b",
            re.IGNORECASE | re.MULTILINE,
        ),
        "skills": re.compile(
            r"^(?:technical\s+skills|core\s+competencies|skills\s*&?\s*technologies|skills|technologies|tools)\b",
            re.IGNORECASE | re.MULTILINE,
        ),
        "experience": re.compile(
            r"^(?:work\s+experience|professional\s+experience|employment\s+history|experience|career\s+history)\b",
            re.IGNORECASE | re.MULTILINE,
        ),
        "education": re.compile(
            r"^(?:education(?:\s+and\s+training)?|academic\s+background|academic\s+history|qualifications)\b",
            re.IGNORECASE | re.MULTILINE,
        ),
        "projects": re.compile(
            r"^(?:projects|technical\s+projects|personal\s+projects|key\s+projects)\b",
            re.IGNORECASE | re.MULTILINE,
        ),
        "certifications": re.compile(
            r"^(?:certifications?|licenses\s*&?\s*certifications?|courses\s*&?\s*certificates?)\b",
            re.IGNORECASE | re.MULTILINE,
        ),
    }

    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
    LINKEDIN_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_-]+", re.IGNORECASE)
    GITHUB_PATTERN = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_-]+", re.IGNORECASE)

    DATE_RANGE_PATTERN = re.compile(
        r"(?P<start>(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|\d{1,2}/\d{4})"
        r"\s*(?:[-–—to]+)\s*"
        r"(?P<end>(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|\d{1,2}/\d{4}|Present|Current)",
        re.IGNORECASE,
    )

    DEGREE_PATTERN = re.compile(
        r"\b(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Associate(?:'s)?|B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?)\b(?:\s+(?:of|in)\s+[^,\n]+)?",
        re.IGNORECASE,
    )

    INSTITUTION_KEYWORDS = re.compile(
        r"\b(?:University|College|Institute|School|Academy|Polytechnic)\b",
        re.IGNORECASE,
    )

    @classmethod
    def segment_sections(cls, raw_text: str) -> Dict[str, SectionSpan]:
        """Identify boundaries for known resume sections."""
        matches: List[Tuple[int, int, str]] = []
        for section_name, pattern in cls.SECTION_PATTERNS.items():
            for m in pattern.finditer(raw_text):
                matches.append((m.start(), m.end(), section_name))

        matches.sort(key=lambda x: x[0])
        sections: Dict[str, SectionSpan] = {}
        for i, (start, header_end, name) in enumerate(matches):
            next_start = matches[i + 1][0] if i + 1 < len(matches) else len(raw_text)
            section_content = raw_text[header_end:next_start].strip()
            # Store first instance of each section name
            if name not in sections and section_content:
                sections[name] = SectionSpan(
                    name=name,
                    start=header_end,
                    end=next_start,
                    text=section_content,
                )

        return sections

    @classmethod
    def extract_contact_info(cls, raw_text: str) -> Tuple[
        Optional[str],
        Optional[str],
        Optional[str],
        Optional[str],
        Optional[str],
        Optional[str],
    ]:
        """Extract candidate name, email, phone, location, LinkedIn, GitHub."""
        email_match = cls.EMAIL_PATTERN.search(raw_text)
        email = email_match.group(0) if email_match else None

        phone_match = cls.PHONE_PATTERN.search(raw_text)
        phone = phone_match.group(0) if phone_match else None

        li_match = cls.LINKEDIN_PATTERN.search(raw_text)
        linkedin_url = li_match.group(0) if li_match else None

        gh_match = cls.GITHUB_PATTERN.search(raw_text)
        github_url = gh_match.group(0) if gh_match else None

        # Candidate name heuristic: First non-empty, non-header line that does not contain email/url/digits
        candidate_name: Optional[str] = None
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        for line in lines[:5]:
            if any(p.match(line) for p in cls.SECTION_PATTERNS.values()):
                break
            if cls.EMAIL_PATTERN.search(line) or cls.PHONE_PATTERN.search(line) or "http" in line:
                continue
            words = line.split()
            if 2 <= len(words) <= 4 and not any(char.isdigit() for char in line):
                candidate_name = line
                break

        # Location heuristic: search segments across top lines (e.g. "San Francisco, CA")
        location: Optional[str] = None
        loc_pattern = re.compile(r"\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z]+))\b")
        for line in lines[:5]:
            if any(p.match(line) for p in cls.SECTION_PATTERNS.values()):
                break
            if line == candidate_name:
                continue
            # Split line by pipes, commas, or bullets to inspect segments
            parts = re.split(r"[|•·]", line)
            for part in parts:
                part_clean = part.strip()
                if cls.EMAIL_PATTERN.search(part_clean) or cls.PHONE_PATTERN.search(part_clean) or "http" in part_clean:
                    # Still check if part has location alongside
                    m = loc_pattern.search(part_clean)
                    if m:
                        location = m.group(1).strip()
                        break
                else:
                    m = loc_pattern.search(part_clean)
                    if m and len(m.group(1).split()) <= 4:
                        location = m.group(1).strip()
                        break
            if location:
                break

        return candidate_name, email, phone, location, linkedin_url, github_url

    @classmethod
    def extract_skills(cls, raw_text: str, sections: Dict[str, SectionSpan]) -> List[ParsedSkill]:
        """Extract skill mentions strictly using curated taxonomy and token boundaries."""
        skills: List[ParsedSkill] = []
        seen_names = set()

        # Check skills section first for highest relevance, then entire resume
        search_targets = []
        if "skills" in sections:
            search_targets.append((sections["skills"].text, sections["skills"].start))
        search_targets.append((raw_text, 0))

        for text_corpus, base_offset in search_targets:
            for skill_name, (category, patterns) in SKILLS_TAXONOMY.items():
                if skill_name in seen_names:
                    continue

                for pattern in patterns:
                    match = pattern.search(text_corpus)
                    if match:
                        matched_text = match.group(0)
                        # Find the sentence or line context containing this skill
                        start_idx = base_offset + match.start()
                        end_idx = base_offset + match.end()

                        # Extract surrounding line as source evidence snippet
                        line_start = raw_text.rfind("\n", 0, start_idx)
                        line_start = 0 if line_start == -1 else line_start + 1
                        line_end = raw_text.find("\n", end_idx)
                        line_end = len(raw_text) if line_end == -1 else line_end

                        snippet = raw_text[line_start:line_end].strip()
                        if not snippet:
                            snippet = matched_text

                        span = find_verifiable_span(raw_text, snippet, line_start)
                        if not span or not span.verify_against_text(raw_text):
                            span = find_verifiable_span(raw_text, matched_text, start_idx)

                        skills.append(
                            ParsedSkill(
                                name=skill_name,
                                category=category,
                                origin=FactOrigin.EXTRACTED,
                                source=span,
                            )
                        )
                        seen_names.add(skill_name)
                        break

        return skills

    @classmethod
    def extract_work_experience(cls, raw_text: str, sections: Dict[str, SectionSpan]) -> List[ParsedExperience]:
        """Extract work experience entries anchored to source text."""
        experiences: List[ParsedExperience] = []
        target_text = sections["experience"].text if "experience" in sections else None
        base_offset = sections["experience"].start if "experience" in sections else 0

        if not target_text:
            return experiences

        # Split into blocks by date ranges or double newlines
        lines = target_text.splitlines()
        current_block: List[str] = []
        blocks: List[str] = []

        for line in lines:
            line_str = line.strip()
            if not line_str:
                if current_block:
                    blocks.append("\n".join(current_block))
                    current_block = []
                continue

            # If line starts a new date range and we already have a block, flush
            if cls.DATE_RANGE_PATTERN.search(line_str) and len(current_block) >= 2:
                blocks.append("\n".join(current_block))
                current_block = [line_str]
            else:
                current_block.append(line_str)

        if current_block:
            blocks.append("\n".join(current_block))

        for block in blocks:
            if not block.strip():
                continue

            block_lines = [l.strip() for l in block.splitlines() if l.strip()]
            date_match = cls.DATE_RANGE_PATTERN.search(block)

            start_date: Optional[str] = None
            end_date: Optional[str] = None
            is_current = False

            if date_match:
                start_date = date_match.group("start").strip()
                raw_end = date_match.group("end").strip()
                if raw_end.lower() in ["present", "current"]:
                    end_date = "Present"
                    is_current = True
                else:
                    end_date = raw_end

            # Header lines (role / company)
            company: Optional[str] = None
            role: Optional[str] = None
            highlights: List[str] = []

            for line in block_lines:
                if line.startswith(("-", "•", "*", "–")):
                    clean_bullet = line.lstrip("-•*– ").strip()
                    if clean_bullet:
                        highlights.append(clean_bullet)
                elif not role:
                    # Role / Title heuristic (e.g. "Senior Software Engineer - Google")
                    parts = re.split(r"\s+[-|–@]\s+|\s+at\s+", line)
                    if len(parts) >= 2:
                        role = parts[0].strip()
                        company = parts[1].strip()
                    else:
                        role = line.strip()
                elif not company and line != date_match.group(0) if date_match else True:
                    company = line.strip()

            # Verifiable source span for this experience block
            span = find_verifiable_span(raw_text, block)
            if not span or not span.verify_against_text(raw_text):
                # Try first line
                span = find_verifiable_span(raw_text, block_lines[0])

            experiences.append(
                ParsedExperience(
                    company=company,
                    role=role,
                    start_date=start_date,
                    end_date=end_date,
                    is_current=is_current,
                    highlights=highlights,
                    origin=FactOrigin.EXTRACTED,
                    source=span,
                )
            )

        return experiences

    @classmethod
    def extract_education(cls, raw_text: str, sections: Dict[str, SectionSpan]) -> List[ParsedEducation]:
        """Extract education entries with source evidence."""
        education_list: List[ParsedEducation] = []
        target_text = sections["education"].text if "education" in sections else None
        if not target_text:
            return education_list

        blocks = [b.strip() for b in re.split(r"\n\s*\n", target_text) if b.strip()]
        if not blocks:
            blocks = [target_text]

        for block in blocks:
            institution: Optional[str] = None
            degree: Optional[str] = None
            field_of_study: Optional[str] = None
            grad_year: Optional[str] = None

            degree_match = cls.DEGREE_PATTERN.search(block)
            if degree_match:
                degree = degree_match.group(0).strip()

            # Check for year (e.g., 2018 - 2022 or 2020)
            date_range = cls.DATE_RANGE_PATTERN.search(block)
            if date_range:
                grad_year = date_range.group("end").strip()
            else:
                year_match = re.search(r"\b(19\d{2}|20\d{2})\b", block)
                if year_match:
                    grad_year = year_match.group(0)

            # Check for institution
            for line in block.splitlines():
                if cls.INSTITUTION_KEYWORDS.search(line):
                    institution = line.strip()
                    break

            if not institution and block.splitlines():
                # Fallback to first line if no keyword
                institution = block.splitlines()[0].strip()

            span = find_verifiable_span(raw_text, block)
            if not span or not span.verify_against_text(raw_text):
                span = find_verifiable_span(raw_text, block.splitlines()[0])

            education_list.append(
                ParsedEducation(
                    institution=institution,
                    degree=degree,
                    field_of_study=field_of_study,
                    end_date=grad_year,
                    origin=FactOrigin.EXTRACTED,
                    source=span,
                )
            )

        return education_list

    @classmethod
    def extract_projects(cls, raw_text: str, sections: Dict[str, SectionSpan]) -> List[ParsedProject]:
        """Extract project entries with source evidence."""
        projects: List[ParsedProject] = []
        target_text = sections["projects"].text if "projects" in sections else None
        if not target_text:
            return projects

        blocks = [b.strip() for b in re.split(r"\n\s*\n", target_text) if b.strip()]
        for block in blocks:
            lines = [l.strip() for l in block.splitlines() if l.strip()]
            if not lines:
                continue

            first_line = lines[0]
            # Project title often followed by colon or dash
            title_parts = re.split(r"[:\-|–]", first_line)
            name = title_parts[0].strip()
            description = "\n".join(lines[1:]) if len(lines) > 1 else None

            # Detect technologies mentioned in project
            techs = []
            for skill_name, (_, patterns) in SKILLS_TAXONOMY.items():
                for pat in patterns:
                    if pat.search(block):
                        techs.append(skill_name)
                        break

            span = find_verifiable_span(raw_text, block)
            if not span or not span.verify_against_text(raw_text):
                span = find_verifiable_span(raw_text, first_line)

            projects.append(
                ParsedProject(
                    name=name,
                    description=description,
                    technologies=techs,
                    origin=FactOrigin.EXTRACTED,
                    source=span,
                )
            )

        return projects

    @classmethod
    def extract_certifications(cls, raw_text: str, sections: Dict[str, SectionSpan]) -> List[ParsedCertification]:
        """Extract certification entries with source evidence."""
        certs: List[ParsedCertification] = []
        target_text = sections["certifications"].text if "certifications" in sections else None
        if not target_text:
            return certs

        for line in target_text.splitlines():
            line_str = line.strip().lstrip("-•*– ")
            if not line_str or len(line_str) < 3:
                continue

            year_match = re.search(r"\b(19\d{2}|20\d{2})\b", line_str)
            date = year_match.group(0) if year_match else None

            span = find_verifiable_span(raw_text, line_str)
            certs.append(
                ParsedCertification(
                    name=line_str,
                    date=date,
                    origin=FactOrigin.EXTRACTED,
                    source=span,
                )
            )

        return certs

    @classmethod
    def parse_resume_text(cls, raw_text: str) -> ParsedResumeData:
        """Run full extraction pipeline returning ParsedResumeData."""
        sections = cls.segment_sections(raw_text)

        candidate_name, email, phone, location, linkedin_url, github_url = cls.extract_contact_info(raw_text)
        summary = sections["summary"].text if "summary" in sections else None

        skills = cls.extract_skills(raw_text, sections)
        experience = cls.extract_work_experience(raw_text, sections)
        education = cls.extract_education(raw_text, sections)
        projects = cls.extract_projects(raw_text, sections)
        certifications = cls.extract_certifications(raw_text, sections)

        return ParsedResumeData(
            candidate_name=candidate_name,
            email=email,
            phone=phone,
            location=location,
            linkedin_url=linkedin_url,
            github_url=github_url,
            summary=summary,
            skills=skills,
            work_experience=experience,
            education=education,
            projects=projects,
            certifications=certifications,
        )
