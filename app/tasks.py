import asyncio

from app.core.celery_app import celery_app
from app.services.hh_service import HHService
from app.services.notification_service import NotificationService
from app.services.recommendation_service import RecommendationService


def _run_async(coro):
    return asyncio.run(coro)


@celery_app.task(name="app.tasks.parse_hh_vacancies")
def parse_hh_vacancies_task(
    text: str,
    area: int | None,
    pages: int,
    per_page: int,
    notify: bool,
):
    return _run_async(HHService.parse_and_store(text, area, pages, per_page, notify))


@celery_app.task(name="app.tasks.notify_users_by_role")
def notify_users_by_role_task(role: str, title: str, body: str | None):
    return _run_async(NotificationService.notify_users_by_role(role, title, body))


@celery_app.task(name="app.tasks.notify_new_vacancies")
def notify_new_vacancies_task(hours: int = 24):
    return _run_async(NotificationService.notify_new_vacancies(hours))


@celery_app.task(name="app.tasks.refresh_recommendations_cache")
def refresh_recommendations_cache_task(user_id: int, limit: int = 10):
    return _run_async(RecommendationService.refresh_cache_for_user(user_id, limit))
