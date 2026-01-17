from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User, Notification
from app.schemas.notification import NotificationCreate, NotificationOut
from app.services.notification_service import NotificationService
from app.tasks import notify_new_vacancies_task, notify_users_by_role_task

router = APIRouter()

@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    current_user: User = Depends(require_roles("seeker", "employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await NotificationService.list_for_user(db, current_user.id)

@router.post("/read/{notification_id}", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(require_roles("seeker", "employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return await NotificationService.mark_read(db, notification)

@router.post("/broadcast")
async def broadcast_notification(
    payload: NotificationCreate,
    role: str = "seeker",
    current_user: User = Depends(require_roles("admin")),
):
    notify_users_by_role_task.delay(role, payload.title, payload.body)
    return {"status": "queued"}

@router.post("/new-vacancies")
async def notify_new_vacancies(
    hours: int = 24,
    current_user: User = Depends(require_roles("admin")),
):
    notify_new_vacancies_task.delay(hours)
    return {"status": "queued"}
