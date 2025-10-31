# Quick Start Guide - New Analytics Metrics

## ✅ What Was Added

### 6 New Metrics in Admin Dashboard:

1. **👥 Active Users** - Real-time online users (now, last hour, today)
2. **💬 Most Popular Chat Modes** - Which modes users prefer
3. **⏱️ Time in App** - Average session duration and engagement
4. **🚀 Viral Coefficient** - User referral effectiveness (K-factor)
5. **🔄 Retention** - 7-day and 30-day user retention rates
6. **💎 Conversion to Premium** - Free to paid conversion metrics

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Migration
```bash
cd backend
psql -U your_postgres_user -d your_database_name -f scripts/add_analytics_tables.sql
```

Or if you're using docker-compose:
```bash
docker-compose exec postgres psql -U librarity -d librarity -f /app/backend/scripts/add_analytics_tables.sql
```

This creates two new tables:
- `user_sessions` - Tracks active sessions and time in app
- `user_referrals` - Tracks user referrals for viral coefficient

### Step 2: Restart Backend
The new API endpoints are already added in `backend/api/admin.py`:
```bash
# If running locally
cd backend
uvicorn main:app --reload

# If using docker-compose
docker-compose restart backend
```

### Step 3: View in Admin Dashboard
```bash
# Start frontend (if not running)
cd librarity
npm run dev
```

Visit: `http://localhost:3000/admin`

The new metrics will appear automatically! 🎉

## 📊 New API Endpoints

All endpoints require admin authentication:

```bash
# Active users
GET /api/admin/stats/active-users

# Chat modes popularity
GET /api/admin/stats/chat-modes?days=30

# Time in app
GET /api/admin/stats/time-in-app?days=30

# Viral coefficient
GET /api/admin/stats/viral-coefficient?days=30

# Retention rates
GET /api/admin/stats/retention

# Conversion to premium
GET /api/admin/stats/conversion-to-premium
```

## 🎨 UI Changes

The admin dashboard now has **3 rows of metrics**:

### Row 1: Core Metrics (Existing)
- Total Users, Books, Chats, Tokens

### Row 2: NEW - Engagement Metrics
- 👥 Active Users (green gradient card)
- 💬 Most Used Mode (purple gradient card)
- ⏱️ Time in App (blue gradient card)

### Row 3: NEW - Growth Metrics
- 🚀 Viral Coefficient (orange gradient card)
- 🔄 Retention (teal gradient card)
- 💎 Conversion Rate (indigo gradient card)

## 📝 Optional: Enable Session Tracking Middleware

For real-time active users tracking, add middleware in `backend/main.py`:

```python
from core.session_middleware import track_user_session

# Add after app initialization
app.middleware("http")(track_user_session)
```

This will:
- Track all user sessions automatically
- Update last active timestamp
- Count chat interactions and book views
- Auto-close inactive sessions (30+ min)

## 🧪 Testing

### Test Backend Endpoints
```bash
# Get your admin token
TOKEN="your_admin_jwt_token"

# Test active users
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/stats/active-users

# Test chat modes
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/admin/stats/chat-modes?days=30
```

### Test Frontend
1. Login to admin: `http://localhost:3000/admin/login`
2. Go to Dashboard tab
3. Scroll down to see new metric cards
4. Cards will auto-refresh every 30 seconds

## 📚 Documentation

Full documentation available in:
- `ANALYTICS_METRICS.md` - Complete guide with formulas, benchmarks, and examples
- `backend/scripts/add_analytics_tables.sql` - Database migration
- `backend/models/user_session.py` - Data models
- `backend/core/session_middleware.py` - Session tracking

## ⚠️ Important Notes

### Initial Data
- **Active Users**: Will show 0 until users make requests (enable middleware)
- **Chat Modes**: Uses existing `usage_logs` data (should have data immediately)
- **Time in App**: Requires session tracking enabled (starts from 0)
- **Viral Coefficient**: Requires referral system (will be 0 initially)
- **Retention**: Uses `last_login` field (should have data if users return)
- **Conversion**: Uses existing subscription data (should work immediately)

### What Works Immediately (Uses Existing Data)
✅ Chat Modes - from `usage_logs`
✅ Conversion to Premium - from `subscriptions` and `payments`
✅ Retention - from `users.last_login`

### What Needs New Data Collection
🔄 Active Users - needs session tracking
🔄 Time in App - needs session tracking
🔄 Viral Coefficient - needs referral implementation

## 🎯 Next Steps

1. **Run migration** to create tables
2. **Restart backend** to load new endpoints
3. **Enable middleware** for session tracking (optional but recommended)
4. **Implement referral system** for viral coefficient tracking
5. **Monitor metrics** to understand user behavior

## 🐛 Troubleshooting

### "No data showing"
- Check if migration ran: `\dt user_sessions` in psql
- Check backend logs for errors: `docker-compose logs backend`
- Verify you're logged in as admin

### "Active users always 0"
- Enable session tracking middleware in `main.py`
- Make some authenticated requests to trigger tracking
- Check `user_sessions` table: `SELECT COUNT(*) FROM user_sessions;`

### "Viral coefficient is 0"
- This is expected if you don't have a referral system yet
- Implement referral links feature
- Or manually insert test data in `user_referrals` table

## 💡 Tips

- **Dashboard auto-refreshes** every 30 seconds
- **Click on cards** to see more details (future feature)
- **Export data** functionality coming soon
- **Mobile responsive** - view on any device

---

**Need help?** Check `ANALYTICS_METRICS.md` for detailed documentation.

**Questions?** The metrics use standard SaaS/analytics formulas - see documentation for benchmarks and interpretation.
