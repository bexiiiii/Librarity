"""
Cache Service - Redis caching for AI responses and embeddings
"""
import redis
import json
import hashlib
from typing import Optional, Dict, Any, List
from datetime import timedelta
import logging

from core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based caching service"""
    
    def __init__(self):
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"Redis not available, caching disabled: {e}")
            self.redis_client = None
            self.enabled = False
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_parts = [prefix] + [str(arg) for arg in args]
        if kwargs:
            key_parts.append(json.dumps(kwargs, sort_keys=True))
        
        key_string = ":".join(key_parts)
        # Hash long keys
        if len(key_string) > 200:
            key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]
            return f"{prefix}:hash:{key_hash}"
        return key_string
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL in seconds"""
        if not self.enabled:
            return False
        
        try:
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.enabled:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.enabled:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error: {e}")
            return 0
    
    # --- Specialized cache methods ---
    
    def get_chat_response(self, book_id: str, question: str, mode: str) -> Optional[Dict]:
        """Get cached chat response"""
        key = self._generate_key("chat", book_id, question, mode)
        return self.get(key)
    
    def set_chat_response(self, book_id: str, question: str, mode: str, 
                         response: Dict, ttl: int = 3600) -> bool:
        """Cache chat response (1 hour default)"""
        key = self._generate_key("chat", book_id, question, mode)
        return self.set(key, response, ttl)
    
    def get_embedding(self, text: str) -> Optional[List[float]]:
        """Get cached embedding"""
        key = self._generate_key("embed", text)
        return self.get(key)
    
    def set_embedding(self, text: str, embedding: List[float], ttl: int = 86400) -> bool:
        """Cache embedding (24 hours default)"""
        key = self._generate_key("embed", text)
        return self.set(key, embedding, ttl)
    
    def get_book_summary(self, book_id: str) -> Optional[Dict]:
        """Get cached book summary"""
        key = self._generate_key("summary", book_id)
        return self.get(key)
    
    def set_book_summary(self, book_id: str, summary: Dict, ttl: int = 604800) -> bool:
        """Cache book summary (7 days default)"""
        key = self._generate_key("summary", book_id)
        return self.set(key, summary, ttl)
    
    def invalidate_book_cache(self, book_id: str) -> int:
        """Invalidate all cache for a book"""
        patterns = [
            f"chat:{book_id}:*",
            f"summary:{book_id}",
        ]
        count = 0
        for pattern in patterns:
            count += self.delete_pattern(pattern)
        return count
    
    def get_user_books_list(self, user_id: str, page: int, limit: int) -> Optional[Dict]:
        """Get cached books list for user"""
        key = self._generate_key("books_list", user_id, page, limit)
        return self.get(key)
    
    def set_user_books_list(self, user_id: str, page: int, limit: int, 
                           data: Dict, ttl: int = 300) -> bool:
        """Cache books list (5 minutes default)"""
        key = self._generate_key("books_list", user_id, page, limit)
        return self.set(key, data, ttl)
    
    def invalidate_user_books_cache(self, user_id: str) -> int:
        """Invalidate books list cache for user"""
        return self.delete_pattern(f"books_list:{user_id}:*")


# Singleton instance
_cache_service = None


def get_cache_service() -> CacheService:
    """Get cache service singleton"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
