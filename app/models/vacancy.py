from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.models.base import Base

class Vacancy(Base):
    __tablename__ = "vacancies"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_vacancy_source_external"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    requirements: Mapped[str | None] = mapped_column(Text)
    responsibilities: Mapped[str | None] = mapped_column(Text)

    company: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    region: Mapped[str | None] = mapped_column(String(100))
    schedule: Mapped[str | None] = mapped_column(String(100))
    employment: Mapped[str | None] = mapped_column(String(100))
    experience: Mapped[str | None] = mapped_column(String(100))
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)

    salary_from: Mapped[int | None] = mapped_column(Integer)
    salary_to: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str | None] = mapped_column(String(10))

    url: Mapped[str] = mapped_column(String(500))
    source: Mapped[str] = mapped_column(String(50))  # hh / avito / superjob
    parsed_from_hh: Mapped[bool] = mapped_column(Boolean, default=False)
    external_id: Mapped[str | None] = mapped_column(String(100), index=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    skills: Mapped[list["VacancySkill"]] = relationship(back_populates="vacancy", lazy="selectin")
    created_by: Mapped["User"] = relationship(back_populates="posted_vacancies", lazy="selectin")
