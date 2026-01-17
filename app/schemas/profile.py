from pydantic import BaseModel

class ProfileBase(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    avatar_thumb_url: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    city: str | None = None
    region: str | None = None
    work_format: str | None = None
    employment_level: str | None = None
    desired_salary: int | None = None
    experience_years: int | None = None
    keywords: str | None = None
    about: str | None = None
    company_name: str | None = None
    company_site: str | None = None
    company_description: str | None = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class ProfileOut(ProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
