import httpx

from app.services.parsing.base import BaseVacancyParser

class HHParser(BaseVacancyParser):

    BASE_URL = "https://api.hh.ru/vacancies"

    async def fetch_vacancies(self, text: str = "backend") -> list[dict]:
        params = {
            "text": text,
            "per_page": 20,
            "page": 0
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        return data["items"]
