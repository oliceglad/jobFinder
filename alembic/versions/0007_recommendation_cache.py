"""Add recommendation cache.

Revision ID: 0007_recommendation_cache
Revises: 0006_vacancy_notifications
Create Date: 2026-01-07 01:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_recommendation_cache"
down_revision = "0006_vacancy_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recommendation_cache",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_recommendation_cache_user_id", "recommendation_cache", ["user_id"], unique=False)
    op.create_index("ix_recommendation_cache_vacancy_id", "recommendation_cache", ["vacancy_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_recommendation_cache_vacancy_id", table_name="recommendation_cache")
    op.drop_index("ix_recommendation_cache_user_id", table_name="recommendation_cache")
    op.drop_table("recommendation_cache")
