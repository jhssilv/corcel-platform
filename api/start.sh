#!/bin/bash

echo "Starting background job worker..."
uv run python run_jobs.py &

echo "Starting Flask API..."
uv run python run_api.py
