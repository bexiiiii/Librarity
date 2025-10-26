#!/usr/bin/env python3
"""
Скрипт для обновления подписки пользователя
Использование: python update_subscription.py <email> <tier>
"""
import sys
import asyncio
from sqlalchemy import select, update
from datetime import datetime, timedelta

# Добавляем путь к backend для импорта модулей
sys.path.insert(0, '/Users/behruztohtamishov/librarity/backend')

from core.database import get_db, engine, Base
from models.user import User
from models.subscription import Subscription, SubscriptionTier, SubscriptionStatus


async def update_user_subscription(email: str, tier: str = "pro"):
    """Обновить подписку пользователя"""
    
    # Конвертируем tier в enum
    tier_map = {
        "free": SubscriptionTier.FREE,
        "pro": SubscriptionTier.PRO,
        "ultimate": SubscriptionTier.ULTIMATE,
    }
    
    if tier.lower() not in tier_map:
        print(f"❌ Ошибка: Недопустимый tier '{tier}'. Используйте: free, pro, ultimate")
        return
    
    subscription_tier = tier_map[tier.lower()]
    
    # Настройки для каждого tier
    tier_settings = {
        SubscriptionTier.FREE: {
            "price": 0.0,
            "token_limit": 10000,
            "max_books": 1,
            "has_citation_mode": False,
            "has_author_mode": False,
            "has_coach_mode": False,
            "has_analytics": False,
        },
        SubscriptionTier.PRO: {
            "price": 9.99,
            "token_limit": 100000,
            "max_books": 10,
            "has_citation_mode": True,
            "has_author_mode": True,
            "has_coach_mode": False,
            "has_analytics": True,
        },
        SubscriptionTier.ULTIMATE: {
            "price": 19.99,
            "token_limit": 300000,
            "max_books": 50,
            "has_citation_mode": True,
            "has_author_mode": True,
            "has_coach_mode": True,
            "has_analytics": True,
        },
    }
    
    settings = tier_settings[subscription_tier]
    
    async with engine.begin() as conn:
        # Найти пользователя
        result = await conn.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ Пользователь с email '{email}' не найден")
            return
        
        print(f"✅ Найден пользователь: {user.email} (ID: {user.id})")
        
        # Проверить существующую подписку
        result = await conn.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        subscription = result.scalar_one_or_none()
        
        now = datetime.utcnow()
        period_end = now + timedelta(days=30)
        
        if subscription:
            # Обновить существующую подписку
            await conn.execute(
                update(Subscription)
                .where(Subscription.user_id == user.id)
                .values(
                    tier=subscription_tier,
                    status=SubscriptionStatus.ACTIVE,
                    price=settings["price"],
                    currency="USD",
                    billing_interval="monthly",
                    token_limit=settings["token_limit"],
                    tokens_used=0,
                    max_books=settings["max_books"],
                    has_citation_mode=settings["has_citation_mode"],
                    has_author_mode=settings["has_author_mode"],
                    has_coach_mode=settings["has_coach_mode"],
                    has_analytics=settings["has_analytics"],
                    current_period_start=now,
                    current_period_end=period_end,
                    tokens_reset_at=period_end,
                    updated_at=now,
                )
            )
            print(f"✅ Подписка обновлена до {tier.upper()}")
        else:
            # Создать новую подписку
            import uuid
            new_subscription = Subscription(
                id=uuid.uuid4(),
                user_id=user.id,
                tier=subscription_tier,
                status=SubscriptionStatus.ACTIVE,
                price=settings["price"],
                currency="USD",
                billing_interval="monthly",
                token_limit=settings["token_limit"],
                tokens_used=0,
                max_books=settings["max_books"],
                has_citation_mode=settings["has_citation_mode"],
                has_author_mode=settings["has_author_mode"],
                has_coach_mode=settings["has_coach_mode"],
                has_analytics=settings["has_analytics"],
                current_period_start=now,
                current_period_end=period_end,
                tokens_reset_at=period_end,
                created_at=now,
                updated_at=now,
            )
            
            conn.sync_connection.execute(
                Subscription.__table__.insert().values(
                    id=new_subscription.id,
                    user_id=new_subscription.user_id,
                    tier=new_subscription.tier,
                    status=new_subscription.status,
                    price=new_subscription.price,
                    currency=new_subscription.currency,
                    billing_interval=new_subscription.billing_interval,
                    token_limit=new_subscription.token_limit,
                    tokens_used=new_subscription.tokens_used,
                    max_books=new_subscription.max_books,
                    has_citation_mode=new_subscription.has_citation_mode,
                    has_author_mode=new_subscription.has_author_mode,
                    has_coach_mode=new_subscription.has_coach_mode,
                    has_analytics=new_subscription.has_analytics,
                    current_period_start=new_subscription.current_period_start,
                    current_period_end=new_subscription.current_period_end,
                    tokens_reset_at=new_subscription.tokens_reset_at,
                    created_at=new_subscription.created_at,
                    updated_at=new_subscription.updated_at,
                )
            )
            print(f"✅ Создана новая подписка {tier.upper()}")
        
        # Показать результат
        result = await conn.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        updated_sub = result.scalar_one()
        
        print("\n📊 Информация о подписке:")
        print(f"   Tier: {updated_sub.tier.value}")
        print(f"   Status: {updated_sub.status.value}")
        print(f"   Price: ${updated_sub.price}")
        print(f"   Token Limit: {updated_sub.token_limit:,}")
        print(f"   Max Books: {updated_sub.max_books}")
        print(f"   Citation Mode: {'✅' if updated_sub.has_citation_mode else '❌'}")
        print(f"   Author Mode: {'✅' if updated_sub.has_author_mode else '❌'}")
        print(f"   Coach Mode: {'✅' if updated_sub.has_coach_mode else '❌'}")
        print(f"   Analytics: {'✅' if updated_sub.has_analytics else '❌'}")
        print(f"   Period End: {updated_sub.current_period_end}")


def main():
    if len(sys.argv) < 2:
        print("❌ Использование: python update_subscription.py <email> [tier]")
        print("   tier: free, pro, ultimate (по умолчанию: pro)")
        sys.exit(1)
    
    email = sys.argv[1]
    tier = sys.argv[2] if len(sys.argv) > 2 else "pro"
    
    print(f"🚀 Обновление подписки для {email} до {tier.upper()}...\n")
    
    asyncio.run(update_user_subscription(email, tier))


if __name__ == "__main__":
    main()
