"""Add avatar_url and notifications.

Revision ID: 0004_avatar_notifications
Revises: 0003_add_parsed_from_hh
Create Date: 2026-01-07 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_avatar_notifications"
down_revision = "0003_add_parsed_from_hh"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("avatar_url", sa.String(length=500), nullable=True))

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_column("profiles", "avatar_url")
