import asyncio
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import Notification, User, Vacancy, UserSkill, VacancySkill, Skill, Profile, VacancyNotification
from app.utils.text_builder import build_vacancy_text

class NotificationService:

    @staticmethod
    async def create(db: AsyncSession, user_id: int, title: str, body: str | None) -> Notification:
        notification = Notification(user_id=user_id, title=title, body=body)
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def list_for_user(db: AsyncSession, user_id: int) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def mark_read(db: AsyncSession, notification: Notification) -> Notification:
        notification.read_at = datetime.utcnow()
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def send_email(to_email: str, subject: str, body: str | None) -> bool:
        if not settings.SMTP_HOST or not settings.SMTP_FROM:
            return False

        message = EmailMessage()
        message["From"] = settings.SMTP_FROM
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body or "")

        def _send():
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)

        await asyncio.to_thread(_send)
        return True

    @staticmethod
    async def notify_users(
        db: AsyncSession,
        users: list[User],
        title: str,
        body: str | None,
    ) -> int:
        created = 0
        for user in users:
            await NotificationService.create(db, user.id, title, body)
            await NotificationService.send_email(user.email, title, body)
            created += 1
        return created

    @staticmethod
    async def notify_users_about_vacancies(
        db: AsyncSession,
        vacancies: list[Vacancy],
    ) -> int:
        if not vacancies:
            return 0

        vacancy_ids = [v.id for v in vacancies]
        result = await db.execute(
            select(VacancySkill, Skill)
            .join(Skill, Skill.id == VacancySkill.skill_id)
            .where(VacancySkill.vacancy_id.in_(vacancy_ids))
        )
        vacancy_skill_rows = result.all()
        vacancy_skill_map: dict[int, set[int]] = {}
        for row in vacancy_skill_rows:
            vacancy_skill_map.setdefault(row.VacancySkill.vacancy_id, set()).add(row.VacancySkill.skill_id)

        result = await db.execute(select(User).where(User.role == "seeker"))
        users = result.scalars().all()
        if not users:
            return 0

        user_ids = [u.id for u in users]
        result = await db.execute(
            select(UserSkill).where(UserSkill.user_id.in_(user_ids))
        )
        user_skill_rows = result.scalars().all()
        user_skill_map: dict[int, set[int]] = {}
        for us in user_skill_rows:
            user_skill_map.setdefault(us.user_id, set()).add(us.skill_id)

        result = await db.execute(
            select(Profile).where(Profile.user_id.in_(user_ids))
        )
        profiles = result.scalars().all()
        profile_map = {p.user_id: p for p in profiles}

        result = await db.execute(
            select(VacancyNotification).where(
                VacancyNotification.user_id.in_(user_ids),
                VacancyNotification.vacancy_id.in_(vacancy_ids),
            )
        )
        sent_pairs = {(row.user_id, row.vacancy_id) for row in result.scalars().all()}

        user_vacancy_hits: dict[int, list[Vacancy]] = {u.id: [] for u in users}
        for vacancy in vacancies:
            vacancy_skill_ids = vacancy_skill_map.get(vacancy.id, set())
            vacancy_text = build_vacancy_text(
                vacancy.title,
                vacancy.description,
                requirements=vacancy.requirements,
                responsibilities=vacancy.responsibilities,
                company=vacancy.company,
            ).lower()

            for user in users:
                user_skills = user_skill_map.get(user.id, set())
                skill_match = bool(user_skills.intersection(vacancy_skill_ids))

                profile = profile_map.get(user.id)
                keyword_match = False
                if profile and profile.keywords:
                    for keyword in profile.keywords.split(","):
                        kw = keyword.strip().lower()
                        if kw and kw in vacancy_text:
                            keyword_match = True
                            break

                if (user.id, vacancy.id) in sent_pairs:
                    continue
                if skill_match or keyword_match:
                    user_vacancy_hits[user.id].append(vacancy)

        sent = 0
        for user in users:
            matched = user_vacancy_hits.get(user.id, [])
            if not matched:
                continue
            title = "New matching vacancies"
            lines = [f"{v.title} - {v.company or ''} ({v.url})" for v in matched[:10]]
            body = "\n".join(lines)
            await NotificationService.create(db, user.id, title, body)
            await NotificationService.send_email(user.email, title, body)
            db.add_all(
                [
                    VacancyNotification(user_id=user.id, vacancy_id=v.id)
                    for v in matched
                ]
            )
            await db.commit()
            sent += 1

        return sent

    @staticmethod
    async def notify_users_by_role(role: str, title: str, body: str | None) -> int:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.role == role))
            users = result.scalars().all()
            return await NotificationService.notify_users(session, users, title, body)

    @staticmethod
    async def notify_users_about_vacancy_ids(vacancy_ids: list[int]) -> int:
        if not vacancy_ids:
            return 0
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Vacancy).where(Vacancy.id.in_(vacancy_ids))
            )
            vacancies = result.scalars().all()
            return await NotificationService.notify_users_about_vacancies(session, vacancies)

    @staticmethod
    async def notify_new_vacancies(hours: int = 24) -> int:
        async with AsyncSessionLocal() as session:
            since = datetime.utcnow() - timedelta(hours=hours)
            vacancies = await NotificationService.build_vacancy_digest(session, since)
            return await NotificationService.notify_users_about_vacancies(session, vacancies)

    @staticmethod
    async def build_vacancy_digest(db: AsyncSession, since: datetime) -> list[Vacancy]:
        result = await db.execute(
            select(Vacancy)
            .where(Vacancy.published_at >= since)
            .order_by(Vacancy.published_at.desc())
        )
        return result.scalars().all()
