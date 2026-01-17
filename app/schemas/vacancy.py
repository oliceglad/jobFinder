from datetime import datetime
from pydantic import BaseModel

class VacancyBase(BaseModel):
    title: str
    description: str
    requirements: str | None = None
    responsibilities: str | None = None
    company: str | None = None
    city: str | None = None
    region: str | None = None
    schedule: str | None = None
    employment: str | None = None
    experience: str | None = None
    is_remote: bool = False
    salary_from: int | None = None
    salary_to: int | None = None
    salary_currency: str | None = None
    url: str
    source: str = "manual"
    parsed_from_hh: bool = False
    external_id: str | None = None
    published_at: datetime | None = None
    moderation_status: str | None = None

class VacancyCreate(VacancyBase):
    skill_ids: list[int] | None = None

class VacancyUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    requirements: str | None = None
    responsibilities: str | None = None
    company: str | None = None
    city: str | None = None
    region: str | None = None
    schedule: str | None = None
    employment: str | None = None
    experience: str | None = None
    is_remote: bool | None = None
    salary_from: int | None = None
    salary_to: int | None = None
    salary_currency: str | None = None
    url: str | None = None
    source: str | None = None
    external_id: str | None = None
    published_at: datetime | None = None
    moderation_status: str | None = None

class VacancyOut(VacancyBase):
    id: int
    created_at: datetime
    created_by_user_id: int | None = None

    class Config:
        from_attributes = True
