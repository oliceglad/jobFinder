from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Profile

class ProfileService:

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: int) -> Profile | None:
        result = await db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_or_update(db: AsyncSession, user_id: int, data: dict) -> Profile:
        profile = await ProfileService.get_by_user_id(db, user_id)
        if profile:
            for key, value in data.items():
                setattr(profile, key, value)
        else:
            profile = Profile(user_id=user_id, **data)
            db.add(profile)

        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def set_avatar(
        db: AsyncSession,
        user_id: int,
        avatar_url: str,
        avatar_thumb_url: str | None = None,
    ) -> Profile:
        profile = await ProfileService.get_by_user_id(db, user_id)
        if profile:
            profile.avatar_url = avatar_url
            profile.avatar_thumb_url = avatar_thumb_url
        else:
            profile = Profile(
                user_id=user_id,
                avatar_url=avatar_url,
                avatar_thumb_url=avatar_thumb_url,
            )
            db.add(profile)

        await db.commit()
        await db.refresh(profile)
        return profile
