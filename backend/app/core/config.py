"""
Configuration management using Pydantic settings
"""
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI-PC System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://ai_user:ai_password@localhost/ai_pc_db"
    DATABASE_ECHO: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AI API Keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None
    
    # AI Model Configuration
    # Default to GPT-3.5 Turbo for cost efficiency (~90% cheaper than GPT-4)
    DEFAULT_AI_MODEL: str = "gpt-3.5-turbo"
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 2000
    
    # Whisper Configuration
    WHISPER_MODEL: str = "whisper-1"
    AUDIO_MAX_SIZE_MB: int = 25
    
    # Gmail API
    GMAIL_CREDENTIALS_FILE: Optional[str] = None
    GMAIL_TOKEN_FILE: Optional[str] = None
    
    # WebSocket
    WEBSOCKET_SECRET_KEY: str = "websocket-secret-key"
    WEBSOCKET_PING_INTERVAL: int = 25
    WEBSOCKET_PING_TIMEOUT: int = 10
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()