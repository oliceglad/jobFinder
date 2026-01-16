from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Vacancy, VacancySkill, Skill
from app.services.skill_service import SkillService
from app.utils.text_normalizer import normalize_skill_name

class VacancyService:

    @staticmethod
    async def create_vacancy(
        db: AsyncSession,
        data: dict,
        created_by_user_id: int | None = None,
    ) -> Vacancy:
        skill_ids = data.pop("skill_ids", None) or []
        vacancy = Vacancy(**data, created_by_user_id=created_by_user_id)
        db.add(vacancy)
        await db.flush()

        if skill_ids:
            for skill_id in skill_ids:
                db.add(VacancySkill(vacancy_id=vacancy.id, skill_id=skill_id, weight=1.0))

        await db.commit()
        await db.refresh(vacancy)
        return vacancy

    @staticmethod
    async def upsert_from_hh(
        db: AsyncSession,
        vacancy_data: dict,
    ) -> Vacancy:
        result = await db.execute(
            select(Vacancy).where(
                Vacancy.source == vacancy_data.get("source"),
                Vacancy.external_id == vacancy_data.get("external_id"),
            )
        )
        vacancy = result.scalar_one_or_none()

        if vacancy:
            for key, value in vacancy_data.items():
                setattr(vacancy, key, value)
        else:
            vacancy = Vacancy(**vacancy_data)
            db.add(vacancy)
            await db.flush()

        await db.commit()
        await db.refresh(vacancy)
        return vacancy

    @staticmethod
    async def attach_skills_by_names(
        db: AsyncSession,
        vacancy: Vacancy,
        skill_names: list[str],
    ) -> None:
        if not skill_names:
            return

        normalized = [normalize_skill_name(name) for name in skill_names]
        result = await db.execute(
            select(Skill).where(Skill.normalized_name.in_(normalized))
        )
        existing_skills = {skill.normalized_name: skill for skill in result.scalars().all()}

        skill_ids: list[int] = []
        for name, normalized_name in zip(skill_names, normalized):
            skill = existing_skills.get(normalized_name)
            if not skill:
                skill = await SkillService.create_skill(db, name)
            skill_ids.append(skill.id)

        for skill_id in set(skill_ids):
            result = await db.execute(
                select(VacancySkill).where(
                    VacancySkill.vacancy_id == vacancy.id,
                    VacancySkill.skill_id == skill_id,
                )
            )
            if result.scalar_one_or_none():
                continue
            db.add(VacancySkill(vacancy_id=vacancy.id, skill_id=skill_id, weight=1.0))

        await db.commit()
