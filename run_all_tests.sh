#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Trap errors to provide feedback
trap 'echo "An error occurred. Exiting..."' ERR

# Get the project root directory (where this script resides)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_ROOT/.venv"

echo "========================================"
echo "Setting up Environment"
echo "========================================"

# 1. Python Environment Setup
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

# Activate the virtual environment
source "$VENV_DIR/bin/activate"

echo "Installing/Updating Python dependencies..."
pip install -r "$PROJECT_ROOT/api/requirements.txt" --quiet

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

cd "$PROJECT_ROOT/api"
export PYTHONPATH="$PROJECT_ROOT/api"
# Run pytest
pytest tests/

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
