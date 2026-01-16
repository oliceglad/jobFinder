from datetime import datetime
from pydantic import BaseModel

class NotificationCreate(BaseModel):
    title: str
    body: str | None = None

class NotificationOut(BaseModel):
    id: int
    title: str
    body: str | None = None
    created_at: datetime
    read_at: datetime | None = None

    class Config:
        from_attributes = True
