"""add contact fields to application statuses

Revision ID: 0008_application_contacts
Revises: 0007_recommendation_cache
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_application_contacts"
down_revision = "0007_recommendation_cache"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("application_statuses", sa.Column("contact_name", sa.String(length=255), nullable=True))
    op.add_column("application_statuses", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("application_statuses", sa.Column("contact_phone", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("application_statuses", "contact_phone")
    op.drop_column("application_statuses", "contact_email")
    op.drop_column("application_statuses", "contact_name")
