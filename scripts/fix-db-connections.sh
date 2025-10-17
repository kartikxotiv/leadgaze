#!/bin/bash

# Comprehensive Database Connection Fix Script
# This script helps resolve "too many clients already" error

echo "🔧 Database Connection Fix Script"
echo "================================"
echo ""

# Check if PostgreSQL is running
if systemctl is-active --quiet postgresql@16-main; then
    echo "✅ PostgreSQL service is running"
else
    echo "❌ PostgreSQL service is not running"
    echo "Please start it with: sudo systemctl start postgresql@16-main"
    exit 1
fi

echo ""
echo "🔄 Attempting to reset PostgreSQL connections..."
echo ""

# Try to restart PostgreSQL (this will require sudo)
echo "⚠️  You need to restart PostgreSQL to clear all connections."
echo "Please run the following command:"
echo ""
echo "   sudo systemctl restart postgresql@16-main"
echo ""

# Wait for user input
read -p "Press Enter after you've restarted PostgreSQL..."

echo ""
echo "🧪 Testing database connection..."

# Test connection
PGPASSWORD=admin@123 psql -h localhost -U postgres -d crm -c "SELECT 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo ""
    echo "🚀 You can now restart your application:"
    echo "   npm run dev"
    echo ""
    echo "📊 Monitor connections with:"
    echo "   ./scripts/monitor-db-connections.sh"
else
    echo "❌ Database connection failed"
    echo "Please check your PostgreSQL configuration"
fi


