# OAuth service for Google and GitHub
from typing import Optional, Dict
import httpx
from fastapi import HTTPException
from core.config import settings

class OAuthService:
    def __init__(self):
        self.google_token_url = "https://oauth2.googleapis.com/token"
        self.google_userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        self.github_token_url = "https://github.com/login/oauth/access_token"
        self.github_userinfo_url = "https://api.github.com/user"
    
    def get_google_auth_url(self, state: str) -> str:
        """Get Google OAuth authorization URL"""
        redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/google"
        scope = "openid email profile"
        
        return (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.GOOGLE_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope={scope}&"
            f"state={state}"
        )
    
    def get_github_auth_url(self, state: str) -> str:
        """Get GitHub OAuth authorization URL"""
        redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/github"
        scope = "read:user user:email"
        
        return (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={settings.GITHUB_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={scope}&"
            f"state={state}"
        )
    
    async def exchange_google_code(self, code: str) -> Dict:
        """Exchange Google authorization code for access token"""
        redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/google"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.google_token_url,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange code")
            
            return response.json()
    
    async def get_google_user_info(self, access_token: str) -> Dict:
        """Get Google user information"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.google_userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            return response.json()
    
    async def exchange_github_code(self, code: str) -> Dict:
        """Exchange GitHub authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.github_token_url,
                data={
                    "code": code,
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET
                },
                headers={"Accept": "application/json"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange code")
            
            return response.json()
    
    async def get_github_user_info(self, access_token: str) -> Dict:
        """Get GitHub user information"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.github_userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            return response.json()

oauth_service = OAuthService()
