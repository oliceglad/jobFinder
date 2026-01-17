from datetime import datetime
from typing import Literal
from pydantic import BaseModel

ApplicationStatusType = Literal["applied", "interview", "offer", "rejected", "success"]

class ApplicationStatusCreate(BaseModel):
    vacancy_id: int
    status: ApplicationStatusType
    notes: str | None = None

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatusType | None = None
    notes: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None

class ApplicationStatusOut(BaseModel):
    id: int
    vacancy_id: int
    status: ApplicationStatusType
    notes: str | None = None
    updated_at: datetime
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None

    class Config:
        from_attributes = True


class ApplicationIncomingOut(BaseModel):
    id: int
    vacancy_id: int
    vacancy_title: str | None = None
    vacancy_company: str | None = None
    status: ApplicationStatusType
    notes: str | None = None
    updated_at: datetime
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    seeker_id: int
    seeker_email: str
    seeker_name: str | None = None
    seeker_phone: str | None = None

    class Config:
        from_attributes = True
