from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    Vacancy,
    VacancySkill,
    UserSkill,
    Skill,
)

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

    RULE_WEIGHT = 0.5
    TFIDF_WEIGHT = 0.3
    EMBEDDING_WEIGHT = 0.2

    @staticmethod
    async def recommend_for_user(
        db: AsyncSession,
        user_id: int,
        limit: int = 10,
    ):
        # -------------------------------------------------
        # 1. Получаем навыки пользователя
        # -------------------------------------------------
        result = await db.execute(
            select(UserSkill, Skill)
            .join(Skill, Skill.id == UserSkill.skill_id)
            .where(UserSkill.user_id == user_id)
        )
        user_skill_rows = result.all()

        if not user_skill_rows:
            return []

        user_skill_ids = {row.Skill.id for row in user_skill_rows}
        user_skill_names = [row.Skill.name for row in user_skill_rows]

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
        user_text = build_user_profile_text(user_skill_names)

        vacancy_texts = [
            build_vacancy_text(v.title, v.description)
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

        for vacancy, tfidf_score, embed_score in zip(
            vacancies, tfidf_scores, embedding_scores
        ):
            # Навыки вакансии
            result = await db.execute(
                select(VacancySkill)
                .where(VacancySkill.vacancy_id == vacancy.id)
            )
            vacancy_skills = result.scalars().all()

            if not vacancy_skills:
                continue

            # Rule-based score
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

            # Финальный гибридный скор
            final_score = round(
                self_or_static := (
                    RecommendationService.RULE_WEIGHT * rule_score
                    + RecommendationService.TFIDF_WEIGHT * tfidf_score
                    + RecommendationService.EMBEDDING_WEIGHT * embed_score
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
