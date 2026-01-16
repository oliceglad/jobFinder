"""Add parsed_from_hh to vacancies.

Revision ID: 0003_add_parsed_from_hh
Revises: 0002_core_features
Create Date: 2026-01-07 00:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_parsed_from_hh"
down_revision = "0002_core_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("vacancies")}
    if "parsed_from_hh" not in columns:
        op.add_column(
            "vacancies",
            sa.Column("parsed_from_hh", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("vacancies")}
    if "parsed_from_hh" in columns:
        op.drop_column("vacancies", "parsed_from_hh")
