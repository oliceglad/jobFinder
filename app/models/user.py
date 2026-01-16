from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="seeker")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    skills: Mapped[list["UserSkill"]] = relationship(back_populates="user", lazy="selectin")
    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False, lazy="selectin")
    favorite_vacancies: Mapped[list["FavoriteVacancy"]] = relationship(back_populates="user", lazy="selectin")
    applications: Mapped[list["ApplicationStatus"]] = relationship(back_populates="user", lazy="selectin")
    notifications: Mapped[list["Notification"]] = relationship(lazy="selectin")
    vacancy_notifications: Mapped[list["VacancyNotification"]] = relationship(lazy="selectin")
    posted_vacancies: Mapped[list["Vacancy"]] = relationship(back_populates="created_by", lazy="selectin")
