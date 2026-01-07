from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Skill, UserSkill
from app.utils.text_normalizer import normalize_skill_name

class SkillService:

    @staticmethod
    async def create_skill(db: AsyncSession, name: str) -> Skill:
        normalized = normalize_skill_name(name)

        result = await db.execute(
            select(Skill).where(Skill.normalized_name == normalized)
        )
        skill = result.scalar_one_or_none()

        if skill:
            return skill

        skill = Skill(name=name, normalized_name=normalized)
        db.add(skill)
        await db.commit()
        await db.refresh(skill)
        return skill

    @staticmethod
    async def get_all_skills(db: AsyncSession):
        result = await db.execute(select(Skill))
        return result.scalars().all()

    @staticmethod
    async def add_skill_to_user(
        db: AsyncSession,
        user_id: int,
        skill_id: int,
        level: int | None = None
    ):
        user_skill = UserSkill(
            user_id=user_id,
            skill_id=skill_id,
            level=level
        )
        db.add(user_skill)
        await db.commit()
        return user_skill

    @staticmethod
    async def get_user_skills(db: AsyncSession, user_id: int):
        result = await db.execute(
            select(UserSkill).where(UserSkill.user_id == user_id)
        )
        return result.scalars().all()

    @staticmethod
    async def remove_user_skill(db: AsyncSession, user_id: int, skill_id: int):
        result = await db.execute(
            select(UserSkill)
            .where(UserSkill.user_id == user_id)
            .where(UserSkill.skill_id == skill_id)
        )
        user_skill = result.scalar_one_or_none()

        if user_skill:
            await db.delete(user_skill)
            await db.commit()
