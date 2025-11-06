"""
Redis caching service for performance optimization
"""
import json
import logging
from typing import Optional, Any, List
from redis import asyncio as aioredis
from functools import wraps

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis cache service with async support"""

    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self.available = False

    async def connect(self):
        """Connect to Redis server"""
        try:
            self.redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            await self.redis.ping()
            self.available = True
            logger.info("✅ Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"⚠️  Redis unavailable: {e}. Continuing without cache.")
            self.available = False

    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.available or not self.redis:
            return None

        try:
            value = await self.redis.get(key)
            if value:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            logger.debug(f"Cache MISS: {key}")
            return None
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 300
    ) -> bool:
        """
        Set value in cache with TTL

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default: 5 minutes)

        Returns:
            True if successful, False otherwise
        """
        if not self.available or not self.redis:
            return False

        try:
            serialized = json.dumps(value, default=str)
            await self.redis.setex(key, ttl, serialized)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.available or not self.redis:
            return False

        try:
            await self.redis.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern

        Args:
            pattern: Redis key pattern (e.g., "user:123:*")

        Returns:
            Number of keys deleted
        """
        if not self.available or not self.redis:
            return 0

        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                deleted = await self.redis.delete(*keys)
                logger.debug(f"Cache DELETE pattern {pattern}: {deleted} keys")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0

    async def clear_user_cache(self, user_id: int):
        """Clear all cache entries for a user"""
        await self.delete_pattern(f"user:{user_id}:*")

    async def clear_session_cache(self, session_id: int):
        """Clear cache for a specific session"""
        await self.delete_pattern(f"session:{session_id}:*")


# Global cache instance
cache = CacheService()


def cached(
    key_prefix: str,
    ttl: int = 300,
    key_builder = None
):
    """
    Decorator for caching function results

    Args:
        key_prefix: Prefix for cache key
        ttl: Time to live in seconds
        key_builder: Optional function to build cache key from args

    Example:
        @cached(key_prefix="user_sessions", ttl=300)
        async def get_user_sessions(user_id: int):
            # ... expensive database query
            return sessions
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default: use first arg (usually ID)
                arg_key = args[0] if args else list(kwargs.values())[0]
                cache_key = f"{key_prefix}:{arg_key}"

            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            await cache.set(cache_key, result, ttl=ttl)

            return result
        return wrapper
    return decorator
