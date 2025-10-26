"""
Script to make a user an admin
Usage: python scripts/make_admin.py <user_email>
"""

import sys
import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent directory to path
sys.path.insert(0, '/Users/behruztohtamishov/librarity/backend')

from core.database import get_db, engine
from models.user import User

async def make_admin(email: str):
    """Make a user an admin"""
    async with AsyncSession(engine) as db:
        # Find user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User with email '{email}' not found")
            return
        
        # Update role
        user.role = "admin"
        await db.commit()
        
        print(f"✅ User '{email}' is now an admin!")
        print(f"   ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Role: {user.role}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/make_admin.py <user_email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(make_admin(email))
