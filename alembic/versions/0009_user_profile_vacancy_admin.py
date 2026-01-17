"""add user active flag, employer profile fields, vacancy moderation

Revision ID: 0009_user_profile_vacancy_admin
Revises: 0008_application_contacts
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_user_profile_vacancy_admin"
down_revision = "0008_application_contacts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("profiles", sa.Column("company_name", sa.String(length=255), nullable=True))
    op.add_column("profiles", sa.Column("company_site", sa.String(length=255), nullable=True))
    op.add_column("profiles", sa.Column("company_description", sa.Text(), nullable=True))
    op.add_column("vacancies", sa.Column("moderation_status", sa.String(length=20), nullable=False, server_default="approved"))


def downgrade() -> None:
    op.drop_column("vacancies", "moderation_status")
    op.drop_column("profiles", "company_description")
    op.drop_column("profiles", "company_site")
    op.drop_column("profiles", "company_name")
    op.drop_column("users", "is_active")
