from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User
from app.services.recommendation_service import RecommendationService
from app.schemas.recommendation import RecommendedVacancy

router = APIRouter()

@router.get("/", response_model=list[RecommendedVacancy])
async def get_recommendations(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("seeker", "admin"))
):
    cached_rows = await RecommendationService.get_cached(
        db=db,
        user_id=current_user.id,
        limit=10,
    )
    if not cached_rows:
        background_tasks.add_task(
            RecommendationService.refresh_cache_for_user,
            current_user.id,
            10,
        )
        return []

    return [
        RecommendedVacancy(
            id=row.Vacancy.id,
            title=row.Vacancy.title,
            company=row.Vacancy.company,
            city=row.Vacancy.city,
            score=row.RecommendationCache.score,
        )
        for row in cached_rows
    ]
