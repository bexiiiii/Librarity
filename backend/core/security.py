# Security utilities - Rate limiting, encryption, validation
from functools import wraps
from fastapi import HTTPException, Request
from typing import Callable
import redis.asyncio as redis
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
import PyPDF2
import io
import os

# Redis client for rate limiting
redis_client = None

async def get_redis():
    """Get Redis client for rate limiting"""
    global redis_client
    if redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = await redis.from_url(redis_url, decode_responses=True)
    return redis_client

# Rate limiter decorator
def rate_limit(max_requests: int, window_seconds: int):
    """Rate limit decorator using Redis"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Get client IP
            client_ip = request.client.host
            
            # Redis key
            key = f"rate_limit:{func.__name__}:{client_ip}"
            
            r = await get_redis()
            
            # Get current count
            current = await r.get(key)
            
            if current is None:
                # First request in window
                await r.setex(key, window_seconds, 1)
            else:
                current_count = int(current)
                if current_count >= max_requests:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds} seconds"
                    )
                # Increment counter
                await r.incr(key)
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# Encryption utility
class DataEncryption:
    """Encrypt sensitive user data"""
    
    def __init__(self):
        encryption_key = os.getenv("ENCRYPTION_KEY")
        if not encryption_key:
            # Generate new key if not exists
            encryption_key = Fernet.generate_key().decode()
            print(f"⚠️ ENCRYPTION_KEY not set. Generated new key: {encryption_key}")
        
        self.fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt string data"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt string data"""
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def encrypt_dict(self, data: dict) -> dict:
        """Encrypt dictionary values"""
        import json
        json_str = json.dumps(data)
        return {"encrypted": self.encrypt(json_str)}
    
    def decrypt_dict(self, encrypted_data: dict) -> dict:
        """Decrypt dictionary values"""
        import json
        decrypted = self.decrypt(encrypted_data["encrypted"])
        return json.loads(decrypted)

encryption = DataEncryption()

# PDF validation
class FileValidator:
    """Validate uploaded files for security"""
    
    ALLOWED_EXTENSIONS = {'.pdf', '.epub', '.txt'}
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    
    @staticmethod
    def validate_extension(filename: str) -> bool:
        """Check if file extension is allowed"""
        from pathlib import Path
        ext = Path(filename).suffix.lower()
        return ext in FileValidator.ALLOWED_EXTENSIONS
    
    @staticmethod
    def validate_size(file_size: int) -> bool:
        """Check if file size is within limits"""
        return file_size <= FileValidator.MAX_FILE_SIZE
    
    @staticmethod
    async def validate_pdf_content(file_content: bytes) -> bool:
        """Validate PDF file is not malicious"""
        try:
            # Try to parse PDF
            pdf_file = io.BytesIO(file_content)
            reader = PyPDF2.PdfReader(pdf_file)
            
            # Check if PDF can be read
            if len(reader.pages) == 0:
                return False
            
            # Check for JavaScript (common in malicious PDFs)
            for page in reader.pages:
                if '/JS' in str(page) or '/JavaScript' in str(page):
                    return False
            
            # Check for embedded files
            if '/EmbeddedFile' in str(reader.trailer):
                return False
            
            return True
        except Exception as e:
            print(f"PDF validation error: {e}")
            return False
    
    @staticmethod
    async def validate_epub_content(file_content: bytes) -> bool:
        """Validate EPUB file"""
        try:
            import zipfile
            epub_file = io.BytesIO(file_content)
            
            # EPUB is a ZIP file
            with zipfile.ZipFile(epub_file, 'r') as zip_ref:
                # Check for suspicious files
                for filename in zip_ref.namelist():
                    if filename.endswith('.exe') or filename.endswith('.sh'):
                        return False
            
            return True
        except Exception as e:
            print(f"EPUB validation error: {e}")
            return False
    
    @staticmethod
    async def sanitize_text_content(content: str) -> str:
        """Sanitize text content"""
        # Remove potential script tags
        import re
        content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'<iframe[^>]*>.*?</iframe>', '', content, flags=re.DOTALL | re.IGNORECASE)
        return content

file_validator = FileValidator()

# CORS and security headers middleware
class SecurityHeadersMiddleware:
    """Add security headers to all responses"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                
                # Security headers
                headers[b"x-content-type-options"] = b"nosniff"
                headers[b"x-frame-options"] = b"DENY"
                headers[b"x-xss-protection"] = b"1; mode=block"
                headers[b"strict-transport-security"] = b"max-age=31536000; includeSubDomains"
                
                # Content Security Policy
                csp = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self' data:; "
                    "connect-src 'self' https:; "
                )
                headers[b"content-security-policy"] = csp.encode()
                
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_with_headers)

# IP-based rate limiting for sensitive endpoints
class IPRateLimiter:
    """More sophisticated IP-based rate limiting"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def check_rate_limit(
        self,
        ip: str,
        endpoint: str,
        max_requests: int,
        window_seconds: int
    ) -> bool:
        """Check if IP has exceeded rate limit"""
        key = f"rate_limit:{endpoint}:{ip}"
        
        current = await self.redis.get(key)
        
        if current is None:
            await self.redis.setex(key, window_seconds, 1)
            return True
        
        current_count = int(current)
        if current_count >= max_requests:
            return False
        
        await self.redis.incr(key)
        return True
    
    async def get_remaining_requests(
        self,
        ip: str,
        endpoint: str,
        max_requests: int
    ) -> int:
        """Get remaining requests for IP"""
        key = f"rate_limit:{endpoint}:{ip}"
        current = await self.redis.get(key)
        
        if current is None:
            return max_requests
        
        return max(0, max_requests - int(current))

# JWT token blacklist
class TokenBlacklist:
    """Manage blacklisted JWT tokens"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def add_token(self, token: str, expires_in: int):
        """Add token to blacklist"""
        key = f"blacklist:{token}"
        await self.redis.setex(key, expires_in, "1")
    
    async def is_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        key = f"blacklist:{token}"
        return await self.redis.exists(key) > 0
