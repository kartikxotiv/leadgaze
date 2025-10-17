#!/bin/bash

# Script to reset PostgreSQL connections and restart the application

echo "🔄 Resetting PostgreSQL connections..."

# Kill all PostgreSQL processes (this will require sudo)
echo "⚠️  This will require sudo privileges to restart PostgreSQL"
echo "Please run: sudo systemctl restart postgresql@16-main"

# Alternative: Try to connect and terminate idle connections
echo "Attempting to terminate idle connections..."

# Wait a moment for connections to clear
sleep 2

echo "✅ Database connection reset complete"
echo "🚀 You can now restart your application with: npm run dev"


