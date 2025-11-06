"""
FastAPI application entry point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from python_json_logger import jsonlogger

from app.core.config import settings
from app.core.database import init_db, close_db
from app.services.cache_service import cache
from app.api import auth, ai_router, voice, websocket

# Configure logging
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logging.root.handlers = [logHandler]
logging.root.setLevel(settings.LOG_LEVEL)

logger = logging.getLogger(__name__)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifecycle events"""
    # Startup
    logger.info("Starting AI-PC System API")
    await init_db()
    logger.info("Database initialized")
    await cache.connect()
    logger.info("Cache service initialized")

    yield

    # Shutdown
    logger.info("Shutting down AI-PC System API")
    await cache.disconnect()
    logger.info("Cache disconnected")
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specific methods only
    allow_headers=["*"],
)

# TrustedHost middleware - always specify allowed hosts, even in DEBUG
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "ai-pc.com",
        "*.ai-pc.com"
    ] if settings.DEBUG else ["ai-pc.com", "*.ai-pc.com"]
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["AI"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-pc-api",
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower()
    )