#!/bin/bash

# Start Celery worker
cd "$(dirname "$0")"
celery -A workers.celery_app worker --loglevel=info --pool=solo
