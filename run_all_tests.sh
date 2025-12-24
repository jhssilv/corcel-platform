#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================"
echo "Running Backend Tests (Pytest)"
echo "========================================"

# Navigate to api directory
cd api

# Run pytest
# Assuming the virtual environment is already activated or pytest is available in the path
# If not, you might need to activate it explicitly, e.g., source ../.venv/bin/activate
pytest tests/

# Check if pytest failed
if [ $? -ne 0 ]; then
    echo "Backend tests failed!"
    exit 1
fi

echo "Backend tests passed!"
echo ""

echo "========================================"
echo "Running Frontend Tests (Playwright)"
echo "========================================"

# Navigate to frontend directory
cd ../frontend

# Run playwright tests
npx playwright test

# Check if playwright failed
if [ $? -ne 0 ]; then
    echo "Frontend tests failed!"
    exit 1
fi

echo "Frontend tests passed!"
echo ""

echo "========================================"
echo "All tests passed successfully!"
echo "========================================"
