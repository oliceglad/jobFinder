from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, UserOut
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/register", response_model=UserOut)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.register(db, data.email, data.password)


@router.post("/login", response_model=Token)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    token = await AuthService.login(db, data.email, data.password)
    return {"access_token": token}
