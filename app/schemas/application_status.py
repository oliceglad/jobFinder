from datetime import datetime
from typing import Literal
from pydantic import BaseModel

ApplicationStatusType = Literal["applied", "interview", "offer", "rejected"]

class ApplicationStatusCreate(BaseModel):
    vacancy_id: int
    status: ApplicationStatusType
    notes: str | None = None

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatusType | None = None
    notes: str | None = None

class ApplicationStatusOut(BaseModel):
    id: int
    vacancy_id: int
    status: ApplicationStatusType
    notes: str | None = None
    updated_at: datetime

    class Config:
        from_attributes = True
