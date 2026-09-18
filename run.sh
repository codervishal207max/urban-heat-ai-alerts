#!/bin/bash
# Urban Heat AI v2 — Quick Start Script (Linux / macOS)
set -e

echo ""
echo "  🌡️  Urban Heat AI Platform v2.0"
echo "  ====================================="
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ python3 not found. Please install Python 3.10+"
  exit 1
fi

# Create venv if needed
if [ ! -d ".venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "🚀 Starting Urban Heat AI backend on http://localhost:8000"
echo "   → Homepage:   http://localhost:8000"
echo "   → Dashboard:  http://localhost:8000/dashboard.html"
echo "   → Database:   http://localhost:8000/database.html"
echo "   → API Docs:   http://localhost:8000/docs"
echo ""

python -m backend.main
