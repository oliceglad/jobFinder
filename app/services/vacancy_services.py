from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Vacancy, Skill, VacancySkill
from app.utils.text_normalizer import normalize_skill_name

class VacancyService:

    @staticmethod
    async def create_vacancy(
        db: AsyncSession,
        *,
        title: str,
        description: str,
        company: str | None,
        city: str | None,
        salary_from: int | None,
        salary_to: int | None,
        url: str,
        source: str,
        skills: list[str]
    ):
        vacancy = Vacancy(
            title=title,
            description=description,
            company=company,
            city=city,
            salary_from=salary_from,
            salary_to=salary_to,
            url=url,
            source=source
        )
        db.add(vacancy)
        await db.flush()  # получаем vacancy.id

        for skill_name in skills:
            normalized = normalize_skill_name(skill_name)

            result = await db.execute(
                select(Skill).where(Skill.normalized_name == normalized)
            )
            skill = result.scalar_one_or_none()

            if not skill:
                skill = Skill(
                    name=skill_name,
                    normalized_name=normalized
                )
                db.add(skill)
                await db.flush()

            db.add(
                VacancySkill(
                    vacancy_id=vacancy.id,
                    skill_id=skill.id,
                    weight=1.0
                )
            )

        await db.commit()
        return vacancy
