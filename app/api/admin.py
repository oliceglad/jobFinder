from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.deps import require_roles
from app.models import User, Vacancy, ApplicationStatus, VacancyModerationLog
from app.schemas.admin import (
    AdminStatsOut,
    AdminUserOut,
    AdminUserUpdate,
    VacancyModerationOut,
    VacancyModerationUpdate,
    VacancyModerationLogOut,
)
from app.services.seed_service import SeedService

router = APIRouter()

@router.post("/seed-demo")
async def seed_demo(
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await SeedService.seed_demo(db)


@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    users_total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    users_active = (await db.execute(select(func.count()).select_from(User).where(User.is_active.is_(True)))).scalar_one()
    users_banned = users_total - users_active
    seekers_total = (await db.execute(select(func.count()).select_from(User).where(User.role == "seeker"))).scalar_one()
    employers_total = (await db.execute(select(func.count()).select_from(User).where(User.role == "employer"))).scalar_one()

    vacancies_total = (await db.execute(select(func.count()).select_from(Vacancy))).scalar_one()
    vacancies_pending = (await db.execute(select(func.count()).select_from(Vacancy).where(Vacancy.moderation_status == "pending"))).scalar_one()
    vacancies_approved = (await db.execute(select(func.count()).select_from(Vacancy).where(Vacancy.moderation_status == "approved"))).scalar_one()
    vacancies_rejected = (await db.execute(select(func.count()).select_from(Vacancy).where(Vacancy.moderation_status == "rejected"))).scalar_one()

    applications_total = (await db.execute(select(func.count()).select_from(ApplicationStatus))).scalar_one()

    return AdminStatsOut(
        users_total=users_total,
        users_active=users_active,
        users_banned=users_banned,
        seekers_total=seekers_total,
        employers_total=employers_total,
        vacancies_total=vacancies_total,
        vacancies_pending=vacancies_pending,
        vacancies_approved=vacancies_approved,
        vacancies_rejected=vacancies_rejected,
        applications_total=applications_total,
    )


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user_status(
    user_id: int,
    payload: AdminUserUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/vacancies", response_model=list[VacancyModerationOut])
async def list_vacancies(
    status: str | None = None,
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Vacancy).order_by(Vacancy.created_at.desc())
    if status:
        query = query.where(Vacancy.moderation_status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/vacancies/{vacancy_id}", response_model=VacancyModerationOut)
async def moderate_vacancy(
    vacancy_id: int,
    payload: VacancyModerationUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vacancy).where(Vacancy.id == vacancy_id))
    vacancy = result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    previous_status = vacancy.moderation_status
    vacancy.moderation_status = payload.moderation_status
    db.add(
        VacancyModerationLog(
            vacancy_id=vacancy.id,
            admin_id=current_user.id,
            from_status=previous_status,
            to_status=payload.moderation_status,
            note=payload.note,
        )
    )
    await db.commit()
    await db.refresh(vacancy)
    return vacancy


@router.get("/moderation/logs", response_model=list[VacancyModerationLogOut])
async def moderation_logs(
    vacancy_id: int | None = None,
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(VacancyModerationLog, Vacancy, User)
        .join(Vacancy, Vacancy.id == VacancyModerationLog.vacancy_id)
        .join(User, User.id == VacancyModerationLog.admin_id)
        .order_by(VacancyModerationLog.created_at.desc())
    )
    if vacancy_id:
        query = query.where(VacancyModerationLog.vacancy_id == vacancy_id)
    result = await db.execute(query)
    rows = result.all()
    response: list[VacancyModerationLogOut] = []
    for row in rows:
        log = row.VacancyModerationLog
        vacancy = row.Vacancy
        admin_user = row.User
        response.append(
            VacancyModerationLogOut(
                id=log.id,
                vacancy_id=log.vacancy_id,
                vacancy_title=vacancy.title if vacancy else None,
                admin_id=log.admin_id,
                admin_email=admin_user.email if admin_user else None,
                from_status=log.from_status,
                to_status=log.to_status,
                note=log.note,
                created_at=log.created_at,
            )
        )
    return response


@router.get("/moderation/logs/export")
async def export_moderation_logs(
    current_user: User = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VacancyModerationLog, Vacancy, User)
        .join(Vacancy, Vacancy.id == VacancyModerationLog.vacancy_id)
        .join(User, User.id == VacancyModerationLog.admin_id)
        .order_by(VacancyModerationLog.created_at.desc())
    )
    rows = result.all()
    lines = [
        "id,vacancy_id,vacancy_title,admin_id,admin_email,from_status,to_status,note,created_at"
    ]
    for row in rows:
        log = row.VacancyModerationLog
        vacancy = row.Vacancy
        admin_user = row.User
        note = (log.note or "").replace("\n", " ").replace(",", " ")
        title = (vacancy.title if vacancy else "").replace("\n", " ").replace(",", " ")
        lines.append(
            f"{log.id},{log.vacancy_id},{title},{log.admin_id},{admin_user.email if admin_user else ''},"
            f"{log.from_status},{log.to_status},{note},{log.created_at.isoformat()}"
        )
    content = "\n".join(lines)
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=moderation_logs.csv"},
    )
