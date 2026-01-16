from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

class UserSkill(Base):
    __tablename__ = "user_skills"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), primary_key=True)
    level: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="skills", lazy="selectin")
    skill: Mapped["Skill"] = relationship(back_populates="users", lazy="selectin")
