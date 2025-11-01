"""
Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import structlog
import secrets

from core.database import get_db
from models.user import User
from models.oauth_account import OAuthAccount, OAuthProvider
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus
from schemas import UserCreate, UserLogin, UserResponse, TokenResponse, SuccessResponse
from services.auth_service import auth_service
from services.oauth_service import oauth_service
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
    logger.info("get_me_called", user_id=str(user.id), email=user.email, role=str(user.role), role_value=user.role.value)
    return user


@router.get("/oauth/google")
async def google_oauth_init():
    """Initialize Google OAuth flow"""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    auth_url = oauth_service.get_google_auth_url(state)
    
    return {
        "auth_url": auth_url,
        "state": state
    }


@router.get("/oauth/google/callback")
async def google_oauth_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for tokens
        token_data = await oauth_service.exchange_google_code(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token"
            )
        
        # Get user info from Google
        google_user = await oauth_service.get_google_user_info(access_token)
        
        email = google_user.get("email")
        google_id = google_user.get("id")
        name = google_user.get("name", "")
        picture = google_user.get("picture", "")
        
        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user information from Google"
            )
        
        # Check if OAuth account exists
        result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == OAuthProvider.GOOGLE,
                OAuthAccount.provider_user_id == google_id
            )
        )
        oauth_account = result.scalar_one_or_none()
        
        if oauth_account:
            # Existing OAuth account - update tokens
            oauth_account.access_token = access_token
            oauth_account.refresh_token = token_data.get("refresh_token")
            oauth_account.token_expires_at = datetime.utcnow()
            oauth_account.last_login = datetime.utcnow()
            
            await db.commit()
            await db.refresh(oauth_account)
            
            # Get user
            result = await db.execute(
                select(User).where(User.id == oauth_account.user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
        else:
            # New OAuth login - check if user exists by email
            result = await db.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            
            if user:
                # User exists with this email - link OAuth account
                new_oauth_account = OAuthAccount(
                    user_id=user.id,
                    provider=OAuthProvider.GOOGLE,
                    provider_user_id=google_id,
                    access_token=access_token,
                    refresh_token=token_data.get("refresh_token"),
                    email=email,
                    display_name=name,
                    profile_picture_url=picture,
                    last_login=datetime.utcnow()
                )
                db.add(new_oauth_account)
                
            else:
                # Create new user
                new_user = User(
                    email=email,
                    username=email.split('@')[0],
                    full_name=name,
                    hashed_password="",  # No password for OAuth users
                    last_login=datetime.utcnow(),
                    is_active=True
                )
                db.add(new_user)
                await db.flush()
                
                # Create OAuth account
                new_oauth_account = OAuthAccount(
                    user_id=new_user.id,
                    provider=OAuthProvider.GOOGLE,
                    provider_user_id=google_id,
                    access_token=access_token,
                    refresh_token=token_data.get("refresh_token"),
                    email=email,
                    display_name=name,
                    profile_picture_url=picture,
                    last_login=datetime.utcnow()
                )
                db.add(new_oauth_account)
                
                # Create free subscription
                subscription = Subscription(
                    user_id=new_user.id,
                    tier=SubscriptionTier.FREE,
                    status=SubscriptionStatus.ACTIVE,
                    token_limit=settings.FREE_TIER_TOKEN_LIMIT,
                    max_books=1
                )
                db.add(subscription)
                
                user = new_user
                
                logger.info("user_registered_via_google", user_id=str(user.id), email=user.email)
            
            await db.commit()
            await db.refresh(user)
        
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        logger.info("user_logged_in_via_google", user_id=str(user.id), email=user.email)
        
        # Generate JWT tokens
        tokens = auth_service.create_token_pair(
            user_id=str(user.id),
            email=user.email
        )
        
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("google_oauth_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth authentication failed: {str(e)}"
        )
