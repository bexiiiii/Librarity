#!/bin/bash
# Post-deployment script for Heroku

echo "🚀 Running post-deployment tasks..."

# Run database migrations
echo "📊 Running database migrations..."
python -m alembic upgrade head

# Create initial admin user (optional)
# echo "👤 Creating admin user..."
# python scripts/create_admin.py

echo "✅ Deployment complete!"
