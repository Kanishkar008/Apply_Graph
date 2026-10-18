import json
from typing import Any, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings resolved from environment variables and .env files."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "ApplyGraph API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Upload configuration
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB

    # CORS configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v]
        return []

    # Database connection parameters
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "applygraph_db"
    DATABASE_URL: Union[str, None] = None

    @property
    def sync_database_url(self) -> str:
        """Return explicit DATABASE_URL if configured, otherwise build from parts."""
        if self.DATABASE_URL:
            # Ensure standard SQLAlchemy driver prefix for postgres
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Machine Learning / Embedding Model configuration
    MODELS_CACHE_DIR: Union[str, None] = None

    @property
    def model_snapshot_path(self) -> Union[str, None]:
        """Resolve the exact snapshot directory for all-MiniLM-L6-v2."""
        import os
        from pathlib import Path

        # 1. If explicit env variable is set, check it
        candidate_roots = []
        if self.MODELS_CACHE_DIR:
            candidate_roots.append(Path(self.MODELS_CACHE_DIR))

        # 2. Check relative to repository root and backend directory
        backend_dir = Path(__file__).resolve().parent.parent.parent
        repo_root = backend_dir.parent
        candidate_roots.extend([
            repo_root / "models_cache",
            backend_dir / "models_cache",
            Path("models_cache"),
        ])

        model_rel_path = Path("models--sentence-transformers--all-MiniLM-L6-v2") / "snapshots"
        for root in candidate_roots:
            snapshots_dir = root / model_rel_path
            if snapshots_dir.is_dir():
                # Locate snapshot folder containing model.safetensors or config.json
                for snapshot in snapshots_dir.iterdir():
                    if snapshot.is_dir() and (snapshot / "model.safetensors").is_file():
                        return str(snapshot.resolve())

        return None


settings = Settings()
