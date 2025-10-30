# 🚀 Production Deployment Guide - Librarity

## Pre-deployment Checklist

### ✅ Code Optimization
- [x] Removed all test files (test_*.py, debug_*.py)
- [x] Removed old/unused components (UsersTab-old.tsx, polar_service_old.py)
- [x] Cleaned up console.log statements (handled by Next.js compiler)
- [x] Added .dockerignore files for optimized builds
- [x] Configured Next.js for production optimization

### 🔧 Configuration Files Created
- `.env.production` - Production environment variables template
- `next.config.ts` - Optimized with compression, minification, and console removal
- `.dockerignore` - For both backend and frontend

## Production Optimizations Applied

### Frontend (Next.js)
```typescript
✅ React Strict Mode enabled
✅ Compression enabled
✅ Image optimization (AVIF/WebP)
✅ SWC minification
✅ Console.log removal in production
✅ CSS optimization
✅ Package imports optimization (framer-motion, lucide-react)
✅ Standalone output mode
```

### Backend (FastAPI)
```python
✅ Debug files removed
✅ Test files removed
✅ Structured logging configured
✅ Proper error handling
✅ Production-ready logging
```

## Deployment Steps

### 1. Environment Setup

Copy and configure production environment:
```bash
cd backend
cp .env.production .env
# Edit .env with your production values
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Application secret (min 32 chars)
- `JWT_SECRET_KEY` - JWT signing key
- `OPENAI_API_KEY` - OpenAI API key
- `POLAR_API_KEY` - Polar.sh payment integration
- `REDIS_URL` - Redis for caching and Celery
- `RESEND_API_KEY` - Email service
- `AWS_*` - S3 credentials for file storage

### 2. Database Migration

```bash
cd backend
python scripts/apply_migration.py
```

### 3. Build Docker Images

#### Backend:
```bash
cd backend
docker build -f Dockerfile.prod -t librarity-backend:prod .
```

#### Frontend:
```bash
cd librarity
docker build -t librarity-frontend:prod .
```

### 4. Docker Compose Production

Use `docker-compose.prod.yml`:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Health Checks

After deployment, verify:
```bash
# Backend health
curl https://api.yourdomain.com/api/health

# Frontend
curl https://yourdomain.com
```

## Performance Optimizations

### 1. CDN Setup
- Deploy static assets to CDN
- Configure Next.js `assetPrefix` if needed

### 2. Database
- Enable connection pooling
- Set up read replicas for scaling
- Configure proper indexes

### 3. Redis
- Use Redis for session storage
- Enable Redis clustering for high availability

### 4. Monitoring

**Backend Monitoring:**
- Sentry for error tracking
- Prometheus metrics on port 9090
- Structured logging to centralized service

**Frontend Monitoring:**
- Next.js built-in analytics
- Sentry for client-side errors

### 5. Security

**SSL/TLS:**
```bash
# Use Let's Encrypt or similar
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

**Security Headers:**
- CSP (Content Security Policy)
- HSTS
- X-Frame-Options
- X-Content-Type-Options

### 6. Backup Strategy

**Database:**
```bash
# Daily automated backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Uploads:**
- Store in S3 with versioning enabled
- Enable S3 lifecycle policies

## Scaling Considerations

### Horizontal Scaling

**Backend:**
- Deploy multiple FastAPI instances behind load balancer
- Use gunicorn with multiple workers
- Scale Celery workers independently

**Frontend:**
- Deploy multiple Next.js instances
- Use nginx or cloud load balancer

### Vertical Scaling

**Recommended Specs:**
- **Small**: 2 CPU, 4GB RAM (up to 100 concurrent users)
- **Medium**: 4 CPU, 8GB RAM (up to 500 concurrent users)
- **Large**: 8 CPU, 16GB RAM (1000+ concurrent users)

## CI/CD Pipeline

### GitHub Actions Example:

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy
        run: |
          docker-compose -f docker-compose.prod.yml build
          docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **High memory usage**
   - Check for memory leaks in chat history
   - Implement pagination for large datasets
   - Configure proper connection pool sizes

2. **Slow API responses**
   - Enable Redis caching
   - Optimize database queries
   - Use CDN for static assets

3. **File upload issues**
   - Ensure S3 credentials are correct
   - Check file size limits in nginx/load balancer
   - Verify disk space on server

## Monitoring Commands

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
redis-cli info stats
```

## Rollback Procedure

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Deploy previous version
git checkout previous-tag
docker-compose -f docker-compose.prod.yml up -d

# Restore database if needed
psql $DATABASE_URL < backup_previous.sql
```

## Support

For production issues:
1. Check application logs
2. Review Sentry errors
3. Monitor server metrics
4. Contact DevOps team

---

**Last Updated:** $(date +%Y-%m-%d)
**Production Readiness:** ✅ READY
