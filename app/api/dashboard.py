from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models import ApplicationStatus, Profile, RecommendationCache, User, UserSkill
from app.schemas.dashboard import DashboardMetrics, ProfileCompletion

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    current_user: User = Depends(require_roles("seeker", "employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.utcnow().date()
    start = today - timedelta(days=6)
    dates = [start + timedelta(days=idx) for idx in range(7)]

    rec_counts = {day: 0 for day in dates}
    rec_rows = await db.execute(
        select(func.date(RecommendationCache.created_at), func.count())
        .where(
            RecommendationCache.user_id == current_user.id,
            RecommendationCache.created_at >= start,
        )
        .group_by(func.date(RecommendationCache.created_at))
    )
    for day, count in rec_rows.all():
        if day in rec_counts:
            rec_counts[day] = count
    recommendation_trend = [rec_counts[day] for day in dates]

    application_rows = await db.execute(
        select(func.date(ApplicationStatus.updated_at), func.count())
        .where(
            ApplicationStatus.user_id == current_user.id,
            ApplicationStatus.updated_at >= start,
        )
        .group_by(func.date(ApplicationStatus.updated_at))
    )
    application_by_date = {day: count for day, count in application_rows.all()}
    application_rhythm = [0] * 7
    for day in dates:
        count = application_by_date.get(day, 0)
        application_rhythm[day.weekday()] += count

    profile_result = await db.execute(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    profile_fields = [
        profile.full_name if profile else None,
        profile.city if profile else None,
        profile.about if profile else None,
        profile.keywords if profile else None,
        profile.avatar_thumb_url if profile else None,
    ]
    filled = len([field for field in profile_fields if field])
    total = len(profile_fields)
    score = round((filled / total) * 100) if total else 0
    profile_completion = ProfileCompletion(filled=filled, total=total, score=score)

    skill_count_result = await db.execute(
        select(func.count()).select_from(UserSkill).where(UserSkill.user_id == current_user.id)
    )
    skill_count = skill_count_result.scalar_one() or 0
    rec_total = sum(recommendation_trend)
    match_score = 0
    if skill_count:
        match_score = min(100, round((rec_total / skill_count) * 100))

    return DashboardMetrics(
        recommendation_trend=recommendation_trend,
        application_rhythm=application_rhythm,
        profile_completion=profile_completion,
        match_score=match_score,
    )
