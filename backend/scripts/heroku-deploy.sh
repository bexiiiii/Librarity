#!/bin/bash

# 🚀 Quick Deploy Script for Heroku

APP_NAME=${1:-librarity-backend}

echo "📤 Deploying to Heroku app: $APP_NAME"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Not a git repository! Initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if we're in backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Not in backend directory!"
    echo "Run this script from the backend folder"
    exit 1
fi

echo "✅ Git repository found"
echo ""

# Add heroku remote if not exists
if ! git remote | grep -q heroku; then
    echo "🔗 Adding Heroku remote..."
    heroku git:remote -a $APP_NAME
fi

echo "📦 Committing changes..."
git add .
git commit -m "Deploy to Heroku - $(date +'%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"

echo ""
echo "🚀 Pushing to Heroku..."
git push heroku main

echo ""
echo "⏳ Waiting for deployment..."
sleep 5

echo ""
echo "📊 Checking app status..."
heroku ps -a $APP_NAME

echo ""
echo "🔍 Recent logs:"
heroku logs --tail --num 50 -a $APP_NAME

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app: https://$APP_NAME.herokuapp.com"
echo "📝 Docs: https://$APP_NAME.herokuapp.com/api/docs"
