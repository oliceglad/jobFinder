"""ensure users active flag defaults true for existing users

Revision ID: 0011_set_users_active
Revises: 0010_vacancy_moderation_logs
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0011_set_users_active"
down_revision = "0010_vacancy_moderation_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE users SET is_active = TRUE WHERE is_active IS NULL OR is_active = FALSE"))


def downgrade() -> None:
    pass
