# Enhanced Swagger/ReDoc configuration
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

def custom_openapi(app: FastAPI):
    """Generate custom OpenAPI schema with enhanced documentation"""
    
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Librarity API",
        version="1.0.0",
        description="""
# Librarity - AI Book Intelligence Platform

Upload books and interact with them using advanced AI.

## Features
- 📚 **Book Upload**: PDF, EPUB, TXT support
- 🤖 **4 AI Chat Modes**: Tutor, Summarizer, Questioner, Free Chat
- 🔍 **Vector Search**: Semantic search across your library
- 📊 **Analytics**: Track reading habits and AI usage
- 🏆 **Gamification**: Leaderboards and achievements
- 🔐 **Secure**: Rate limiting, encryption, JWT auth

## Authentication
All endpoints (except `/auth/*`) require JWT authentication.

Include the token in the `Authorization` header:
```
Authorization: Bearer <your_token>
```

## Rate Limits
- API: 10 requests/second
- Auth: 5 requests/minute
- Chat: Based on subscription tier

## Error Codes
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Missing or invalid token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `422`: Validation Error - Invalid request body
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Something went wrong

## Support
- Email: support@librarity.com
- Docs: https://docs.librarity.com
        """,
        routes=app.routes,
        servers=[
            {"url": "http://localhost:8000", "description": "Development"},
            {"url": "https://api.librarity.com", "description": "Production"}
        ],
        tags=[
            {
                "name": "auth",
                "description": "Authentication and registration"
            },
            {
                "name": "books",
                "description": "Book upload and management"
            },
            {
                "name": "chat",
                "description": "AI chat interactions with books"
            },
            {
                "name": "subscriptions",
                "description": "Subscription and billing management"
            },
            {
                "name": "admin",
                "description": "Admin-only endpoints (requires admin role)"
            },
            {
                "name": "health",
                "description": "Health check and monitoring"
            },
            {
                "name": "analytics",
                "description": "Usage analytics and statistics"
            },
            {
                "name": "sharing",
                "description": "Social sharing features"
            },
            {
                "name": "leaderboard",
                "description": "Gamification and rankings"
            }
        ],
        contact={
            "name": "Librarity Support",
            "email": "support@librarity.com",
            "url": "https://librarity.com"
        },
        license_info={
            "name": "Commercial License",
            "url": "https://librarity.com/license"
        }
    )
    
    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token obtained from `/api/auth/login`"
        }
    }
    
    # Apply security globally
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema
