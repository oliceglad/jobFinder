"""Core features: roles, profiles, favorites, statuses, vacancy fields.

Revision ID: 0002_core_features
Revises: 0001_initial
Create Date: 2026-01-07 00:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_core_features"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=20), server_default="seeker", nullable=False))

    op.add_column("vacancies", sa.Column("requirements", sa.Text(), nullable=True))
    op.add_column("vacancies", sa.Column("responsibilities", sa.Text(), nullable=True))
    op.add_column("vacancies", sa.Column("region", sa.String(length=100), nullable=True))
    op.add_column("vacancies", sa.Column("schedule", sa.String(length=100), nullable=True))
    op.add_column("vacancies", sa.Column("employment", sa.String(length=100), nullable=True))
    op.add_column("vacancies", sa.Column("experience", sa.String(length=100), nullable=True))
    op.add_column("vacancies", sa.Column("is_remote", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("vacancies", sa.Column("salary_currency", sa.String(length=10), nullable=True))
    op.add_column("vacancies", sa.Column("parsed_from_hh", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("vacancies", sa.Column("external_id", sa.String(length=100), nullable=True))
    op.add_column("vacancies", sa.Column("published_at", sa.DateTime(), nullable=True))
    op.add_column("vacancies", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.create_index("ix_vacancies_external_id", "vacancies", ["external_id"], unique=False)
    op.create_unique_constraint("uq_vacancy_source_external", "vacancies", ["source", "external_id"])
    op.create_foreign_key(
        "fk_vacancies_created_by_user",
        "vacancies",
        "users",
        ["created_by_user_id"],
        ["id"],
    )

    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_phone", sa.String(length=50), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("work_format", sa.String(length=50), nullable=True),
        sa.Column("employment_level", sa.String(length=50), nullable=True),
        sa.Column("desired_salary", sa.Integer(), nullable=True),
        sa.Column("experience_years", sa.Integer(), nullable=True),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("about", sa.Text(), nullable=True),
    )

    op.create_table(
        "favorite_vacancies",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "application_statuses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id"), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_application_statuses_user_id", "application_statuses", ["user_id"], unique=False)
    op.create_index("ix_application_statuses_vacancy_id", "application_statuses", ["vacancy_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_application_statuses_vacancy_id", table_name="application_statuses")
    op.drop_index("ix_application_statuses_user_id", table_name="application_statuses")
    op.drop_table("application_statuses")
    op.drop_table("favorite_vacancies")
    op.drop_table("profiles")

    op.drop_constraint("fk_vacancies_created_by_user", "vacancies", type_="foreignkey")
    op.drop_constraint("uq_vacancy_source_external", "vacancies", type_="unique")
    op.drop_index("ix_vacancies_external_id", table_name="vacancies")
    op.drop_column("vacancies", "created_by_user_id")
    op.drop_column("vacancies", "published_at")
    op.drop_column("vacancies", "external_id")
    op.drop_column("vacancies", "salary_currency")
    op.drop_column("vacancies", "parsed_from_hh")
    op.drop_column("vacancies", "is_remote")
    op.drop_column("vacancies", "experience")
    op.drop_column("vacancies", "employment")
    op.drop_column("vacancies", "schedule")
    op.drop_column("vacancies", "region")
    op.drop_column("vacancies", "responsibilities")
    op.drop_column("vacancies", "requirements")

    op.drop_column("users", "role")
