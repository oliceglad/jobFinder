import asyncio
from datetime import datetime, timezone
import logging
from typing import Any

import httpx

from app.core.database import AsyncSessionLocal
from app.services.vacancy_service import VacancyService
from app.core.config import settings
from app.services.notification_service import NotificationService

SJ_API_BASE = "https://api.superjob.ru/2.0"
# Hardcoded API key from the given repository for integration
SJ_SECRET_KEY = "v3.r.137222938.adcc1bf5602cc5a2c697d63eb9c580dd5029f96f.049aae965267ebe71bbc7c587187da62cdbc560e"

class SJService:
    @staticmethod
    async def fetch_vacancies(
        text: str,
        page: int = 0,
        per_page: int = 20,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "keyword": text,
            "count": per_page,
            "page": page,
        }
        headers = {
            "X-Api-App-Id": SJ_SECRET_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(f"{SJ_API_BASE}/vacancies/", params=params, headers=headers)
            response.raise_for_status()
            return response.json()

    @staticmethod
    def map_sj_list_item(item: dict[str, Any]) -> dict[str, Any]:
        client_data = item.get("client") or {}
        town = item.get("town") or {}

        published_at = item.get("date_published")
        published_dt = None
        if published_at:
            try:
                published_dt = datetime.fromtimestamp(published_at, tz=timezone.utc).replace(tzinfo=None)
            except Exception:
                published_dt = None

        return {
            "title": item.get("profession"),
            "description": item.get("candidat") or "",
            "company": client_data.get("title"),
            "city": town.get("title"),
            "region": town.get("title"), # superjob area mapping is simplified
            "is_remote": (item.get("place_of_work") or {}).get("id") == 2, # remote flag
            "salary_from": item.get("payment_from"),
            "salary_to": item.get("payment_to"),
            "salary_currency": item.get("currency"),
            "url": item.get("link"),
            "source": "superjob",
            "parsed_from_hh": False,
            "external_id": str(item.get("id")),
            "published_at": published_dt,
        }

    @staticmethod
    async def parse_and_store(
        text: str,
        pages: int,
        per_page: int,
        notify: bool,
    ) -> int:
        saved_ids: set[int] = set()
        try:
            async with AsyncSessionLocal() as db:
                for page in range(pages):
                    payload = await SJService.fetch_vacancies(
                        text=text,
                        per_page=per_page,
                        page=page,
                    )
                    items = payload.get("objects", [])

                    for item in items:
                        try:
                            vacancy_data = SJService.map_sj_list_item(item)
                            # VacancyService matching logic uses source + external_id uniqueness, so 'upsert_from_hh' handles both generically
                            vacancy_data["source"] = "superjob" # double check to avoid HH flag
                            vacancy = await VacancyService.upsert_from_hh(db, vacancy_data)
                            saved_ids.add(vacancy.id)
                        except Exception as e:
                            logging.warning(f"Failed to parse SJ vacancy {item.get('id')}: {e}")
                            
                    await asyncio.sleep(0.5)
        except Exception:
            logging.exception("SJ parsing failed")

        if notify and saved_ids and settings.NOTIFICATIONS_ENABLED:
            await NotificationService.notify_users_about_vacancy_ids(list(saved_ids))

        return len(saved_ids)
