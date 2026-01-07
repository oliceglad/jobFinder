from fastapi import FastAPI
from app.api import auth, skills, vacancies, recommendations

app = FastAPI(
    title="Expert Vacancy Recommendation System",
    description="Экспертная система подбора вакансий по навыкам",
    version="1.0.0"
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(skills.router, prefix="/skills", tags=["Skills"])
app.include_router(vacancies.router, prefix="/vacancies", tags=["Vacancies"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
