CREATE TABLE IF NOT EXISTS anonymous_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL UNIQUE,
    first_visit TIMESTAMP NOT NULL DEFAULT NOW(),
    last_visit TIMESTAMP NOT NULL DEFAULT NOW(),
    visit_count INTEGER NOT NULL DEFAULT 1,
    converted_to_user BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    landing_page TEXT,
    pages_visited INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_visitor_id ON anonymous_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_first_visit ON anonymous_visitors(first_visit);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_converted ON anonymous_visitors(converted_to_user);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_user_id ON anonymous_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_visitors_utm_source ON anonymous_visitors(utm_source);
