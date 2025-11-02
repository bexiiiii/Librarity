-- Migration: Add anonymous_visitors table for visitor tracking
-- Purpose: Track anonymous visitors, conversion funnel, and traffic analytics

CREATE TABLE IF NOT EXISTS anonymous_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Visitor identification
    visitor_id TEXT NOT NULL UNIQUE,
    
    -- Visit tracking
    first_visit TIMESTAMP NOT NULL DEFAULT NOW(),
    last_visit TIMESTAMP NOT NULL DEFAULT NOW(),
    visit_count INTEGER NOT NULL DEFAULT 1,
    
    -- Conversion tracking
    converted_to_user BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Traffic source
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    
    -- Device info
    device_type TEXT,
    browser TEXT,
    os TEXT,
    
    -- Geographic info (optional)
    country TEXT,
    city TEXT,
    
    -- Engagement
    landing_page TEXT,
    pages_visited INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_visitor_id ON anonymous_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_first_visit ON anonymous_visitors(first_visit);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_converted ON anonymous_visitors(converted_to_user);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_user_id ON anonymous_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_utm_source ON anonymous_visitors(utm_source);

-- Comments
COMMENT ON TABLE anonymous_visitors IS 'Tracks anonymous visitors for conversion funnel and traffic analytics';
COMMENT ON COLUMN anonymous_visitors.visitor_id IS 'Unique fingerprint ID from frontend';
COMMENT ON COLUMN anonymous_visitors.converted_to_user IS 'True when visitor registers';
COMMENT ON COLUMN anonymous_visitors.pages_visited IS 'Total number of pages visited';
