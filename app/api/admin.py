from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User
from app.services.seed_service import SeedService

router = APIRouter()

@router.post("/seed-demo")
async def seed_demo(
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await SeedService.seed_demo(db)
