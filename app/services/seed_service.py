from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, Vacancy, Profile, UserSkill
from app.core.security import hash_password
from app.services.skill_service import SkillService
from app.services.vacancy_service import VacancyService

class SeedService:
    @staticmethod
    async def seed_demo(db: AsyncSession) -> dict:
        employers_data = [
            {"email": "employer1@demo.local", "password": "employer123"},
            {"email": "employer2@demo.local", "password": "employer123"},
            {"email": "employer3@demo.local", "password": "employer123"},
        ]

        employers: list[User] = []
        created_employers = 0
        for data in employers_data:
            result = await db.execute(
                select(User).where(User.email == data["email"])
            )
            employer = result.scalar_one_or_none()
            if not employer:
                employer = User(
                    email=data["email"],
                    hashed_password=hash_password(data["password"]),
                    role="employer",
                )
                db.add(employer)
                await db.commit()
                await db.refresh(employer)
                created_employers += 1
            employers.append(employer)

        seeker_email = "seeker@demo.local"
        seeker_password = "seeker123"
        result = await db.execute(
            select(User).where(User.email == seeker_email)
        )
        seeker = result.scalar_one_or_none()
        if not seeker:
            seeker = User(
                email=seeker_email,
                hashed_password=hash_password(seeker_password),
                role="seeker",
            )
            db.add(seeker)
            await db.commit()
            await db.refresh(seeker)

        result = await db.execute(
            select(Profile).where(Profile.user_id == seeker.id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            profile = Profile(
                user_id=seeker.id,
                full_name="Demo Seeker",
                city="Tallinn",
                work_format="Remote",
                employment_level="Full-time",
                desired_salary=3200,
                experience_years=3,
                keywords="python, fastapi, react",
                about="Открыт к продуктовым командам и распределенной работе.",
                contact_email=seeker_email,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

        skill_names = [
            "Python",
            "FastAPI",
            "PostgreSQL",
            "Docker",
            "React",
            "TypeScript",
            "Redis",
            "SQL",
            "Kubernetes",
            "Git",
        ]
        seed_path = Path("app/data/skills_seed.txt")
        if seed_path.exists():
            names = [line.strip() for line in seed_path.read_text().splitlines() if line.strip()]
            await SkillService.seed_skills(db, names)

        skill_ids = []
        for name in skill_names:
            skill = await SkillService.create_skill(db, name)
            skill_ids.append(skill.id)

        result = await db.execute(
            select(UserSkill).where(UserSkill.user_id == seeker.id)
        )
        existing_user_skills = {row.skill_id for row in result.scalars().all()}
        for skill_id in skill_ids[:6]:
            if skill_id in existing_user_skills:
                continue
            db.add(UserSkill(user_id=seeker.id, skill_id=skill_id, level=3))
        await db.commit()

        templates = [
            {
                "title": "Frontend Engineer (React)",
                "company": "Aurora Labs",
                "city": "Remote",
                "description": "Build modern UI with React, collaborate with design, and ship features weekly.",
            },
            {
                "title": "Backend Engineer (Python)",
                "company": "Nova Systems",
                "city": "Berlin",
                "description": "Develop APIs, integrate PostgreSQL, and maintain data pipelines.",
            },
            {
                "title": "DevOps Engineer",
                "company": "CloudNine",
                "city": "Amsterdam",
                "description": "Automate deployments, manage Kubernetes, and improve observability.",
            },
            {
                "title": "Product Engineer",
                "company": "Forge Studio",
                "city": "Lisbon",
                "description": "Full-stack work across React and Python services with fast iteration.",
            },
            {
                "title": "Data Engineer",
                "company": "SignalWorks",
                "city": "Prague",
                "description": "Build ETL pipelines, maintain data quality, and optimize SQL queries.",
            },
            {
                "title": "Platform Engineer",
                "company": "Orbit",
                "city": "Remote",
                "description": "Improve infrastructure reliability, IaC, and deployment automation.",
            },
        ]

        created = 0
        skipped = 0

        for idx in range(20):
            template = templates[idx % len(templates)]
            url = f"https://example.com/vacancies/demo-{idx + 1}"

            result = await db.execute(
                select(Vacancy).where(Vacancy.url == url)
            )
            if result.scalar_one_or_none():
                skipped += 1
                continue

            data = {
                "title": f"{template['title']} #{idx + 1}",
                "description": template["description"],
                "company": template["company"],
                "city": template["city"],
                "salary_from": 2000 + idx * 50,
                "salary_to": 3500 + idx * 70,
                "url": url,
                "source": "manual",
                "parsed_from_hh": False,
                "skill_ids": [
                    skill_ids[idx % len(skill_ids)],
                    skill_ids[(idx + 2) % len(skill_ids)],
                    skill_ids[(idx + 4) % len(skill_ids)],
                ],
            }
            employer = employers[idx % len(employers)]
            await VacancyService.create_vacancy(
                db=db,
                data=data,
                created_by_user_id=employer.id,
            )
            created += 1

        return {
            "employers": [data["email"] for data in employers_data],
            "employer_password": "employer123",
            "seeker_email": seeker_email,
            "seeker_password": seeker_password,
            "created_employers": created_employers,
            "vacancies_created": created,
            "vacancies_skipped": skipped,
        }
