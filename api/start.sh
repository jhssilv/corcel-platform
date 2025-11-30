#!/bin/bash

# 1. Start Redis Server in the background
echo "Starting Redis..."
redis-server --daemonize yes

# 2. Start Celery Worker in the background
echo "Starting Celery..."
celery -A run_worker worker --loglevel=info &

# 3. Start Flask API in the foreground
# This keeps the container running
echo "Starting Flask API..."
flask run --host=0.0.0.0 --port=5000