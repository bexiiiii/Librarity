#!/bin/bash

# 🚀 Quick Heroku Setup Script for Librarity

echo "🎯 Librarity Heroku Deployment Script"
echo "======================================"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed!"
    echo "Install it with: brew tap heroku/brew && brew install heroku"
    exit 1
fi

echo "✅ Heroku CLI found"
echo ""

# Login to Heroku
echo "🔐 Logging in to Heroku..."
heroku login

# App name
read -p "Enter your app name (e.g., librarity-backend): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ App name is required!"
    exit 1
fi

echo ""
echo "📦 Creating Heroku app: $APP_NAME"
heroku create $APP_NAME

echo ""
echo "🗄️ Adding PostgreSQL addon..."
heroku addons:create heroku-postgresql:essential-0 -a $APP_NAME

echo ""
echo "🔴 Adding Redis addon..."
heroku addons:create heroku-redis:mini -a $APP_NAME

echo ""
echo "⏰ Adding Scheduler addon (optional for periodic tasks)..."
read -p "Add Heroku Scheduler? (y/n): " ADD_SCHEDULER
if [ "$ADD_SCHEDULER" = "y" ]; then
    heroku addons:create scheduler:standard -a $APP_NAME
fi

echo ""
echo "🔧 Setting up environment variables..."

# Get Redis URL
REDIS_URL=$(heroku config:get REDIS_URL -a $APP_NAME)

# Set environment variables
heroku config:set ENVIRONMENT=production -a $APP_NAME
heroku config:set DEBUG=False -a $APP_NAME
heroku config:set LOG_LEVEL=INFO -a $APP_NAME
heroku config:set CELERY_BROKER_URL=$REDIS_URL -a $APP_NAME
heroku config:set CELERY_RESULT_BACKEND=$REDIS_URL -a $APP_NAME

# Google Gemini API Key
read -p "Enter your Google Gemini API Key: " GEMINI_KEY
heroku config:set GOOGLE_API_KEY=$GEMINI_KEY -a $APP_NAME
heroku config:set GEMINI_MODEL=gemini-2.0-flash-exp -a $APP_NAME

# Qdrant
echo ""
read -p "Enter your Qdrant URL: " QDRANT_URL
read -p "Enter your Qdrant API Key (optional): " QDRANT_KEY
heroku config:set QDRANT_URL=$QDRANT_URL -a $APP_NAME
if [ ! -z "$QDRANT_KEY" ]; then
    heroku config:set QDRANT_API_KEY=$QDRANT_KEY -a $APP_NAME
fi

# Security keys
echo ""
echo "🔐 Generating security keys..."
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

heroku config:set SECRET_KEY=$SECRET_KEY -a $APP_NAME
heroku config:set JWT_SECRET_KEY=$JWT_SECRET -a $APP_NAME
heroku config:set ENCRYPTION_KEY=$ENCRYPTION_KEY -a $APP_NAME

# CORS
echo ""
read -p "Enter your frontend URL (e.g., https://yourapp.vercel.app): " FRONTEND_URL
heroku config:set CORS_ORIGINS=$FRONTEND_URL -a $APP_NAME
heroku config:set FRONTEND_URL=$FRONTEND_URL -a $APP_NAME

# S3 Configuration
echo ""
echo "📦 S3/MinIO Configuration for file storage..."
read -p "Use S3 for file storage? (y/n): " USE_S3
if [ "$USE_S3" = "y" ]; then
    heroku config:set USE_S3=True -a $APP_NAME
    read -p "S3 Endpoint (e.g., https://s3.amazonaws.com): " S3_ENDPOINT
    read -p "S3 Access Key: " S3_ACCESS
    read -p "S3 Secret Key: " S3_SECRET
    read -p "S3 Bucket Name: " S3_BUCKET
    
    heroku config:set S3_ENDPOINT=$S3_ENDPOINT -a $APP_NAME
    heroku config:set S3_ACCESS_KEY=$S3_ACCESS -a $APP_NAME
    heroku config:set S3_SECRET_KEY=$S3_SECRET -a $APP_NAME
    heroku config:set S3_BUCKET_NAME=$S3_BUCKET -a $APP_NAME
fi

# Book processing settings
heroku config:set CHUNK_SIZE=1000 -a $APP_NAME
heroku config:set CHUNK_OVERLAP=200 -a $APP_NAME
heroku config:set MAX_UPLOAD_SIZE_MB=50 -a $APP_NAME

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📤 Next steps:"
echo "1. git add ."
echo "2. git commit -m 'Prepare for Heroku deployment'"
echo "3. If backend is in subdirectory: git subtree push --prefix backend heroku main"
echo "4. If backend is root: git push heroku main"
echo ""
echo "🎯 Your app will be available at: https://$APP_NAME.herokuapp.com"
echo ""
echo "📊 Monitor your app:"
echo "   heroku logs --tail -a $APP_NAME"
echo "   heroku ps -a $APP_NAME"
echo ""
echo "🚀 Scale dynos:"
echo "   heroku ps:scale web=1 worker=1 -a $APP_NAME"
