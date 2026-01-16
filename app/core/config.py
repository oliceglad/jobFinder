from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "super-secret"
    ALGORITHM: str = "HS256"
    ADMIN_EMAIL: str | None = None
    ADMIN_PASSWORD: str | None = None
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None
    SMTP_TLS: bool = True
    MEDIA_DIR: str = "media"
    MEDIA_URL: str = "/media"
    NOTIFICATIONS_ENABLED: bool = False
    NOTIFY_DIGEST_ENABLED: bool = False
    NOTIFY_DIGEST_INTERVAL_MINUTES: int = 60
    NOTIFY_DIGEST_LOOKBACK_HOURS: int = 24
    CORS_ORIGINS: str = "*"
    DEMO_SEED_ENABLED: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
