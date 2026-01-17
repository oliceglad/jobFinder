import asyncio
import logging
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, skills, vacancies, recommendations, profiles, favorites, applications, admin, dashboard, talents
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import User
from app.core.security import hash_password
from app.services.seed_service import SeedService
from sqlalchemy import select

app = FastAPI(
    title="Expert Vacancy Recommendation System",
    description="Экспертная система подбора вакансий по навыкам",
    version="1.0.0"
)

allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
allow_any = allowed_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_any else allowed_origins,
    allow_credentials=False if allow_any else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(skills.router, prefix="/skills", tags=["Skills"])
app.include_router(vacancies.router, prefix="/vacancies", tags=["Vacancies"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
app.include_router(favorites.router, prefix="/favorites", tags=["Favorites"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(talents.router, prefix="/talents", tags=["Talents"])
app.mount(settings.MEDIA_URL, StaticFiles(directory=settings.MEDIA_DIR), name="media")

if settings.NOTIFICATIONS_ENABLED:
    from app.api import notifications

    app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.on_event("startup")
async def ensure_admin_user():
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        user = result.scalar_one_or_none()
        if user:
            return

        admin = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role="admin",
        )
        session.add(admin)
        await session.commit()


@app.on_event("startup")
async def ensure_demo_data():
    if not settings.DEMO_SEED_ENABLED:
        return
    async with AsyncSessionLocal() as session:
        await SeedService.seed_demo(session)


@app.on_event("startup")
async def start_notification_digest():
    if not settings.NOTIFICATIONS_ENABLED or not settings.NOTIFY_DIGEST_ENABLED:
        return

    from app.services.notification_service import NotificationService

    async def _runner():
        while True:
            try:
                async with AsyncSessionLocal() as session:
                    since = datetime.utcnow() - timedelta(hours=settings.NOTIFY_DIGEST_LOOKBACK_HOURS)
                    vacancies = await NotificationService.build_vacancy_digest(session, since)
                    await NotificationService.notify_users_about_vacancies(session, vacancies)
            except Exception:
                logging.exception("Notification digest failed")
            await asyncio.sleep(settings.NOTIFY_DIGEST_INTERVAL_MINUTES * 60)

    asyncio.create_task(_runner())
