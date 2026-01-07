from app.services.parsing.hh_parser import HHParser
from app.services.vacancy_service import VacancyService
from app.utils.skill_extractor import extract_skills

async def load_hh_vacancies(db):
    parser = HHParser()
    raw_vacancies = await parser.fetch_vacancies("backend")

    for raw in raw_vacancies:
        description = raw.get("snippet", {}).get("requirement", "") or ""

        skills = extract_skills(description)

        await VacancyService.create_vacancy(
            db=db,
            title=raw["name"],
            description=description,
            company=raw["employer"]["name"] if raw.get("employer") else None,
            city=raw["area"]["name"] if raw.get("area") else None,
            salary_from=raw["salary"]["from"] if raw.get("salary") else None,
            salary_to=raw["salary"]["to"] if raw.get("salary") else None,
            url=raw["alternate_url"],
            source="hh",
            skills=skills
        )
