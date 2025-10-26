# Telegram notification service for admin alerts
import os
import httpx
from typing import Optional

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_CHAT_ID = os.getenv("TELEGRAM_ADMIN_CHAT_ID")

class TelegramService:
    def __init__(self):
        self.bot_token = TELEGRAM_BOT_TOKEN
        self.admin_chat_id = TELEGRAM_ADMIN_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
    
    async def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """Send Telegram message to admin"""
        if not self.bot_token or not self.admin_chat_id:
            print("⚠️ Telegram not configured")
            return False
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/sendMessage",
                    json={
                        "chat_id": self.admin_chat_id,
                        "text": text,
                        "parse_mode": parse_mode
                    }
                )
                return response.status_code == 200
            except Exception as e:
                print(f"Telegram send error: {e}")
                return False
    
    async def notify_new_user(self, username: str, email: str):
        """Notify admin about new user registration"""
        message = f"""
🎉 <b>New User Registered!</b>

👤 Username: {username}
📧 Email: {email}
⏰ Just now
        """
        await self.send_message(message)
    
    async def notify_subscription_upgrade(self, username: str, tier: str, amount: float):
        """Notify admin about subscription upgrade"""
        message = f"""
💰 <b>New Subscription!</b>

👤 User: {username}
🎯 Plan: {tier.upper()}
💵 Amount: ${amount}
⏰ Just now

🚀 Another happy customer!
        """
        await self.send_message(message)
    
    async def notify_book_uploaded(self, username: str, book_title: str):
        """Notify admin about new book upload"""
        message = f"""
📚 <b>New Book Uploaded</b>

👤 User: {username}
📖 Book: {book_title}
⏰ Just now
        """
        await self.send_message(message)
    
    async def notify_error(self, error_type: str, details: str):
        """Notify admin about system errors"""
        message = f"""
🚨 <b>System Error</b>

⚠️ Type: {error_type}
📝 Details: {details}
⏰ Just now

Please check logs!
        """
        await self.send_message(message)

telegram_service = TelegramService()
