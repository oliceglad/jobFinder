from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import require_roles
from app.core.database import get_db
from app.models import User, UserSkill, Skill, Profile
from app.schemas.talent import SeekerOut, SeekerSkillOut, SeekerProfileOut

router = APIRouter()


@router.get("/", response_model=list[SeekerOut])
async def list_seekers(
    skill_ids: list[int] | str | None = None,
    city: str | None = None,
    region: str | None = None,
    q: str | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
    exp_min: int | None = None,
    exp_max: int | None = None,
    current_user: User = Depends(require_roles("employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(User)
        .where(User.role == "seeker")
        .outerjoin(Profile, Profile.user_id == User.id)
        .order_by(User.created_at.desc())
    )
    if current_user.role != "admin":
        query = query.where(User.is_active.is_(True))
    if skill_ids:
        ids = skill_ids
        if isinstance(ids, str):
            ids = [int(item) for item in ids.split(",") if item.isdigit()]
        if ids:
            query = query.join(UserSkill).where(UserSkill.skill_id.in_(ids))
    if city:
        query = query.where(Profile.city.ilike(f"%{city}%"))
    if region:
        query = query.where(Profile.region.ilike(f"%{region}%"))
    if q:
        ilike = f"%{q}%"
        query = query.where(
            Profile.keywords.ilike(ilike)
            | Profile.about.ilike(ilike)
            | Profile.full_name.ilike(ilike)
        )
    if salary_min is not None:
        query = query.where(Profile.desired_salary >= salary_min)
    if salary_max is not None:
        query = query.where(Profile.desired_salary <= salary_max)
    if exp_min is not None:
        query = query.where(Profile.experience_years >= exp_min)
    if exp_max is not None:
        query = query.where(Profile.experience_years <= exp_max)

    result = await db.execute(query)
    users = result.scalars().unique().all()
    if not users:
        return []

    user_ids = [user.id for user in users]
    skills_result = await db.execute(
        select(UserSkill, Skill)
        .join(Skill, Skill.id == UserSkill.skill_id)
        .where(UserSkill.user_id.in_(user_ids))
    )
    skills_by_user: dict[int, list[SeekerSkillOut]] = {}
    for row in skills_result.all():
        skills_by_user.setdefault(row.UserSkill.user_id, []).append(
            SeekerSkillOut(id=row.Skill.id, name=row.Skill.name)
        )

    profile_result = await db.execute(
        select(Profile).where(Profile.user_id.in_(user_ids))
    )
    profiles = {profile.user_id: profile for profile in profile_result.scalars().all()}

    response: list[SeekerOut] = []
    for user in users:
        profile = profiles.get(user.id)
        response.append(
            SeekerOut(
                id=user.id,
                email=user.email,
                skills=skills_by_user.get(user.id, []),
                profile=SeekerProfileOut(
                    full_name=profile.full_name if profile else None,
                    city=profile.city if profile else None,
                    region=profile.region if profile else None,
                    keywords=profile.keywords if profile else None,
                    about=profile.about if profile else None,
                    contact_email=profile.contact_email if profile else None,
                    contact_phone=profile.contact_phone if profile else None,
                )
                if profile
                else None,
            )
        )
    return response
