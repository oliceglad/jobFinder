from pydantic import BaseModel

class SkillCreate(BaseModel):
    name: str

class SkillOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserSkillCreate(BaseModel):
    skill_id: int
    level: int | None = None


class UserSkillOut(BaseModel):
    skill: SkillOut
    level: int | None

    class Config:
        from_attributes = True
