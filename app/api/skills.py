from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.skill import (
    SkillCreate,
    SkillOut,
    UserSkillCreate,
    UserSkillOut
)
from app.services.skill_service import SkillService

from app.api.deps import require_roles
from app.models import User


router = APIRouter()

@router.post("/user", response_model=UserSkillOut)
async def add_skill_to_user(
    data: UserSkillCreate,
    current_user: User = Depends(require_roles("seeker", "admin")),
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
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.create_skill(db, data.name)


@router.get("/", response_model=list[SkillOut])
async def get_skills(
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.get_all_skills(db)


@router.post("/seed")
async def seed_skills(
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    seed_path = Path("app/data/skills_seed.txt")
    if not seed_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seed file not found")

    names = [line.strip() for line in seed_path.read_text().splitlines() if line.strip()]
    return await SkillService.seed_skills(db, names)


@router.get("/user", response_model=list[UserSkillOut])
async def get_user_skills(
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db)
):
    return await SkillService.get_user_skills(db, current_user.id)


@router.delete("/user/{skill_id}")
async def delete_user_skill(
    skill_id: int,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db)
):
    await SkillService.remove_user_skill(db, current_user.id, skill_id)
    return {"status": "deleted"}
