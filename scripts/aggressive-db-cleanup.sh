#!/bin/bash

# Aggressive Database Connection Cleanup Script
# This script tries multiple methods to clear database connections

echo "🔧 Aggressive Database Connection Cleanup"
echo "========================================"
echo ""

# Method 1: Kill all Node.js processes
echo "🔄 Method 1: Killing all Node.js processes..."
pkill -f node
sleep 2

# Method 2: Try to connect and terminate idle connections
echo "🔄 Method 2: Attempting to terminate idle connections..."
PGPASSWORD=admin@123 psql -h localhost -U postgres -d crm -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'crm' 
AND state = 'idle' 
AND pid <> pg_backend_pid();
" 2>/dev/null || echo "❌ Cannot connect to terminate connections"

# Method 3: Wait for connections to timeout
echo "🔄 Method 3: Waiting for connections to timeout..."
sleep 5

# Method 4: Test connection
echo "🔄 Method 4: Testing database connection..."
PGPASSWORD=admin@123 psql -h localhost -U postgres -d crm -c "SELECT 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo ""
    echo "🚀 You can now restart your application:"
    echo "   npm run dev"
else
    echo "❌ Database connection still failed"
    echo ""
    echo "🔧 Manual steps required:"
    echo "1. Open a new terminal"
    echo "2. Run: sudo systemctl restart postgresql@16-main"
    echo "3. Enter your password when prompted"
    echo "4. Then run: npm run dev"
fi

echo ""
echo "📊 Current environment settings:"
echo "DB_POOL_MAX=2 (very conservative)"
echo "DB_POOL_MIN=1"
echo "DB_POOL_ACQUIRE=5000ms"
echo "DB_POOL_IDLE=1000ms"
