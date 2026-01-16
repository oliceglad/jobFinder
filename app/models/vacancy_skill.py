from sqlalchemy import ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

class VacancySkill(Base):
    __tablename__ = "vacancy_skills"

    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), primary_key=True)

    weight: Mapped[float | None] = mapped_column(Float)  # важность навыка

    vacancy: Mapped["Vacancy"] = relationship(back_populates="skills", lazy="selectin")
    skill: Mapped["Skill"] = relationship(back_populates="vacancies", lazy="selectin")
