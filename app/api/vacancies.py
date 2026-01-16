from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models import Vacancy, VacancySkill, User
from app.schemas.vacancy import VacancyCreate, VacancyOut, VacancyUpdate
from app.services.vacancy_service import VacancyService
from app.services.hh_service import HHService

router = APIRouter()
DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    if limit < 1:
        limit = DEFAULT_LIMIT
    limit = min(limit, MAX_LIMIT)
    if offset < 0:
        offset = 0
    return limit, offset

@router.get("/", response_model=list[VacancyOut])
async def get_vacancies(
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    limit, offset = _normalize_pagination(limit, offset)
    query = (
        select(Vacancy)
        .order_by(
            Vacancy.published_at.is_(None),
            Vacancy.published_at.desc(),
            Vacancy.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/search", response_model=list[VacancyOut])
async def search_vacancies(
    text: str | None = None,
    city: str | None = None,
    is_remote: bool | None = None,
    salary_from: int | None = None,
    salary_to: int | None = None,
    source: str | None = None,
    published_from: datetime | None = None,
    published_to: datetime | None = None,
    skill_ids: list[int] | None = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Vacancy).distinct()

    if text:
        ilike = f"%{text}%"
        query = query.where(
            or_(
                Vacancy.title.ilike(ilike),
                Vacancy.description.ilike(ilike),
            )
        )

    if city:
        query = query.where(Vacancy.city.ilike(f"%{city}%"))

    if is_remote is not None:
        query = query.where(Vacancy.is_remote == is_remote)

    if salary_from is not None:
        query = query.where(Vacancy.salary_from >= salary_from)

    if salary_to is not None:
        query = query.where(Vacancy.salary_to <= salary_to)

    if source:
        query = query.where(Vacancy.source == source)

    if published_from:
        query = query.where(Vacancy.published_at >= published_from)

    if published_to:
        query = query.where(Vacancy.published_at <= published_to)

    if skill_ids:
        query = query.join(VacancySkill).where(VacancySkill.skill_id.in_(skill_ids))

    limit, offset = _normalize_pagination(limit, offset)
    query = (
        query.order_by(
            Vacancy.published_at.is_(None),
            Vacancy.published_at.desc(),
            Vacancy.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/by-ids", response_model=list[VacancyOut])
async def get_vacancies_by_ids(
    ids: list[int] | None = None,
    db: AsyncSession = Depends(get_db),
):
    if not ids:
        return []
    result = await db.execute(select(Vacancy).where(Vacancy.id.in_(ids)))
    return result.scalars().all()

@router.get("/{vacancy_id}", response_model=VacancyOut)
async def get_vacancy(
    vacancy_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vacancy).where(Vacancy.id == vacancy_id))
    vacancy = result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")
    return vacancy

@router.post("/", response_model=VacancyOut)
async def create_vacancy(
    data: VacancyCreate,
    current_user: User = Depends(require_roles("employer", "admin")),
    db: AsyncSession = Depends(get_db),
):
    payload = data.dict(exclude_unset=True)
    if current_user.role != "admin":
        payload["parsed_from_hh"] = False
        payload["source"] = "manual"
    vacancy = await VacancyService.create_vacancy(
        db=db,
        data=payload,
        created_by_user_id=current_user.id,
    )
    return vacancy

@router.patch("/{vacancy_id}", response_model=VacancyOut)
async def update_vacancy(
    vacancy_id: int,
    data: VacancyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vacancy).where(Vacancy.id == vacancy_id))
    vacancy = result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vacancy not found")

    if current_user.role not in ("admin", "employer") or (
        current_user.role == "employer" and vacancy.created_by_user_id != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vacancy, key, value)

    await db.commit()
    await db.refresh(vacancy)
    return vacancy

@router.post("/parse/hh")
async def parse_hh_vacancies(
    text: str,
    background_tasks: BackgroundTasks,
    area: int | None = None,
    pages: int = 1,
    per_page: int = 20,
    notify: bool = True,
    current_user: User = Depends(require_roles("admin", "seeker")),
    db: AsyncSession = Depends(get_db),
):
    if pages < 1 or pages > 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="pages must be 1..20")
    if current_user.role == "seeker":
        notify = False
        pages = min(pages, 2)
        per_page = min(per_page, 20)

    background_tasks.add_task(
        HHService.parse_and_store,
        text,
        area,
        pages,
        per_page,
        notify,
    )
    return {"status": "queued"}
