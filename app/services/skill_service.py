from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
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
    async def seed_skills(db: AsyncSession, names: list[str]) -> dict:
        normalized_names = [normalize_skill_name(name) for name in names if name.strip()]
        if not normalized_names:
            return {"created": 0, "skipped": 0}

        result = await db.execute(
            select(Skill.normalized_name).where(Skill.normalized_name.in_(normalized_names))
        )
        existing = {row[0] for row in result.all()}

        to_create = []
        for name, normalized in zip(names, normalized_names):
            if normalized in existing:
                continue
            to_create.append(Skill(name=name.strip(), normalized_name=normalized))
            existing.add(normalized)

        if to_create:
            db.add_all(to_create)
            await db.commit()

        return {"created": len(to_create), "skipped": len(names) - len(to_create)}

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
        result = await db.execute(
            select(UserSkill)
            .options(selectinload(UserSkill.skill))
            .where(
                UserSkill.user_id == user_id,
                UserSkill.skill_id == skill_id,
            )
        )
        return result.scalar_one()

    @staticmethod
    async def get_user_skills(db: AsyncSession, user_id: int):
        result = await db.execute(
            select(UserSkill)
            .options(selectinload(UserSkill.skill))
            .where(UserSkill.user_id == user_id)
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
