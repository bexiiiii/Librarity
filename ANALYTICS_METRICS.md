# Analytics & Metrics System

## Overview
This document describes the analytics and metrics system added to the Librarity admin dashboard. The system tracks key metrics for understanding user behavior, engagement, and business performance.

## New Metrics

### 1. 👥 Active Users (Real-time)
**Purpose**: Track how many users are currently using the platform

**Metrics**:
- **Active Now**: Users active in last 5 minutes (considered "online")
- **Active Last Hour**: Users with activity in the last 60 minutes
- **Active Today**: Unique users who have been active today

**API Endpoint**: `GET /api/admin/stats/active-users`

**Database Table**: `user_sessions`

**How it works**:
- Tracks user sessions via middleware
- Updates `last_active_at` timestamp on each request
- Users are considered "active now" if last activity < 5 minutes
- Sessions auto-close after 30 minutes of inactivity

---

### 2. 💬 Most Popular Chat Modes
**Purpose**: Understand which chat modes users prefer

**Metrics**:
- Mode usage count and percentage
- Shows top 3 most used modes
- Total chats analyzed

**API Endpoint**: `GET /api/admin/stats/chat-modes?days=30`

**Database Table**: `usage_logs` (where `activity_type='chat'` and `chat_mode` is not null)

**Available Modes**:
- `book_brain` - Direct book Q&A
- `author` - Chat with book's author
- `coach` - Coaching mode
- `citation` - Citation-focused answers

---

### 3. ⏱️ Time in App
**Purpose**: Measure user engagement through time spent

**Metrics**:
- **Average Session Duration**: Mean time per session
- **Average Per User**: Total time divided by unique users
- **Total Hours**: Sum of all session durations
- **Average Interactions**: Mean number of chat interactions per session

**API Endpoint**: `GET /api/admin/stats/time-in-app?days=30`

**Database Table**: `user_sessions`

**Calculation**:
```python
duration_seconds = ended_at - started_at
average_session = AVG(duration_seconds) / 60  # minutes
average_per_user = SUM(duration_seconds) / COUNT(DISTINCT user_id) / 60
```

**Note**: "Time with book" specifically tracks chat interactions, showing engagement quality.

---

### 4. 🚀 Viral Coefficient
**Purpose**: Measure organic growth through user referrals

**Metrics**:
- **Viral Coefficient (K)**: How many new users each user brings
- **Simple Coefficient**: Active referrals per new user
- **Total Referrals**: All referral links created
- **Active Referrals**: Referrals who became active users
- **Referring Users**: Users who made at least one referral

**API Endpoint**: `GET /api/admin/stats/viral-coefficient?days=30`

**Database Table**: `user_referrals`

**Formula**:
```
K = (Average invites per user) × (Conversion rate of invites)

Where:
- Average invites = total_referrals / new_users
- Conversion rate = active_referrals / total_referrals

Interpretation:
- K > 1: Exponential growth (viral!)
- K = 1: Linear growth (stable)
- K < 1: Need to improve referrals
```

**Active Referral**: A referred user who has:
1. Uploaded at least 1 book, OR
2. Created at least 1 chat

---

### 5. 🔄 Retention (7-day & 30-day)
**Purpose**: Measure how many users come back after signup

**Metrics**:
- **7-day Retention**: % of users who return after 7 days
- **30-day Retention**: % of users who return after 30 days
- Cohort sizes for each period
- Number of retained users

**API Endpoint**: `GET /api/admin/stats/retention`

**Database Table**: `users` (using `created_at` and `last_login`)

**Calculation**:
```python
# 7-day retention
cohort = users who signed up 7-14 days ago
retained = cohort users who logged in within last 7 days
retention_7day = (retained / cohort) × 100%

# 30-day retention  
cohort = users who signed up 30-60 days ago
retained = cohort users who logged in within last 30 days
retention_30day = (retained / cohort) × 100%
```

**Industry Benchmarks**:
- 7-day: 20-40% is good
- 30-day: 10-25% is good

---

### 6. 💎 Conversion to Premium
**Purpose**: Track monetization performance

**Metrics**:
- **Overall Conversion Rate**: % of all users on paid plans
- **30-day Conversion Rate**: % of new users who upgraded
- **Premium Users**: Total on Pro or Ultimate plans
- **Breakdown**: Pro vs Ultimate distribution
- **Recent Conversions**: Paid subscriptions in last 30 days

**API Endpoint**: `GET /api/admin/stats/conversion-to-premium`

**Database Tables**: `subscriptions`, `payments`

**Calculation**:
```python
premium_users = Pro + Ultimate tiers
overall_conversion = (premium_users / total_users) × 100%

# 30-day conversion
new_users_30day = users created in last 30 days
conversions_30day = payments completed in last 30 days (distinct users)
conversion_30day = (conversions_30day / new_users_30day) × 100%
```

**SaaS Benchmarks**:
- Free to Paid: 2-5% is typical
- 5-10% is good
- 10%+ is excellent

---

## Database Schema

### user_sessions Table
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    started_at TIMESTAMP,
    last_active_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    chat_interactions INTEGER DEFAULT 0,
    books_interacted INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
```

### user_referrals Table
```sql
CREATE TABLE user_referrals (
    id UUID PRIMARY KEY,
    referrer_user_id UUID REFERENCES users(id),
    referred_user_id UUID REFERENCES users(id),
    referral_code VARCHAR(50),
    referral_source VARCHAR(100),
    created_at TIMESTAMP,
    is_active_referral BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP
);
```

---

## Implementation Details

### Backend (FastAPI)

**New Endpoints** (`backend/api/admin.py`):
```python
GET /api/admin/stats/active-users
GET /api/admin/stats/chat-modes?days=30
GET /api/admin/stats/time-in-app?days=30
GET /api/admin/stats/viral-coefficient?days=30
GET /api/admin/stats/retention
GET /api/admin/stats/conversion-to-premium
```

**Session Tracking Middleware** (`backend/core/session_middleware.py`):
```python
async def track_user_session(request: Request, call_next):
    # Creates/updates session on each authenticated request
    # Auto-closes sessions after 30 minutes of inactivity
    # Tracks chat interactions and books accessed
```

### Frontend (Next.js/React)

**API Client** (`librarity/lib/api.ts`):
```typescript
getActiveUsersStats()
getChatModesStats(days = 30)
getTimeInAppStats(days = 30)
getViralCoefficientStats(days = 30)
getRetentionStats()
getConversionToPremiumStats()
```

**Dashboard Component** (`components/admin/DashboardTab.tsx`):
- 6 new metric cards with gradient backgrounds
- Real-time data updates every 30 seconds
- Visual indicators (emojis, colors, icons)
- Progress bars and trend indicators

---

## Setup Instructions

### 1. Run Database Migration
```bash
# Connect to your database
psql -U your_user -d librarity

# Run migration
\i backend/scripts/add_analytics_tables.sql
```

### 2. Update Models
The models are already added in `backend/models/user_session.py` and imported in `backend/models/__init__.py`.

### 3. Add Middleware (Optional - for session tracking)
In `backend/main.py`, add:
```python
from core.session_middleware import track_user_session

app.middleware("http")(track_user_session)
```

### 4. Test Endpoints
```bash
# Get active users
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/stats/active-users

# Get chat modes
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/admin/stats/chat-modes?days=30
```

---

## Data Privacy & Performance

### Privacy Considerations
- Session tokens are stored but never exposed
- IP addresses stored for fraud detection (can be hashed if needed)
- User agents stored for device analytics
- All data is aggregated for analytics

### Performance Optimizations
- Indexes on `user_id`, `created_at`, `is_active`
- Queries use time-based WHERE clauses
- Auto-cleanup of old sessions (>30 min inactive)
- Dashboard auto-refresh every 30 seconds (configurable)

### Data Retention
- Sessions: Keep for 90 days
- Referrals: Keep indefinitely (for attribution)
- Usage logs: Keep for 90 days (configurable)

---

## Future Enhancements

### Potential Additions
1. **Cohort Analysis**: Track user cohorts by signup date
2. **Funnel Analytics**: Signup → Upload → Chat → Subscribe
3. **A/B Testing**: Track feature adoption rates
4. **Revenue Metrics**: MRR, ARR, ARPU, LTV
5. **Churn Analysis**: Predict and prevent user churn
6. **Geographic Analytics**: Usage by country/region
7. **Device Analytics**: Desktop vs Mobile engagement

### Export Capabilities
- CSV export for all metrics
- Date range filters
- Visualization exports (charts as PNG)
- Scheduled reports via email

---

## Troubleshooting

### No data showing for new metrics?
1. **Run migration**: Ensure `user_sessions` and `user_referrals` tables exist
2. **Check authentication**: Metrics require admin role
3. **Wait for data**: New sessions/referrals take time to accumulate
4. **Check logs**: Look for errors in FastAPI logs

### Active users showing 0?
- Session tracking middleware needs to be enabled
- Users need to make authenticated requests
- Check if `user_sessions` table has data: `SELECT COUNT(*) FROM user_sessions;`

### Viral coefficient always 0?
- Referral system needs implementation
- Create test referrals: `INSERT INTO user_referrals ...`
- Mark referrals as active when users engage

---

## API Response Examples

### Active Users
```json
{
  "active_now": 12,
  "active_last_hour": 45,
  "active_today": 156,
  "timestamp": "2024-11-01T10:30:00Z"
}
```

### Chat Modes
```json
{
  "modes": [
    {"mode": "book_brain", "count": 1250, "percentage": 62.5},
    {"mode": "author", "count": 500, "percentage": 25.0},
    {"mode": "coach", "count": 250, "percentage": 12.5}
  ],
  "total_chats": 2000,
  "period_days": 30
}
```

### Time in App
```json
{
  "average_session_minutes": 15.3,
  "average_per_user_minutes": 45.7,
  "total_hours": 523.5,
  "total_sessions": 2050,
  "average_interactions_per_session": 8.2,
  "period_days": 30
}
```

### Viral Coefficient
```json
{
  "viral_coefficient": 1.25,
  "simple_coefficient": 0.85,
  "new_users": 150,
  "total_referrals": 200,
  "active_referrals": 128,
  "referring_users": 95,
  "average_invites_per_user": 1.33,
  "referral_conversion_rate": 64.0,
  "period_days": 30,
  "interpretation": "K > 1 means exponential growth"
}
```

### Retention
```json
{
  "retention_7day": {
    "percentage": 35.2,
    "cohort_size": 120,
    "retained_users": 42,
    "description": "Users who returned after 7 days"
  },
  "retention_30day": {
    "percentage": 18.5,
    "cohort_size": 200,
    "retained_users": 37,
    "description": "Users who returned after 30 days"
  }
}
```

### Conversion to Premium
```json
{
  "overall_conversion_percentage": 8.5,
  "conversion_30day_percentage": 12.3,
  "total_users": 1000,
  "free_users": 915,
  "premium_users": 85,
  "breakdown": {
    "pro": 65,
    "ultimate": 20
  },
  "recent_conversions_30day": 15,
  "new_users_30day": 122
}
```

---

## Support

For questions or issues:
- Check FastAPI logs: `tail -f logs/app.log`
- Database issues: Check PostgreSQL logs
- Frontend issues: Check browser console
- Performance: Monitor database query times

---

## Changelog

### Version 1.0 (2024-11-01)
- ✅ Added 6 new key metrics to admin dashboard
- ✅ Created `user_sessions` and `user_referrals` tables
- ✅ Implemented session tracking middleware
- ✅ Added beautiful metric cards with gradients
- ✅ Real-time active users tracking
- ✅ Chat mode popularity analytics
- ✅ Time in app measurement
- ✅ Viral coefficient calculation
- ✅ 7-day and 30-day retention tracking
- ✅ Conversion to premium metrics
