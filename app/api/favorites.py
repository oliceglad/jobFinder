from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User, FavoriteVacancy
from app.schemas.favorite import FavoriteVacancyOut

router = APIRouter()

@router.post("/{vacancy_id}", response_model=FavoriteVacancyOut)
async def add_favorite(
    vacancy_id: int,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FavoriteVacancy).where(
            FavoriteVacancy.user_id == current_user.id,
            FavoriteVacancy.vacancy_id == vacancy_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if favorite:
        return favorite

    favorite = FavoriteVacancy(user_id=current_user.id, vacancy_id=vacancy_id)
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)
    return favorite

@router.get("/", response_model=list[FavoriteVacancyOut])
async def list_favorites(
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FavoriteVacancy).where(FavoriteVacancy.user_id == current_user.id)
    )
    return result.scalars().all()

@router.delete("/{vacancy_id}")
async def remove_favorite(
    vacancy_id: int,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FavoriteVacancy).where(
            FavoriteVacancy.user_id == current_user.id,
            FavoriteVacancy.vacancy_id == vacancy_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")

    await db.delete(favorite)
    await db.commit()
    return {"status": "deleted"}
