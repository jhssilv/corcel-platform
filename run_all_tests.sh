#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Trap errors to provide feedback
trap 'echo "An error occurred. Exiting..."' ERR

# Get the project root directory (where this script resides)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$PROJECT_ROOT/api"

echo "========================================"
echo "Setting up Environment"
echo "========================================"

echo "Installing/Updating Python dependencies..."
cd "$API_ROOT"
uv sync --group dev --frozen --quiet

# 2. Node Environment Setup
echo "Installing/Updating Node dependencies..."
cd "$PROJECT_ROOT/frontend"
npm install --silent

# Ensure Playwright browsers are installed
echo "Ensuring Playwright browsers are installed..."
npx playwright install --with-deps

echo "Environment setup complete."
echo ""

echo "========================================"
echo "Running Backend Tests (Pytest)"
echo "========================================"

cd "$API_ROOT"
export PYTHONPATH="$API_ROOT"
uv run pytest tests/

echo "Backend tests passed!"
echo ""

echo "========================================"
echo "Running Frontend Tests (Playwright)"
echo "========================================"

cd "$PROJECT_ROOT/frontend"
# Run playwright tests
npx playwright test

echo "Frontend tests passed!"
echo ""

echo "========================================"
echo "All tests passed successfully!"
echo "========================================"
