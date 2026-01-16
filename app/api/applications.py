from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User, ApplicationStatus
from app.schemas.application_status import (
    ApplicationStatusCreate,
    ApplicationStatusUpdate,
    ApplicationStatusOut,
)

router = APIRouter()

@router.post("/", response_model=ApplicationStatusOut)
async def create_application_status(
    data: ApplicationStatusCreate,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    status_row = ApplicationStatus(
        user_id=current_user.id,
        vacancy_id=data.vacancy_id,
        status=data.status,
        notes=data.notes,
    )
    db.add(status_row)
    await db.commit()
    await db.refresh(status_row)
    return status_row

@router.get("/", response_model=list[ApplicationStatusOut])
async def list_application_statuses(
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApplicationStatus).where(ApplicationStatus.user_id == current_user.id)
    )
    return result.scalars().all()

@router.patch("/{status_id}", response_model=ApplicationStatusOut)
async def update_application_status(
    status_id: int,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApplicationStatus).where(
            ApplicationStatus.id == status_id,
            ApplicationStatus.user_id == current_user.id,
        )
    )
    status_row = result.scalar_one_or_none()
    if not status_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(status_row, key, value)
    status_row.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(status_row)
    return status_row

@router.delete("/{status_id}")
async def delete_application_status(
    status_id: int,
    current_user: User = Depends(require_roles("seeker", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApplicationStatus).where(
            ApplicationStatus.id == status_id,
            ApplicationStatus.user_id == current_user.id,
        )
    )
    status_row = result.scalar_one_or_none()
    if not status_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")

    await db.delete(status_row)
    await db.commit()
    return {"status": "deleted"}
