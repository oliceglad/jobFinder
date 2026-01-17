from pydantic import BaseModel


class ProfileCompletion(BaseModel):
    filled: int
    total: int
    score: int


class DashboardMetrics(BaseModel):
    recommendation_trend: list[int]
    application_rhythm: list[int]
    profile_completion: ProfileCompletion
    match_score: int
