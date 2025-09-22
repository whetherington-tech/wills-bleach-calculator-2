#!/bin/bash

# Water Quality Calculator - Morning Startup Script
echo "🚰 Starting Water Quality Calculator..."
echo "======================================"

# Navigate to project directory
cd /Users/willhetherington/water-quality-calculator

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  WARNING: .env.local not found!"
    echo "   Make sure you have your API keys set up:"
    echo "   - OPENAI_API_KEY"
    echo "   - FIRECRAWL_API_KEY"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
fi

# Start the development server
echo "🚀 Starting development server..."
echo "   App will be available at: http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo ""

npm run dev
