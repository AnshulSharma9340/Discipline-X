from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    BACKEND_ENV: Literal["development", "staging", "production"] = "development"
    BACKEND_PORT: int = 8000
    SECRET_KEY: str = "change-me"
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "DisciplineX"

    # ---- CORS ----
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @computed_field
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    # ---- Database ----
    DATABASE_URL: str = Field(..., description="Async SQLAlchemy URL (asyncpg)")
    DATABASE_URL_SYNC: str = Field("", description="Sync URL for Alembic")

    # ---- Supabase ----
    SUPABASE_URL: str = Field(...)
    SUPABASE_ANON_KEY: str = Field(...)
    SUPABASE_SERVICE_ROLE_KEY: str = Field(...)
    SUPABASE_JWT_SECRET: str = Field(..., description="HS256 secret used to sign Supabase JWTs")
    SUPABASE_STORAGE_BUCKET: str = "proofs"

    # ---- Discipline engine ----
    DAILY_CUTOFF_HOUR: int = 23
    DAILY_CUTOFF_MINUTE: int = 59
    AUTO_PROMOTE_FIRST_USER: bool = True

    # ---- Optional AI providers ----
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ---- Google OAuth (backend-driven flow) ----
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # Public URL Google calls back to. Must match what's registered in Google Console.
    # Example prod: https://discipline-x-XXXXX.asia-south1.run.app/api/v1/auth/google/callback
    GOOGLE_REDIRECT_URI: str = ""

    # ---- Brevo (email for OTP / password reset) ----
    BREVO_API_KEY: str = ""
    BREVO_FROM_EMAIL: str = ""
    BREVO_FROM_NAME: str = "DisciplineX"

    # ---- Frontend URL (used as redirect target after OAuth / password reset) ----
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def groq_enabled(self) -> bool:
        return bool(self.GROQ_API_KEY.strip())

    @property
    def google_oauth_enabled(self) -> bool:
        return bool(
            self.GOOGLE_CLIENT_ID.strip()
            and self.GOOGLE_CLIENT_SECRET.strip()
            and self.GOOGLE_REDIRECT_URI.strip()
        )

    @property
    def brevo_enabled(self) -> bool:
        return bool(self.BREVO_API_KEY.strip() and self.BREVO_FROM_EMAIL.strip())

    @property
    def is_production(self) -> bool:
        return self.BACKEND_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
