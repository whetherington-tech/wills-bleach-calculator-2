#!/bin/bash

# Water Quality Calculator - Status Check Script
echo "🔍 Water Quality Calculator Status Check"
echo "========================================"

# Navigate to project directory
cd /Users/willhetherington/water-quality-calculator

echo "📊 Checking chlorine data coverage..."
node verified_chlorine_summary.js

echo ""
echo "🧪 Testing utility lookup for zip 37067..."
curl -s "http://localhost:3000/api/test-utilities?zip=37067" | head -20

echo ""
echo "✅ Status check complete!"
echo "   If you see errors above, make sure the dev server is running:"
echo "   npm run dev"
