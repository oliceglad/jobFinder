from datetime import datetime, timezone
import logging
from typing import Any

import httpx

from app.core.database import AsyncSessionLocal
from app.services.vacancy_service import VacancyService
from app.core.config import settings
from app.services.notification_service import NotificationService

HH_API_BASE = "https://api.hh.ru"

class HHService:
    @staticmethod
    async def fetch_vacancies(
        text: str,
        area: int | None = None,
        per_page: int = 20,
        page: int = 0,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "text": text,
            "per_page": per_page,
            "page": page,
        }
        if area is not None:
            params["area"] = area

        headers = {"User-Agent": "jobFinder/1.0"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{HH_API_BASE}/vacancies", params=params, headers=headers)
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def fetch_vacancy_detail(vacancy_id: str) -> dict[str, Any]:
        headers = {"User-Agent": "jobFinder/1.0"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{HH_API_BASE}/vacancies/{vacancy_id}", headers=headers)
            response.raise_for_status()
            return response.json()

    @staticmethod
    def map_hh_detail(detail: dict[str, Any]) -> dict[str, Any]:
        salary = detail.get("salary") or {}
        address = detail.get("address") or {}

        published_at = detail.get("published_at")
        published_dt = None
        if published_at:
            try:
                published_dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                if published_dt.tzinfo is not None:
                    # Store naive UTC to match TIMESTAMP WITHOUT TIME ZONE
                    published_dt = published_dt.astimezone(timezone.utc).replace(tzinfo=None)
            except ValueError:
                published_dt = None

        return {
            "title": detail.get("name"),
            "description": detail.get("description") or "",
            "requirements": detail.get("snippet", {}).get("requirement"),
            "responsibilities": detail.get("snippet", {}).get("responsibility"),
            "company": (detail.get("employer") or {}).get("name"),
            "city": (detail.get("area") or {}).get("name"),
            "region": (address.get("region") or {}).get("name") if isinstance(address.get("region"), dict) else address.get("region"),
            "schedule": (detail.get("schedule") or {}).get("name"),
            "employment": (detail.get("employment") or {}).get("name"),
            "experience": (detail.get("experience") or {}).get("name"),
            "is_remote": (detail.get("schedule") or {}).get("id") in ("remote", "flexible"),
            "salary_from": salary.get("from"),
            "salary_to": salary.get("to"),
            "salary_currency": salary.get("currency"),
            "url": detail.get("alternate_url"),
            "source": "hh",
            "parsed_from_hh": True,
            "external_id": str(detail.get("id")),
            "published_at": published_dt,
        }

    @staticmethod
    async def parse_and_store(
        text: str,
        area: int | None,
        pages: int,
        per_page: int,
        notify: bool,
    ) -> int:
        saved_ids: set[int] = set()
        try:
            async with AsyncSessionLocal() as db:
                for page in range(pages):
                    payload = await HHService.fetch_vacancies(
                        text=text,
                        area=area,
                        per_page=per_page,
                        page=page,
                    )
                    items = payload.get("items", [])

                    for item in items:
                        detail = await HHService.fetch_vacancy_detail(str(item.get("id")))
                        vacancy_data = HHService.map_hh_detail(detail)
                        vacancy = await VacancyService.upsert_from_hh(db, vacancy_data)

                        key_skills = [
                            ks.get("name")
                            for ks in detail.get("key_skills", [])
                            if ks.get("name")
                        ]
                        await VacancyService.attach_skills_by_names(db, vacancy, key_skills)
                        saved_ids.add(vacancy.id)
        except Exception:
            logging.exception("HH parsing failed")

        if notify and saved_ids and settings.NOTIFICATIONS_ENABLED:
            await NotificationService.notify_users_about_vacancy_ids(list(saved_ids))

        return len(saved_ids)
