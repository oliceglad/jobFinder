"""add vacancy moderation logs

Revision ID: 0010_vacancy_moderation_logs
Revises: 0009_user_profile_vacancy_admin
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_vacancy_moderation_logs"
down_revision = "0009_user_profile_vacancy_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vacancy_moderation_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id"), nullable=False),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=False),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_vacancy_moderation_logs_vacancy_id", "vacancy_moderation_logs", ["vacancy_id"])
    op.create_index("ix_vacancy_moderation_logs_admin_id", "vacancy_moderation_logs", ["admin_id"])


def downgrade() -> None:
    op.drop_index("ix_vacancy_moderation_logs_admin_id", table_name="vacancy_moderation_logs")
    op.drop_index("ix_vacancy_moderation_logs_vacancy_id", table_name="vacancy_moderation_logs")
    op.drop_table("vacancy_moderation_logs")
