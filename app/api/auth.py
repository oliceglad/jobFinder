from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.user import UserCreate, Token, UserOut
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models import User

router = APIRouter()

@router.post("/register", response_model=UserOut)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.register(db, data.email, data.password, data.role)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # OAuth2PasswordRequestForm uses "username" field; treat it as email.
    token = await AuthService.login(db, form_data.username, form_data.password)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user),
):
    return current_user
