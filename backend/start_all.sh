#!/bin/bash

# Complete startup script for Librarity backend on macOS
# This script starts all necessary services with proper macOS optimizations

set -e  # Exit on error

echo "🚀 Librarity Backend Startup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Redis is running
echo -n "📡 Checking Redis... "
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not running${NC}"
    echo "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis started${NC}"
    else
        echo -e "${RED}✗ Failed to start Redis${NC}"
        exit 1
    fi
fi

# Check if PostgreSQL is running
echo -n "🗄️  Checking PostgreSQL... "
if pg_isready > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not running${NC}"
    echo "Please start PostgreSQL manually:"
    echo "  brew services start postgresql@14"
    exit 1
fi

# Check if Qdrant is running
echo -n "🔍 Checking Qdrant... "
if curl -s http://localhost:6333/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not running${NC}"
    echo "Please start Qdrant manually:"
    echo "  docker run -p 6333:6333 -p 6334:6334 -v \$(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant"
fi

echo ""
echo "=============================="
echo ""

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $(jobs -p) 2>/dev/null || true
    wait
    echo "✓ All services stopped"
}

trap cleanup EXIT INT TERM

# Start Celery worker with caffeinate
echo "🔧 Starting Celery worker (with macOS optimizations)..."
cd "$SCRIPT_DIR"
caffeinate -i celery -A workers.celery_app worker --loglevel=info --pool=solo --concurrency=1 &
CELERY_PID=$!

# Wait a moment for Celery to start
sleep 3

# Check if Celery started successfully
if ps -p $CELERY_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Celery worker started (PID: $CELERY_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start Celery worker${NC}"
    exit 1
fi

echo ""
echo "=============================="
echo -e "${GREEN}✓ All services running!${NC}"
echo ""
echo "📝 Logs:"
echo "  Celery: Background worker for processing books"
echo ""
echo "⚠️  Press Ctrl+C to stop all services"
echo "=============================="
echo ""

# Wait for background processes
wait
