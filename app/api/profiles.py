import asyncio
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileOut
from app.services.profile_service import ProfileService
from app.core.config import settings

router = APIRouter()

@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    profile = await ProfileService.get_by_user_id(db, current_user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile

@router.put("/me", response_model=ProfileOut)
async def upsert_my_profile(
    data: ProfileUpdate,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await ProfileService.create_or_update(db, current_user.id, data.dict(exclude_unset=True))


@router.post("/me/avatar", response_model=ProfileOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")

    media_root = Path(settings.MEDIA_DIR) / "avatars"
    media_root.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")
    filename = f"{current_user.id}_{uuid4().hex}{suffix}"
    file_path = media_root / filename

    size = 0
    max_size = 5 * 1024 * 1024
    with file_path.open("wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_size:
                buffer.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")
            buffer.write(chunk)

    thumb_name = f"{current_user.id}_{uuid4().hex}_thumb{suffix}"
    thumb_path = media_root / thumb_name

    def _make_thumb(src: Path, dest: Path) -> None:
        with Image.open(src) as img:
            img.thumbnail((256, 256))
            img.save(dest)

    try:
        await asyncio.to_thread(_make_thumb, file_path, thumb_path)
    except Exception:
        file_path.unlink(missing_ok=True)
        thumb_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image")

    avatar_url = f"{settings.MEDIA_URL}/avatars/{filename}"
    avatar_thumb_url = f"{settings.MEDIA_URL}/avatars/{thumb_name}"
    return await ProfileService.set_avatar(db, current_user.id, avatar_url, avatar_thumb_url)
