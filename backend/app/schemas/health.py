from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    connected: bool = Field(..., description="Whether database connection succeeded")
    details: Optional[str] = Field(None, description="Diagnostic message or error snippet")


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    service: str = Field(..., examples=["ApplyGraph API"])
    version: str = Field(..., examples=["0.1.0"])
    environment: str = Field(..., examples=["development"])
    timestamp: datetime = Field(..., description="Current server time (ISO 8601)")
    database: DatabaseHealth
