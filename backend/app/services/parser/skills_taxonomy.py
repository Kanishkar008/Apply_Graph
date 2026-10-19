"""Curated skills taxonomy with regex patterns and categories.

Enforces strict token boundaries to avoid false positives (e.g., 'Go' vs 'Good',
'Java' vs 'JavaScript', 'C' vs 'Cat').
"""

import re
from typing import Dict, List, Set, Tuple

# Canonical name -> (category, list of regex patterns)
SKILLS_TAXONOMY: Dict[str, Tuple[str, List[re.Pattern]]] = {
    # Programming Languages
    "Python": ("language", [re.compile(r"\bpython(?:3)?\b", re.IGNORECASE)]),
    "JavaScript": ("language", [re.compile(r"\bjavascript\b|\bjs\b", re.IGNORECASE)]),
    "TypeScript": ("language", [re.compile(r"\btypescript\b|\bts\b", re.IGNORECASE)]),
    "Java": ("language", [re.compile(r"\bjava\b(?!script)", re.IGNORECASE)]),
    "C++": ("language", [re.compile(r"(?<!\w)c\+\+(?!\w)", re.IGNORECASE)]),
    "C#": ("language", [re.compile(r"(?<!\w)c#(?!\w)", re.IGNORECASE)]),
    "C": (
        "language",
        [
            re.compile(
                r"\b(?:C\s+(?:programming|language|code|compiler|developer|development))\b",
                re.IGNORECASE,
            ),
            re.compile(
                r"\b(?:programming|language|coding|development)\s+in\s+C\b",
                re.IGNORECASE,
            ),
            re.compile(r"\b(?:embedded\s+c|ansi\s+c)\b", re.IGNORECASE),
            re.compile(r"(?<![a-zA-Z0-9_+#])C(?![a-zA-Z0-9_+#])"),  # Standalone 'C'
        ],
    ),
    "Go": ("language", [re.compile(r"\bgolang\b", re.IGNORECASE), re.compile(r"\bGo\b")]),  # 'Go' case-sensitive or 'golang'
    "Rust": ("language", [re.compile(r"\brust\b", re.IGNORECASE)]),
    "Ruby": ("language", [re.compile(r"\bruby\b", re.IGNORECASE)]),
    "PHP": ("language", [re.compile(r"\bphp\b", re.IGNORECASE)]),
    "Swift": ("language", [re.compile(r"\bswift\b", re.IGNORECASE)]),
    "Kotlin": ("language", [re.compile(r"\bkotlin\b", re.IGNORECASE)]),
    "Scala": ("language", [re.compile(r"\bscala\b", re.IGNORECASE)]),
    "R": (
        "language",
        [
            re.compile(
                r"\b(?:R\s+(?:programming|language|scripting|script|code|studio|shiny|packages?|stats?|statistical|developer|development))\b",
                re.IGNORECASE,
            ),
            re.compile(
                r"\b(?:programming|language|coding|development|experience)\s+(?:in|with)\s+R\b",
                re.IGNORECASE,
            ),
            re.compile(r"(?<![a-zA-Z0-9_+#])R(?![a-zA-Z0-9_+#])"),  # Standalone 'R'
        ],
    ),
    "HTML": ("language", [re.compile(r"\bhtml(?:5)?\b", re.IGNORECASE)]),
    "CSS": ("language", [re.compile(r"\bcss(?:3)?\b", re.IGNORECASE)]),
    "SQL": ("language", [re.compile(r"\bsql\b", re.IGNORECASE)]),
    "Bash": ("language", [re.compile(r"\bbash\b|\bshell\s+scripting\b", re.IGNORECASE)]),

    # Frameworks & Libraries
    "FastAPI": ("framework", [re.compile(r"\bfastapi\b", re.IGNORECASE)]),
    "Django": ("framework", [re.compile(r"\bdjango\b", re.IGNORECASE)]),
    "Flask": ("framework", [re.compile(r"\bflask\b", re.IGNORECASE)]),
    "React": ("framework", [re.compile(r"\breact(?:\.js)?\b", re.IGNORECASE)]),
    "Next.js": ("framework", [re.compile(r"\bnext(?:\.js)?\b", re.IGNORECASE)]),
    "Vue.js": ("framework", [re.compile(r"\bvue(?:\.js)?\b", re.IGNORECASE)]),
    "Angular": ("framework", [re.compile(r"\bangular(?:\.js)?\b", re.IGNORECASE)]),
    "Node.js": ("framework", [re.compile(r"\bnode(?:\.js)?\b", re.IGNORECASE)]),
    "Express": ("framework", [re.compile(r"\bexpress(?:\.js)?\b", re.IGNORECASE)]),
    "Spring Boot": ("framework", [re.compile(r"\bspring\s+boot\b|\bspring\s+framework\b", re.IGNORECASE)]),
    ".NET": ("framework", [re.compile(r"(?<!\w)\.net(?:\s+core)?(?!\w)", re.IGNORECASE)]),
    "GraphQL": ("framework", [re.compile(r"\bgraphql\b", re.IGNORECASE)]),
    "REST API": ("framework", [re.compile(r"\brest(?:ful)?(?:\s+apis?)?\b", re.IGNORECASE)]),
    "Tailwind CSS": ("framework", [re.compile(r"\btailwind(?:\s+css)?\b", re.IGNORECASE)]),
    "Pandas": ("framework", [re.compile(r"\bpandas\b", re.IGNORECASE)]),
    "NumPy": ("framework", [re.compile(r"\bnumpy\b", re.IGNORECASE)]),
    "PyTorch": ("framework", [re.compile(r"\bpytorch\b", re.IGNORECASE)]),
    "TensorFlow": ("framework", [re.compile(r"\btensorflow\b", re.IGNORECASE)]),
    "Scikit-Learn": ("framework", [re.compile(r"\bscikit-learn\b|\bsklearn\b", re.IGNORECASE)]),

    # Databases
    "PostgreSQL": ("database", [re.compile(r"\bpostgres(?:ql)?\b", re.IGNORECASE)]),
    "MySQL": ("database", [re.compile(r"\bmysql\b", re.IGNORECASE)]),
    "MongoDB": ("database", [re.compile(r"\bmongodb\b|\bmongo\b", re.IGNORECASE)]),
    "Redis": ("database", [re.compile(r"\bredis\b", re.IGNORECASE)]),
    "SQLite": ("database", [re.compile(r"\bsqlite(?:3)?\b", re.IGNORECASE)]),
    "Cassandra": ("database", [re.compile(r"\bcassandra\b", re.IGNORECASE)]),
    "Elasticsearch": ("database", [re.compile(r"\belasticsearch\b", re.IGNORECASE)]),
    "DynamoDB": ("database", [re.compile(r"\bdynamodb\b", re.IGNORECASE)]),

    # Cloud & DevOps
    "Docker": ("tool", [re.compile(r"\bdocker\b", re.IGNORECASE)]),
    "Kubernetes": ("tool", [re.compile(r"\bkubernetes\b|\bk8s\b", re.IGNORECASE)]),
    "AWS": ("cloud", [re.compile(r"\baws\b|\bamazon\s+web\s+services\b", re.IGNORECASE)]),
    "Google Cloud": ("cloud", [re.compile(r"\bgcp\b|\bgoogle\s+cloud(?:\s+platform)?\b", re.IGNORECASE)]),
    "Azure": ("cloud", [re.compile(r"\bazure\b|\bmicrosoft\s+azure\b", re.IGNORECASE)]),
    "Git": ("tool", [re.compile(r"\bgit\b(?!hub|lab)", re.IGNORECASE)]),
    "GitHub Actions": ("tool", [re.compile(r"\bgithub\s+actions\b", re.IGNORECASE)]),
    "CI/CD": ("tool", [re.compile(r"\bci/cd\b|\bcontinuous\s+integration\b", re.IGNORECASE)]),
    "Terraform": ("tool", [re.compile(r"\bterraform\b", re.IGNORECASE)]),
    "Linux": ("tool", [re.compile(r"\blinux\b", re.IGNORECASE)]),
    "Alembic": ("tool", [re.compile(r"\balembic\b", re.IGNORECASE)]),
    "SQLAlchemy": ("tool", [re.compile(r"\bsqlalchemy\b", re.IGNORECASE)]),
    "Pytest": ("tool", [re.compile(r"\bpytest\b", re.IGNORECASE)]),
    "Vite": ("tool", [re.compile(r"\bvite\b", re.IGNORECASE)]),

    # Soft Skills & Methodologies
    "Agile": ("soft_skill", [re.compile(r"\bagile\b", re.IGNORECASE)]),
    "Scrum": ("soft_skill", [re.compile(r"\bscrum\b", re.IGNORECASE)]),
    "System Design": ("soft_skill", [re.compile(r"\bsystem\s+design\b", re.IGNORECASE)]),
    "Microservices": ("architecture", [re.compile(r"\bmicroservices\b|\bmicroservice\s+architecture\b", re.IGNORECASE)]),
}

# Conservative allowlist of legitimate single-letter technologies
ALLOWLISTED_SINGLE_LETTER_TECH = {"R", "C"}

# Patterns that indicate ordinary prose or non-skill usages of single letters
PROSE_FALSE_POSITIVE_PATTERNS: Dict[str, List[re.Pattern]] = {
    "R": [
        re.compile(r"\bR\s*&\s*D\b", re.IGNORECASE),  # R&D / R & D
        re.compile(r"\bR\s*/\s*D\b", re.IGNORECASE),  # R/D
        re.compile(r"\b(?:research\s+and\s+development)\b", re.IGNORECASE),
        re.compile(
            r"\b(?:section|exhibit|part|room|schedule|form|option|appendix|phase|plan|tier|grade|type|class|group|category|model|version|track|band|level|series)\s+R\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\bR\s+(?:tier|grade|class|type|level|rating|band|series|section|form|phase|plan)\b",
            re.IGNORECASE,
        ),
        re.compile(r"\bR\.\s+[A-Z][a-z]+"),  # Name initial: R. Smith
    ],
    "C": [
        re.compile(r"\bC\s*&\s*C\b", re.IGNORECASE),
        re.compile(r"\bvitamin\s+c\b", re.IGNORECASE),
        re.compile(
            r"\b(?:section|exhibit|part|room|schedule|form|option|appendix|phase|plan|tier|grade|type|class|group|category|model|version|track|band|level|series)\s+C\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\bC\s+(?:tier|grade|class|type|level|rating|band|series|section|form|phase|plan|suite)\b",
            re.IGNORECASE,
        ),
        re.compile(r"\bC\.\s+[A-Z][a-z]+"),  # Name initial: C. Vance
    ],
}

# Contextual phrases confirming legitimate technology skills
SKILL_CONTEXT_PATTERNS: Dict[str, List[re.Pattern]] = {
    "R": [
        re.compile(
            r"\bR\s+(?:programming|language|scripting|script|code|studio|shiny|packages?|stats?|statistical|developer|development|engineer)\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:programming|language|coding|development|experience)\s+(?:in|with)\s+R\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:r\s*(?:/|,|and|or)\s*python|python\s*(?:/|,|and|or)\s*r)\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:r\s*(?:/|,|and|or)\s*sql|sql\s*(?:/|,|and|or)\s*r)\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:r\s*(?:/|,|and|or)\s*sas|sas\s*(?:/|,|and|or)\s*r)\b",
            re.IGNORECASE,
        ),
    ],
    "C": [
        re.compile(
            r"\bC\s+(?:programming|language|code|compiler|developer|development|engineer)\b",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:programming|language|coding|development)\s+(?:in|with)\s+C\b",
            re.IGNORECASE,
        ),
        re.compile(r"\b(?:embedded\s+c|ansi\s+c)\b", re.IGNORECASE),
        re.compile(
            r"\b(?:c\s*/\s*c\+\+|c\s+or\s+c\+\+|c\s+and\s+c\+\+|c\s*/\s*linux)\b",
            re.IGNORECASE,
        ),
    ],
}

# Co-occurring domain tools and keywords that provide supporting context
SKILL_COOCCURRENCE_KEYWORDS: Dict[str, Set[str]] = {
    "R": {
        "python", "sql", "sas", "spss", "matlab", "stata", "julia",
        "pandas", "numpy", "scipy", "statistics", "statistical",
        "data analysis", "data science", "biostatistics", "bioinformatics",
        "analytics", "machine learning", "ggplot", "ggplot2", "tidyverse",
        "dplyr", "cran", "rstudio", "shiny", "bioconductor",
    },
    "C": {
        "c++", "cpp", "assembly", "linux", "embedded", "kernel",
        "microcontroller", "rtos", "firmware", "operating systems",
        "systems programming", "device driver", "pointers", "memory management",
        "algorithms", "data structures", "rust",
    },
}


def is_ordinary_prose_single_letter(
    name: str, raw_text: str, char_start: int, char_end: int
) -> bool:
    """Determine if a single-letter occurrence is ordinary prose rather than a technology skill."""
    if len(name) == 1 and name not in ALLOWLISTED_SINGLE_LETTER_TECH:
        return True

    # Check outline bullet / list prefix or parenthetical
    line_start = raw_text.rfind("\n", 0, char_start)
    line_start = 0 if line_start == -1 else line_start + 1
    line_end = raw_text.find("\n", char_end)
    line_end = len(raw_text) if line_end == -1 else line_end

    prefix = raw_text[line_start:char_start].strip()
    rest_of_line = raw_text[char_end:line_end]

    # Check outline bullet markers like "R. " or "- R. " or "R) "
    if rest_of_line.startswith((". ", ".\t", ") ", ")\t")):
        if prefix in ("", "-", "*", "•") or re.match(r"^[-*•]?\s*$", prefix):
            return True

    # Check parenthetical like "(R)" or "(C)"
    if char_start > 0 and char_end < len(raw_text):
        if raw_text[char_start - 1] == "(" and raw_text[char_end] == ")":
            return True

    # Check surrounding window for false-positive phrases (e.g. R&D, Vitamin C, Section R)
    window_start = max(0, char_start - 40)
    window_end = min(len(raw_text), char_end + 40)
    window = raw_text[window_start:window_end]

    patterns = PROSE_FALSE_POSITIVE_PATTERNS.get(name, [])
    for pat in patterns:
        if pat.search(window):
            return True

    return False


def has_single_letter_skill_context(
    name: str, raw_text: str, char_start: int, char_end: int, section_type: str = ""
) -> bool:
    """Determine if a single-letter skill has sufficient confirming context in surrounding text."""
    if name not in ALLOWLISTED_SINGLE_LETTER_TECH:
        return False

    line_start = raw_text.rfind("\n", 0, char_start)
    line_start = 0 if line_start == -1 else line_start + 1
    line_end = raw_text.find("\n", char_end)
    line_end = len(raw_text) if line_end == -1 else line_end
    line_text = raw_text[line_start:line_end]

    # Expanded window around match
    window_start = max(0, char_start - 120)
    window_end = min(len(raw_text), char_end + 120)
    window = raw_text[window_start:window_end]

    # 1. Direct explicit phrases in the line or window
    for pat in SKILL_CONTEXT_PATTERNS.get(name, []):
        if pat.search(line_text) or pat.search(window):
            return True

    # 2. Check for technical listing headers on the line (e.g. "Languages: Python, R")
    if re.search(
        r"\b(?:languages?|programming\s+languages?|tech\s+stack|technologies|skills)\s*:\s*",
        line_text,
        re.IGNORECASE,
    ):
        if re.search(
            r"(?:,\s*|\/\s*)\b" + re.escape(name) + r"\b|\b" + re.escape(name) + r"\b\s*(?:,\s*|\/\s*)",
            line_text,
        ):
            return True

    # 3. Co-occurrence with related domain tools on the same line or in window
    lower_line = line_text.lower()
    cooccur_words = SKILL_COOCCURRENCE_KEYWORDS.get(name, set())
    for kw in cooccur_words:
        if kw in lower_line:
            return True

    return False
