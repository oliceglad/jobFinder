from datetime import datetime
from pydantic import BaseModel

class FavoriteVacancyOut(BaseModel):
    vacancy_id: int
    created_at: datetime

    class Config:
        from_attributes = True
