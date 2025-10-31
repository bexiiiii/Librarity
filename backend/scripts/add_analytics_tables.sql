-- Add user_sessions and user_referrals tables
-- Run this migration to add new analytics tables

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    chat_interactions INTEGER NOT NULL DEFAULT 0,
    books_interacted INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_session_user_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_session_started ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_session_last_active ON user_sessions(last_active_at);
CREATE INDEX IF NOT EXISTS idx_user_session_token ON user_sessions(session_token);

CREATE TABLE IF NOT EXISTS user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50),
    referral_source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active_referral BOOLEAN NOT NULL DEFAULT FALSE,
    activated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_referral_referrer ON user_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_referred ON user_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_created ON user_referrals(created_at);

-- Add comments
COMMENT ON TABLE user_sessions IS 'Tracks user sessions for active users and time in app metrics';
COMMENT ON TABLE user_referrals IS 'Tracks user referrals for viral coefficient calculation';

COMMENT ON COLUMN user_sessions.duration_seconds IS 'Total session duration in seconds, calculated when session ends';
COMMENT ON COLUMN user_sessions.chat_interactions IS 'Number of chat messages sent during this session';
COMMENT ON COLUMN user_sessions.books_interacted IS 'Number of different books accessed during this session';

COMMENT ON COLUMN user_referrals.is_active_referral IS 'True if referred user became active (made at least 1 chat or uploaded 1 book)';
