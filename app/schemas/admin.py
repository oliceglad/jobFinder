from datetime import datetime
from pydantic import BaseModel


class AdminStatsOut(BaseModel):
    users_total: int
    users_active: int
    users_banned: int
    seekers_total: int
    employers_total: int
    vacancies_total: int
    vacancies_pending: int
    vacancies_approved: int
    vacancies_rejected: int
    applications_total: int


class AdminUserOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    is_active: bool


class VacancyModerationOut(BaseModel):
    id: int
    title: str
    company: str | None = None
    city: str | None = None
    source: str
    moderation_status: str
    created_by_user_id: int | None = None

    class Config:
        from_attributes = True


class VacancyModerationUpdate(BaseModel):
    moderation_status: str
    note: str | None = None


class VacancyModerationLogOut(BaseModel):
    id: int
    vacancy_id: int
    vacancy_title: str | None = None
    admin_id: int
    admin_email: str | None = None
    from_status: str
    to_status: str
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
