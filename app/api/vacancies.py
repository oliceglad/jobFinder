from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Vacancy

router = APIRouter()

@router.get("/")
async def get_vacancies(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Vacancy))
    return result.scalars().all()
