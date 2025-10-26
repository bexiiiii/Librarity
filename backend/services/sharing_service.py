# Social sharing service - Generate beautiful share cards
from typing import Optional
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.shared_content import SharedContent
from models.book import Book
from PIL import Image, ImageDraw, ImageFont
import io
import base64

class SharingService:
    def __init__(self):
        self.base_url = "http://localhost:3000/share"
    
    async def create_share_card(
        self,
        db: AsyncSession,
        user_id: str,
        content_type: str,
        title: str,
        content: str,
        book_id: Optional[str] = None,
        theme: str = 'gradient_purple'
    ) -> SharedContent:
        """Create shareable content card"""
        
        # Generate short URL
        short_id = str(uuid.uuid4())[:8]
        share_url = f"{self.base_url}/{short_id}"
        
        # Create database entry
        shared = SharedContent(
            user_id=uuid.UUID(user_id),
            book_id=uuid.UUID(book_id) if book_id else None,
            content_type=content_type,
            title=title,
            content=content,
            theme=theme,
            share_url=share_url
        )
        
        db.add(shared)
        await db.commit()
        await db.refresh(shared)
        
        return shared
    
    async def generate_quote_image(
        self,
        quote: str,
        author: str,
        book_title: str,
        theme: str = 'gradient_purple'
    ) -> bytes:
        """Generate beautiful quote image for social media"""
        
        # Image dimensions for Instagram/TikTok
        width, height = 1080, 1920
        
        # Create gradient background
        img = Image.new('RGB', (width, height))
        draw = ImageDraw.Draw(img)
        
        # Gradient colors based on theme
        themes = {
            'gradient_purple': [(103, 126, 234), (118, 75, 162)],
            'gradient_blue': [(79, 172, 254), (0, 242, 254)],
            'gradient_pink': [(240, 147, 251), (245, 87, 108)],
            'dark': [(10, 10, 10), (50, 50, 50)]
        }
        
        colors = themes.get(theme, themes['gradient_purple'])
        
        # Simple gradient fill
        for y in range(height):
            r = int(colors[0][0] + (colors[1][0] - colors[0][0]) * y / height)
            g = int(colors[0][1] + (colors[1][1] - colors[0][1]) * y / height)
            b = int(colors[0][2] + (colors[1][2] - colors[0][2]) * y / height)
            draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))
        
        # Add quote text (would use custom fonts in production)
        # For now, return the base image
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return img_byte_arr.getvalue()
    
    async def track_share_view(self, db: AsyncSession, share_url: str):
        """Track when someone views shared content"""
        result = await db.execute(
            select(SharedContent).where(SharedContent.share_url == share_url)
        )
        shared = result.scalar_one_or_none()
        
        if shared:
            shared.view_count += 1
            await db.commit()
    
    async def get_trending_shares(self, db: AsyncSession, limit: int = 10):
        """Get most popular shared content"""
        result = await db.execute(
            select(SharedContent)
            .where(SharedContent.is_public == True)
            .order_by(SharedContent.share_count.desc())
            .limit(limit)
        )
        return result.scalars().all()

sharing_service = SharingService()
