from sqlalchemy import ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.models.base import Base

class FavoriteVacancy(Base):
    __tablename__ = "favorite_vacancies"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="favorite_vacancies", lazy="selectin")
    vacancy: Mapped["Vacancy"] = relationship(lazy="selectin")
