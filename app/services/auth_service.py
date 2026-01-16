from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models import User
from app.core.security import hash_password, verify_password, create_access_token

class AuthService:

    @staticmethod
    async def register(
        db: AsyncSession,
        email: str,
        password: str,
        role: str | None = None,
    ) -> User:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="User already exists"
            )

        if role not in (None, "seeker", "employer"):
            raise HTTPException(
                status_code=400,
                detail="Invalid role"
            )

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role=role or "seeker",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str):
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        token = create_access_token({"sub": str(user.id)})
        return token
