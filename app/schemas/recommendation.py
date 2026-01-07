from pydantic import BaseModel

class RecommendedVacancy(BaseModel):
    id: int
    title: str
    company: str | None
    city: str | None
    score: float

    class Config:
        from_attributes = True
