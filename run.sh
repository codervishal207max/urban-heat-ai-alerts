#!/bin/bash
# Urban Heat AI v2 — Quick Start Script (Linux / macOS)
# This script prepares a local virtual environment, installs project dependencies,
# and starts the FastAPI app that serves the dashboard and API.
set -e

echo ""
echo "  🌡️  Urban Heat AI Platform v2.0"
echo "  ====================================="
echo ""

# Check whether Python 3 is installed before continuing.
if ! command -v python3 &>/dev/null; then
  echo "❌ python3 not found. Please install Python 3.10+"
  exit 1
fi

# Create a virtual environment if it does not already exist.
if [ ! -d ".venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv .venv
fi

# Activate the project environment for local development.
source .venv/bin/activate

# Install all Python dependencies from the project requirements file.
echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "🚀 Starting Urban Heat AI backend on http://localhost:8000"
echo "   → Homepage:   http://localhost:8000"
echo "   → Dashboard:  http://localhost:8000/dashboard.html"
echo "   → Database:   http://localhost:8000/database.html"
echo "   → API Docs:   http://localhost:8000/docs"
echo ""

# Launch the FastAPI app. The backend also serves frontend static files.
python -m backend.main

#  for instant deploying run this command in terminal
#  .run/.bat 