"""
Core Configuration Module
Loads environment variables and manages application settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, Field
from typing import List, Union
from functools import lru_cache
from pathlib import Path

# Get the backend directory path
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Librarity"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False
    
    # Redis
    REDIS_URL: str
    REDIS_PASSWORD: str = ""
    
    # Qdrant
    QDRANT_URL: str
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_NAME: str = "librarity_books"
    
    # Google Gemini
    GOOGLE_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    GEMINI_EMBEDDING_MODEL: str = "models/embedding-001"
    
    # Celery
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    
    # Polar.sh
    POLAR_API_KEY: str = ""
    POLAR_ORGANIZATION_ID: str = ""
    POLAR_WEBHOOK_SECRET: str = ""
    POLAR_API_URL: str = "https://api.polar.sh"
    
    # File Storage
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "librarity-books"
    S3_REGION: str = "us-east-1"
    USE_S3: bool = False
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # CORS
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',')]
        return self.cors_origins
    
    # Token Limits
    FREE_TIER_TOKEN_LIMIT: int = 10000
    PRO_TIER_TOKEN_LIMIT: int = 100000
    ULTIMATE_TIER_TOKEN_LIMIT: int = 300000
    
    # Book Processing
    MAX_UPLOAD_SIZE_MB: int = 50
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        case_sensitive=True,
        extra="ignore",
        populate_by_name=True,
        json_schema_extra={
            'env_parse_enums': True,
        }
    )
    
    @property
    def token_limit_by_tier(self) -> dict:
        """Get token limits by subscription tier"""
        return {
            "free": self.FREE_TIER_TOKEN_LIMIT,
            "pro": self.PRO_TIER_TOKEN_LIMIT,
            "ultimate": self.ULTIMATE_TIER_TOKEN_LIMIT
        }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
