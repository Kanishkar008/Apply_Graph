"""create_parsed_resumes_table

Revision ID: bec5c725786f
Revises: 2e606e83dec5
Create Date: 2026-10-16 18:57:53.887634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bec5c725786f'
down_revision: Union[str, None] = '2e606e83dec5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'parsed_resumes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('resume_id', sa.String(length=36), nullable=False),
        sa.Column('parsed_data', sa.JSON(), nullable=False),
        sa.Column('extracted_data', sa.JSON(), nullable=False),
        sa.Column('parse_warnings', sa.JSON(), nullable=False),
        sa.Column('is_user_corrected', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_parsed_resumes_id'), 'parsed_resumes', ['id'], unique=False)
    op.create_index(op.f('ix_parsed_resumes_resume_id'), 'parsed_resumes', ['resume_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_parsed_resumes_resume_id'), table_name='parsed_resumes')
    op.drop_index(op.f('ix_parsed_resumes_id'), table_name='parsed_resumes')
    op.drop_table('parsed_resumes')
