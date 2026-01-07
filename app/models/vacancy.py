from sqlalchemy import String, Text, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.models.base import Base

class Vacancy(Base):
    __tablename__ = "vacancies"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)

    company: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))

    salary_from: Mapped[int | None] = mapped_column(Integer)
    salary_to: Mapped[int | None] = mapped_column(Integer)

    url: Mapped[str] = mapped_column(String(500))
    source: Mapped[str] = mapped_column(String(50))  # hh / avito / superjob

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    skills: Mapped[list["VacancySkill"]] = relationship(back_populates="vacancy")
