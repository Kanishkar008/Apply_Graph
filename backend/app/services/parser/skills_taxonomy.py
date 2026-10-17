"""Curated skills taxonomy with regex patterns and categories.

Enforces strict token boundaries to avoid false positives (e.g., 'Go' vs 'Good',
'Java' vs 'JavaScript', 'C' vs 'Cat').
"""

import re
from typing import Dict, List, Tuple

# Canonical name -> (category, list of regex patterns)
SKILLS_TAXONOMY: Dict[str, Tuple[str, List[re.Pattern]]] = {
    # Programming Languages
    "Python": ("language", [re.compile(r"\bpython(?:3)?\b", re.IGNORECASE)]),
    "JavaScript": ("language", [re.compile(r"\bjavascript\b|\bjs\b", re.IGNORECASE)]),
    "TypeScript": ("language", [re.compile(r"\btypescript\b|\bts\b", re.IGNORECASE)]),
    "Java": ("language", [re.compile(r"\bjava\b(?!script)", re.IGNORECASE)]),
    "C++": ("language", [re.compile(r"(?<!\w)c\+\+(?!\w)", re.IGNORECASE)]),
    "C#": ("language", [re.compile(r"(?<!\w)c#(?!\w)", re.IGNORECASE)]),
    "C": ("language", [re.compile(r"(?<![a-zA-Z0-9_+#])C(?![a-zA-Z0-9_+#])")]),  # Case sensitive 'C'
    "Go": ("language", [re.compile(r"\bgolang\b", re.IGNORECASE), re.compile(r"\bGo\b")]),  # 'Go' case-sensitive or 'golang'
    "Rust": ("language", [re.compile(r"\brust\b", re.IGNORECASE)]),
    "Ruby": ("language", [re.compile(r"\bruby\b", re.IGNORECASE)]),
    "PHP": ("language", [re.compile(r"\bphp\b", re.IGNORECASE)]),
    "Swift": ("language", [re.compile(r"\bswift\b", re.IGNORECASE)]),
    "Kotlin": ("language", [re.compile(r"\bkotlin\b", re.IGNORECASE)]),
    "Scala": ("language", [re.compile(r"\bscala\b", re.IGNORECASE)]),
    "R": ("language", [re.compile(r"(?<![a-zA-Z0-9_])R(?![a-zA-Z0-9_])")]),  # Case-sensitive standalone R
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
