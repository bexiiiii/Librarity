-- Active: 1760214685003@@164.90.180.120@5432@librarity
-- Скрипт для обновления подписки пользователя на PRO/ULTIMATE

-- ============================================
-- ПРОВЕРКА: Посмотреть текущие значения ENUM
-- ============================================
-- SELECT enum_range(NULL::subscriptiontier);
-- SELECT enum_range(NULL::subscriptionstatus);

-- ============================================
-- ВАРИАНТ 1: Обновить существующую подписку на PRO
-- ============================================
UPDATE subscriptions 
SET 
    tier = 'ULTIMATE'::subscriptiontier,
    status = 'ACTIVE'::subscriptionstatus,
    price = 9.99,
    currency = 'USD',
    billing_interval = 'monthly',
    token_limit = 100000,
    tokens_used = 0,
    max_books = 10,
    has_citation_mode = true,
    has_author_mode = true,
    has_coach_mode = false,
    has_analytics = true,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month',
    tokens_reset_at = NOW() + INTERVAL '1 month',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'behruz@gmail.com');

-- ============================================
-- ВАРИАНТ 2: Обновить на ULTIMATE
-- ============================================
UPDATE subscriptions 
SET 
    tier = 'ULTIMATE'::subscriptiontier,
    status = 'ACTIVE'::subscriptionstatus,
    price = 19.99,
    currency = 'USD',
    billing_interval = 'monthly',
    token_limit = 300000,
    tokens_used = 0,
    max_books = 50,
    has_citation_mode = true,
    has_author_mode = true,
    has_coach_mode = true,
    has_analytics = true,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month',
    tokens_reset_at = NOW() + INTERVAL '1 month',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'ВАШ_EMAIL');

-- ============================================
-- ВАРИАНТ 3: Создать новую подписку PRO (если не существует)
-- ============================================
INSERT INTO subscriptions (
    id,
    user_id,
    tier,
    status,
    price,
    currency,
    billing_interval,
    token_limit,
    tokens_used,
    max_books,
    has_citation_mode,
    has_author_mode,
    has_coach_mode,
    has_analytics,
    current_period_start,
    current_period_end,
    tokens_reset_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    id,
    'PRO'::subscriptiontier,
    'ACTIVE'::subscriptionstatus,
    9.99,
    'USD',
    'monthly',
    100000,
    0,
    10,
    true,
    true,
    false,
    true,
    NOW(),
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month',
    NOW(),
    NOW()
FROM users 
WHERE email = 'behruz@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- Проверить результат
-- ============================================
SELECT 
    u.email,
    s.tier,
    s.status,
    s.price,
    s.token_limit,
    s.max_books,
    s.has_citation_mode,
    s.has_author_mode,
    s.has_coach_mode,
    s.has_analytics,
    s.current_period_end
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'behruz@gmail.com';
