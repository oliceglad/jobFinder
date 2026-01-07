from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User
from app.services.recommendation_service import RecommendationService
from app.schemas.recommendation import RecommendedVacancy

router = APIRouter()

@router.get("/", response_model=list[RecommendedVacancy])
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recommendations = await RecommendationService.recommend_for_user(
        db=db,
        user_id=current_user.id
    )

    return [
        RecommendedVacancy(
            id=item["vacancy"].id,
            title=item["vacancy"].title,
            company=item["vacancy"].company,
            city=item["vacancy"].city,
            score=item["score"]
        )
        for item in recommendations
    ]
