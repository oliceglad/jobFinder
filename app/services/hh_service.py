import asyncio
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

        headers = {"User-Agent": "jobFinder/1.0 (admin@jobfinder.example.com)"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{HH_API_BASE}/vacancies", params=params, headers=headers)
            response.raise_for_status()
            return response.json()


    @staticmethod
    def map_hh_list_item(item: dict[str, Any]) -> dict[str, Any]:
        salary = item.get("salary") or {}
        address = item.get("address") or {}
        employer = item.get("employer") or {}
        snippet = item.get("snippet") or {}

        published_at = item.get("published_at")
        published_dt = None
        if published_at:
            try:
                published_dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                if published_dt.tzinfo is not None:
                    # Store naive UTC to match TIMESTAMP WITHOUT TIME ZONE
                    published_dt = published_dt.astimezone(timezone.utc).replace(tzinfo=None)
            except ValueError:
                published_dt = None

        req = snippet.get("requirement") or ""
        resp = snippet.get("responsibility") or ""
        desc = ""
        if req or resp:
            desc = f"{req}\n\n{resp}".strip()
            # HH returns <highlighttext> tags sometimes, we can keep them or clean them if UI supports it, UI strips HTML so it's fine.

        return {
            "title": item.get("name"),
            "description": desc,
            "requirements": req,
            "responsibilities": resp,
            "company": employer.get("name"),
            "city": (item.get("area") or {}).get("name"),
            "region": (address.get("region") or {}).get("name") if isinstance(address.get("region"), dict) else address.get("region"),
            "schedule": (item.get("schedule") or {}).get("name"),
            "employment": (item.get("employment") or {}).get("name"),
            "experience": (item.get("experience") or {}).get("name"),
            "is_remote": (item.get("schedule") or {}).get("id") in ("remote", "flexible"),
            "salary_from": salary.get("from"),
            "salary_to": salary.get("to"),
            "salary_currency": salary.get("currency"),
            "url": item.get("alternate_url"),
            "source": "hh",
            "parsed_from_hh": True,
            "external_id": str(item.get("id")),
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
                        try:
                            vacancy_data = HHService.map_hh_list_item(item)
                            vacancy = await VacancyService.upsert_from_hh(db, vacancy_data)
                            saved_ids.add(vacancy.id)
                        except Exception as e:
                            logging.warning(f"Failed to parse HH vacancy {item.get('id')}: {e}")
                            
                    await asyncio.sleep(0.5) # gentle sleep between pages, not per item
        except Exception:
            logging.exception("HH parsing failed")

        if notify and saved_ids and settings.NOTIFICATIONS_ENABLED:
            await NotificationService.notify_users_about_vacancy_ids(list(saved_ids))

        return len(saved_ids)
