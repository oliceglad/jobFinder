from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User, ApplicationStatus, Vacancy, Profile
from app.schemas.application_status import (
    ApplicationStatusCreate,
    ApplicationStatusUpdate,
    ApplicationStatusOut,
    ApplicationIncomingOut,
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

@router.get("/incoming", response_model=list[ApplicationIncomingOut])
async def list_incoming_applications(
    current_user: User = Depends(require_roles("employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ApplicationStatus, Vacancy, User, Profile)
        .join(Vacancy, Vacancy.id == ApplicationStatus.vacancy_id)
        .join(User, User.id == ApplicationStatus.user_id)
        .outerjoin(Profile, Profile.user_id == User.id)
    )
    if current_user.role != "admin":
        query = query.where(Vacancy.created_by_user_id == current_user.id)

    result = await db.execute(query)
    rows = result.all()
    response: list[ApplicationIncomingOut] = []
    for row in rows:
        status_row = row.ApplicationStatus
        vacancy = row.Vacancy
        seeker = row.User
        profile = row.Profile
        response.append(
            ApplicationIncomingOut(
                id=status_row.id,
                vacancy_id=status_row.vacancy_id,
                vacancy_title=vacancy.title if vacancy else None,
                vacancy_company=vacancy.company if vacancy else None,
                status=status_row.status,
                notes=status_row.notes,
                updated_at=status_row.updated_at,
                contact_name=status_row.contact_name,
                contact_email=status_row.contact_email,
                contact_phone=status_row.contact_phone,
                seeker_id=seeker.id,
                seeker_email=seeker.email,
                seeker_name=profile.full_name if profile else None,
                seeker_phone=profile.contact_phone if profile else None,
            )
        )
    return response

@router.patch("/{status_id}", response_model=ApplicationStatusOut)
async def update_application_status(
    status_id: int,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_roles("seeker", "employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApplicationStatus, Vacancy)
        .join(Vacancy, Vacancy.id == ApplicationStatus.vacancy_id)
        .where(ApplicationStatus.id == status_id)
    )
    row = result.first()
    status_row = row.ApplicationStatus if row else None
    vacancy = row.Vacancy if row else None
    if not status_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")

    if current_user.role == "seeker":
        if status_row.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if data.status is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Status updates are employer-only")
        update_data = data.dict(exclude_unset=True, exclude={"status", "contact_name", "contact_email", "contact_phone"})
    else:
        if current_user.role == "admin":
            update_data = data.dict(exclude_unset=True)
        else:
            if vacancy is None or vacancy.created_by_user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
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
