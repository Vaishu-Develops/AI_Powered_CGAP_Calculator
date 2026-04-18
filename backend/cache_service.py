import os
import hashlib
import json
import logging
from typing import Optional, Dict, Any
from upstash_redis import Redis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger('RedisCache')

class RedisCacheService:
    def __init__(self):
        # Support both REST URL/Token and standard Redis URL
        self.url = os.getenv("UPSTASH_REDIS_REST_URL") or os.getenv("REDIS_URL")
        self.token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
        self.ttl = int(os.getenv("REDIS_TTL_SECONDS", 3600))
        self.client = None
        
        if self.url:
            try:
                # If we have a token, it's Upstash HTTP REST
                if self.token:
                    self.client = Redis(url=self.url, token=self.token)
                    logger.info(f"Connected to Upstash Redis via REST (TTL: {self.ttl}s)")
                else:
                    # Fallback to standard redis protocol
                    from redis import Redis as StandardRedis
                    self.client = StandardRedis.from_url(self.url, decode_responses=True)
                    logger.info(f"Connected to Redis via standard protocol (TTL: {self.ttl}s)")
            except Exception as e:
                logger.error(f"Failed to initialize Redis: {e}")
        else:
            logger.warning("Redis URL not found. Caching disabled.")

    def _get_image_hash(self, contents: bytes) -> str:
        """Generate a unique MD5 hash for image bytes."""
        return hashlib.md5(contents).hexdigest()

    def get_ocr_cache(self, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """Check if OCR results for this image exist in cache."""
        if not self.client:
            return None
            
        try:
            image_hash = self._get_image_hash(image_bytes)
            key = f"ocr_cache:{image_hash}"
            
            cached_data = self.client.get(key)
            if cached_data:
                # upstash-redis returns parsed dict or string depending on library version/type
                if isinstance(cached_data, dict):
                    return cached_data
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            
        return None

    def set_ocr_cache(self, image_bytes: bytes, result: Dict[str, Any]):
        """Store OCR results in cache with expiration."""
        if not self.client:
            return
            
        try:
            image_hash = self._get_image_hash(image_bytes)
            key = f"ocr_cache:{image_hash}"
            
            # Use ex (TTL) to ensure we don't hit memory limits on free tiers
            # upstash-redis uses ex=... argument
            self.client.set(key, json.dumps(result), ex=self.ttl)
        except Exception as e:
            logger.error(f"Redis set error: {e}")

# Singleton instance
cache_service = RedisCacheService()
