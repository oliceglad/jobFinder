"""Add vacancy_notifications for deduped alerts.

Revision ID: 0006_vacancy_notifications
Revises: 0005_avatar_thumb
Create Date: 2026-01-07 00:50:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_vacancy_notifications"
down_revision = "0005_avatar_thumb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vacancy_notifications",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("vacancy_notifications")
