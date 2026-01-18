#!/bin/bash
# Script to uncomment Supabase environment variables in .env.local

cd /home/pankaj/Documents/crm

echo "🔍 Checking .env.local for Supabase variables..."

# Uncomment NEXT_PUBLIC_SUPABASE_URL
sed -i 's/^# NEXT_PUBLIC_SUPABASE_URL=/NEXT_PUBLIC_SUPABASE_URL=/' .env.local

# Uncomment SUPABASE_URL
sed -i 's/^# SUPABASE_URL=/SUPABASE_URL=/' .env.local

# Uncomment SUPABASE_SERVICE_ROLE_KEY
sed -i 's/^# SUPABASE_SERVICE_ROLE_KEY=/SUPABASE_SERVICE_ROLE_KEY=/' .env.local

echo "✅ Uncommented Supabase variables"
echo ""
echo "📋 Active Supabase variables:"
grep -E "^NEXT_PUBLIC_SUPABASE_URL=|^SUPABASE_URL=|^SUPABASE_SERVICE_ROLE_KEY=" .env.local | sed 's/=.*/=***/' | head -5

echo ""
echo "⚠️  IMPORTANT: Restart your Next.js server!"
echo "   Run: npm run dev"

