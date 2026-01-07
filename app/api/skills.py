from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.skill import (
    SkillCreate,
    SkillOut,
    UserSkillCreate,
    UserSkillOut
)
from app.services.skill_service import SkillService

from app.api.deps import get_current_user
from app.models import User


router = APIRouter()

@router.post("/user")
async def add_skill_to_user(
    data: UserSkillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.add_skill_to_user(
        db=db,
        user_id=current_user.id,
        skill_id=data.skill_id,
        level=data.level
    )

@router.post("/", response_model=SkillOut)
async def create_skill(
    data: SkillCreate,
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.create_skill(db, data.name)


@router.get("/", response_model=list[SkillOut])
async def get_skills(
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.get_all_skills(db)


@router.post("/user", response_model=UserSkillOut)
async def add_skill_to_user(
    data: UserSkillCreate,
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.add_skill_to_user(
        db=db,
        user_id=FAKE_USER_ID,
        skill_id=data.skill_id,
        level=data.level
    )


@router.get("/user", response_model=list[UserSkillOut])
async def get_user_skills(
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.get_user_skills(db, FAKE_USER_ID)


@router.delete("/user/{skill_id}")
async def delete_user_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db)
):
    await SkillService.remove_user_skill(db, FAKE_USER_ID, skill_id)
    return {"status": "deleted"}
