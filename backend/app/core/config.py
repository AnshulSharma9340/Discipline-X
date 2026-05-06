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

    @property
    def groq_enabled(self) -> bool:
        return bool(self.GROQ_API_KEY.strip())

    @property
    def is_production(self) -> bool:
        return self.BACKEND_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
