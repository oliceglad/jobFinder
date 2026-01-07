"""Initial schema.

Revision ID: 0001_initial
Revises: 
Create Date: 2026-01-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("normalized_name", sa.String(length=100), nullable=False),
        sa.UniqueConstraint("name", name="uq_skills_name"),
    )
    op.create_index("ix_skills_normalized_name", "skills", ["normalized_name"], unique=False)

    op.create_table(
        "vacancies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("salary_from", sa.Integer(), nullable=True),
        sa.Column("salary_to", sa.Integer(), nullable=True),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "user_skills",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("skill_id", sa.Integer(), sa.ForeignKey("skills.id"), primary_key=True),
        sa.Column("level", sa.Integer(), nullable=True),
    )

    op.create_table(
        "vacancy_skills",
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id"), primary_key=True),
        sa.Column("skill_id", sa.Integer(), sa.ForeignKey("skills.id"), primary_key=True),
        sa.Column("weight", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("vacancy_skills")
    op.drop_table("user_skills")
    op.drop_table("vacancies")
    op.drop_index("ix_skills_normalized_name", table_name="skills")
    op.drop_table("skills")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
