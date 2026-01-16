from sqlalchemy.ext.asyncio import AsyncSession
import logging
from sqlalchemy import select, delete
from datetime import datetime

from app.models import (
    Vacancy,
    VacancySkill,
    UserSkill,
    Skill,
    Profile,
    RecommendationCache,
)
from app.core.database import AsyncSessionLocal

from app.services.tfidf_service import TFIDFService
from app.services.embedding_service import EmbeddingService
from app.utils.text_builder import (
    build_user_profile_text,
    build_vacancy_text,
)


class RecommendationService:
    """
    Гибридная рекомендательная система:
    - rule-based (совпадение навыков)
    - TF-IDF (частотная семантика)
    - embeddings (семантическое сходство)
    """

    RULE_WEIGHT = 0.4
    TFIDF_WEIGHT = 0.3
    EMBEDDING_WEIGHT = 0.3
    RECENCY_WEIGHT = 0.1

    @staticmethod
    async def recommend_for_user(
        db: AsyncSession,
        user_id: int,
        limit: int = 10,
    ):
        # -------------------------------------------------
        # 1. Получаем навыки пользователя и профиль
        # -------------------------------------------------
        result = await db.execute(
            select(UserSkill, Skill)
            .join(Skill, Skill.id == UserSkill.skill_id)
            .where(UserSkill.user_id == user_id)
        )
        user_skill_rows = result.all()
        user_skill_ids = {row.Skill.id for row in user_skill_rows}
        user_skill_names = [row.Skill.name for row in user_skill_rows]

        result = await db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        # -------------------------------------------------
        # 2. Получаем все вакансии
        # -------------------------------------------------
        result = await db.execute(select(Vacancy))
        vacancies = result.scalars().all()

        if not vacancies:
            return []

        # -------------------------------------------------
        # 3. Подготовка текстов для ML
        # -------------------------------------------------
        user_text = build_user_profile_text(
            user_skill_names,
            keywords=profile.keywords if profile else None,
            about=profile.about if profile else None,
        )
        if not user_text.strip():
            return []

        vacancy_texts = [
            build_vacancy_text(
                v.title,
                v.description,
                requirements=v.requirements,
                responsibilities=v.responsibilities,
                company=v.company,
            )
            for v in vacancies
        ]

        # -------------------------------------------------
        # 4. TF-IDF similarity
        # -------------------------------------------------
        tfidf_service = TFIDFService()
        tfidf_scores = tfidf_service.compute_similarity(
            user_text=user_text,
            vacancies_texts=vacancy_texts,
        )

        # -------------------------------------------------
        # 5. Embedding similarity
        # -------------------------------------------------
        embedding_scores = EmbeddingService.compute_similarity(
            user_text=user_text,
            vacancies_texts=vacancy_texts,
        )

        # -------------------------------------------------
        # 6. Rule-based + гибридный скоринг
        # -------------------------------------------------
        recommendations = []

        vacancy_ids = [v.id for v in vacancies]
        result = await db.execute(
            select(VacancySkill).where(VacancySkill.vacancy_id.in_(vacancy_ids))
        )
        vacancy_skills_rows = result.scalars().all()
        vacancy_skills_map: dict[int, list[VacancySkill]] = {}
        for vs in vacancy_skills_rows:
            vacancy_skills_map.setdefault(vs.vacancy_id, []).append(vs)

        for vacancy, tfidf_score, embed_score in zip(
            vacancies, tfidf_scores, embedding_scores
        ):
            vacancy_skills = vacancy_skills_map.get(vacancy.id, [])

            # Rule-based score
            rule_score = 0.0
            if vacancy_skills and user_skill_ids:
                total_weight = sum(
                    vs.weight if vs.weight is not None else 1.0
                    for vs in vacancy_skills
                )

                matched_weight = sum(
                    (vs.weight if vs.weight is not None else 1.0)
                    for vs in vacancy_skills
                    if vs.skill_id in user_skill_ids
                )

                rule_score = (
                    matched_weight / total_weight
                    if total_weight > 0
                    else 0.0
                )

            recency_score = 0.0
            if vacancy.published_at:
                days_ago = (datetime.utcnow() - vacancy.published_at).days
                recency_score = max(0.0, 1.0 - (days_ago / 30))

            # Финальный гибридный скор
            final_score = round(
                self_or_static := (
                    RecommendationService.RULE_WEIGHT * rule_score
                    + RecommendationService.TFIDF_WEIGHT * tfidf_score
                    + RecommendationService.EMBEDDING_WEIGHT * embed_score
                    + RecommendationService.RECENCY_WEIGHT * recency_score
                ),
                3,
            )

            if final_score > 0:
                recommendations.append(
                    {
                        "vacancy": vacancy,
                        "score": final_score,
                        "rule_score": round(rule_score, 3),
                        "tfidf_score": round(tfidf_score, 3),
                        "embedding_score": round(embed_score, 3),
                    }
                )

        # -------------------------------------------------
        # 7. Сортировка и лимит
        # -------------------------------------------------
        recommendations.sort(
            key=lambda x: x["score"],
            reverse=True,
        )

        return recommendations[:limit]

    @staticmethod
    async def refresh_cache(
        db: AsyncSession,
        user_id: int,
        limit: int = 10,
    ) -> None:
        recommendations = await RecommendationService.recommend_for_user(
            db=db,
            user_id=user_id,
            limit=limit,
        )
        await db.execute(
            delete(RecommendationCache).where(RecommendationCache.user_id == user_id)
        )
        for item in recommendations:
            db.add(
                RecommendationCache(
                    user_id=user_id,
                    vacancy_id=item["vacancy"].id,
                    score=item["score"],
                )
            )
        await db.commit()

    @staticmethod
    async def refresh_cache_for_user(
        user_id: int,
        limit: int = 10,
    ) -> None:
        try:
            async with AsyncSessionLocal() as session:
                await RecommendationService.refresh_cache(session, user_id, limit)
        except Exception:
            logging.exception("Recommendation refresh failed")

    @staticmethod
    async def get_cached(
        db: AsyncSession,
        user_id: int,
        limit: int = 10,
    ):
        result = await db.execute(
            select(RecommendationCache, Vacancy)
            .join(Vacancy, Vacancy.id == RecommendationCache.vacancy_id)
            .where(RecommendationCache.user_id == user_id)
            .order_by(RecommendationCache.score.desc())
            .limit(limit)
        )
        return result.all()
