"""Job description parser package."""
from app.services.job_parser.extractor import JobExtractor
from app.services.job_parser.validator import JobValidator

__all__ = ["JobExtractor", "JobValidator"]
