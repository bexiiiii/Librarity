"""
Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import structlog

from core.database import get_db
from models.user import User
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from schemas import UserCreate, UserLogin, UserResponse, TokenResponse, SuccessResponse
from services.auth_service import auth_service
from core.config import settings
from fastapi.security import OAuth2PasswordBearer

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter()
logger = structlog.get_logger()


# Dependency to get current user from JWT
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    
    payload = auth_service.decode_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    
    # Check if user exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = auth_service.get_password_hash(user_data.password)
    
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        last_login=datetime.utcnow()
    )
    
    db.add(new_user)
    await db.flush()
    
    # Create free subscription
    subscription = Subscription(
        user_id=new_user.id,
        tier=SubscriptionTier.FREE,
        status=SubscriptionStatus.ACTIVE,
        token_limit=settings.FREE_TIER_TOKEN_LIMIT,
        max_books=1
    )
    
    db.add(subscription)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info("user_registered", user_id=str(new_user.id), email=new_user.email)
    
    # Generate tokens
    tokens = auth_service.create_token_pair(
        user_id=str(new_user.id),
        email=new_user.email
    )
    
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user"""
    
    # Find user
    result = await db.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not auth_service.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    logger.info("user_logged_in", user_id=str(user.id), email=user.email)
    
    # Generate tokens
    tokens = auth_service.create_token_pair(
        user_id=str(user.id),
        email=user.email
    )
    
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token"""
    
    # Decode refresh token
    try:
        payload = auth_service.decode_token(refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        # Generate new tokens
        tokens = auth_service.create_token_pair(user_id=user_id, email=email)
        
        logger.info("token_refreshed", user_id=user_id)
        return tokens
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        ) from e


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user)
):
    """Get current user info"""
    return user
