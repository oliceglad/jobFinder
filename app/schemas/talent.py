from pydantic import BaseModel


class SeekerSkillOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class SeekerProfileOut(BaseModel):
    full_name: str | None = None
    city: str | None = None
    region: str | None = None
    keywords: str | None = None
    about: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class SeekerOut(BaseModel):
    id: int
    email: str
    skills: list[SeekerSkillOut]
    profile: SeekerProfileOut | None = None

    class Config:
        from_attributes = True
