from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, Vacancy, Profile, UserSkill, ApplicationStatus
from app.core.security import hash_password
from app.services.skill_service import SkillService
from app.services.vacancy_service import VacancyService

class SeedService:
    @staticmethod
    async def seed_demo(db: AsyncSession) -> dict:
        employers_data = [
            {"email": "employer1@demo.example.com", "password": "employer123"},
            {"email": "employer2@demo.example.com", "password": "employer123"},
            {"email": "employer3@demo.example.com", "password": "employer123"},
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
                    is_active=True,
                )
                db.add(employer)
                await db.commit()
                await db.refresh(employer)
                created_employers += 1
            elif not employer.is_active:
                employer.is_active = True
                await db.commit()
            employers.append(employer)

        admin_email = "admin@demo.example.com"
        admin_password = "admin123"
        result = await db.execute(
            select(User).where(User.email == admin_email)
        )
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=hash_password(admin_password),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
        elif not admin.is_active:
            admin.is_active = True
            await db.commit()

        seeker_email = "seeker@demo.example.com"
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
                is_active=True,
            )
            db.add(seeker)
            await db.commit()
            await db.refresh(seeker)
        elif not seeker.is_active:
            seeker.is_active = True
            await db.commit()

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

        created_vacancies: list[Vacancy] = []
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
            vacancy = await VacancyService.create_vacancy(
                db=db,
                data=data,
                created_by_user_id=employer.id,
            )
            created_vacancies.append(vacancy)
            created += 1

        if not created_vacancies:
            result = await db.execute(
                select(Vacancy).where(Vacancy.url.like("https://example.com/vacancies/demo-%"))
            )
            created_vacancies = result.scalars().all()

        statuses = ["applied", "interview", "offer", "rejected", "success"]
        notes = [
            "Сильный опыт, хочется поговорить.",
            "Назначили техскрининг.",
            "Обсуждаем условия оффера.",
            "Пока не совпали ожидания.",
            "Успех! Готовы предложить оффер.",
        ]

        created_applications = 0
        skipped_applications = 0
        for idx, vacancy in enumerate(created_vacancies[:12]):
            result = await db.execute(
                select(ApplicationStatus).where(
                    ApplicationStatus.user_id == seeker.id,
                    ApplicationStatus.vacancy_id == vacancy.id,
                )
            )
            if result.scalar_one_or_none():
                skipped_applications += 1
                continue

            status = statuses[idx % len(statuses)]
            status_row = ApplicationStatus(
                user_id=seeker.id,
                vacancy_id=vacancy.id,
                status=status,
                notes=notes[idx % len(notes)],
                updated_at=datetime.utcnow() - timedelta(days=idx % 7),
            )
            if status == "success":
                status_row.contact_name = "HR команда"
                status_row.contact_email = "hr@demo.example.com"
                status_row.contact_phone = "+7 (999) 111-22-33"
            db.add(status_row)
            created_applications += 1
        if created_applications:
            await db.commit()

        return {
            "employers": [data["email"] for data in employers_data],
            "employer_password": "employer123",
            "admin_email": admin_email,
            "admin_password": admin_password,
            "seeker_email": seeker_email,
            "seeker_password": seeker_password,
            "created_employers": created_employers,
            "vacancies_created": created,
            "vacancies_skipped": skipped,
            "applications_created": created_applications,
            "applications_skipped": skipped_applications,
        }
