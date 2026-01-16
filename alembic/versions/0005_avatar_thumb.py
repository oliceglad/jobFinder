"""Add avatar_thumb_url to profiles.

Revision ID: 0005_avatar_thumb
Revises: 0004_avatar_notifications
Create Date: 2026-01-07 00:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_avatar_thumb"
down_revision = "0004_avatar_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("avatar_thumb_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "avatar_thumb_url")
