# Email service using Resend
import os
from typing import Optional
import httpx
from jinja2 import Template

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@librarity.com")

class EmailService:
    def __init__(self):
        self.api_key = RESEND_API_KEY
        self.base_url = "https://api.resend.com"
        
    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None
    ) -> bool:
        """Send email via Resend"""
        if not self.api_key:
            print("⚠️ RESEND_API_KEY not configured")
            return False
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": FROM_EMAIL,
                        "to": [to],
                        "subject": subject,
                        "html": html,
                        "text": text or ""
                    }
                )
                return response.status_code == 200
            except Exception as e:
                print(f"Email send error: {e}")
                return False
    
    async def send_welcome_email(self, to: str, username: str):
        """Send welcome email to new user"""
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
                <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 40px;">
                    <h1 style="color: #fff; margin-bottom: 20px;">✨ Welcome to Librarity!</h1>
                    <p style="font-size: 18px; line-height: 1.6;">
                        Hi {username},
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Welcome to the future of reading! 🚀 You now have access to AI-powered book intelligence.
                    </p>
                    <ul style="font-size: 16px; line-height: 1.8;">
                        <li>💬 Chat with your books using AI</li>
                        <li>📚 Get instant summaries and insights</li>
                        <li>🎯 4 powerful chat modes</li>
                        <li>⚡ 10,000 free tokens to start</li>
                    </ul>
                    <a href="http://localhost:3000" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background: #fff; color: #667eea; text-decoration: none; border-radius: 10px; font-weight: bold;">
                        Start Reading Now
                    </a>
                    <p style="margin-top: 30px; font-size: 14px; opacity: 0.8;">
                        Need help? Reply to this email or visit our docs.
                    </p>
                </div>
            </body>
        </html>
        """
        await self.send_email(to, "Welcome to Librarity! 🎉", html)
    
    async def send_subscription_upgrade_email(self, to: str, tier: str):
        """Notify user about subscription upgrade"""
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
                <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 20px; padding: 40px;">
                    <h1 style="color: #fff;">🚀 Subscription Upgraded!</h1>
                    <p style="font-size: 18px; line-height: 1.6;">
                        You're now on the <strong>{tier.upper()}</strong> plan!
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Enjoy unlimited access to all premium features. 🎉
                    </p>
                    <a href="http://localhost:3000/account" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background: #fff; color: #f5576c; text-decoration: none; border-radius: 10px; font-weight: bold;">
                        View My Account
                    </a>
                </div>
            </body>
        </html>
        """
        await self.send_email(to, f"Welcome to {tier.upper()}! 🎉", html)
    
    async def send_book_processed_email(self, to: str, book_title: str):
        """Notify user when book processing is complete"""
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px;">
                <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 20px; padding: 40px;">
                    <h1 style="color: #fff;">📚 Your Book is Ready!</h1>
                    <p style="font-size: 18px; line-height: 1.6;">
                        <strong>{book_title}</strong> has been processed and is ready to chat!
                    </p>
                    <a href="http://localhost:3000/chat" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background: #fff; color: #4facfe; text-decoration: none; border-radius: 10px; font-weight: bold;">
                        Start Chatting
                    </a>
                </div>
            </body>
        </html>
        """
        await self.send_email(to, f"📚 {book_title} is ready!", html)

email_service = EmailService()
