"""update demo emails to valid domains

Revision ID: 0012_update_demo_emails
Revises: 0011_set_users_active
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_update_demo_emails"
down_revision = "0011_set_users_active"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE users SET email = replace(email, '@demo.local', '@demo.example.com') "
            "WHERE email LIKE '%@demo.local'"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE users SET email = replace(email, '@demo.example.com', '@demo.local') "
            "WHERE email LIKE '%@demo.example.com'"
        )
    )
