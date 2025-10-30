#!/bin/bash

# Start Celery worker for macOS
# Using caffeinate to prevent macOS from sleeping during processing

echo "🚀 Starting Celery worker..."
echo "📌 Using caffeinate to prevent macOS sleep"
echo "⚠️  Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"

# Use caffeinate to prevent system sleep while celery is running
# -i: Prevent the system from idle sleeping
# -w: Waits for the process to exit before exiting itself
caffeinate -i celery -A workers.celery_app worker --loglevel=info --pool=solo --concurrency=1
