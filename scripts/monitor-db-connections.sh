


echo "📊 PostgreSQL Connection Monitor"
echo "================================"

if systemctl is-active --quiet postgresql@16-main; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    exit 1
fi

echo ""
echo "🔍 Checking active connections..."

PGPASSWORD=admin@123 psql -h localhost -U postgres -d crm -c "
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity 
WHERE datname = 'crm';
" 2>/dev/null || echo "❌ Cannot connect - too many connections"

echo ""
echo "💡 If you see 'too many connections', restart PostgreSQL:"
echo "   sudo systemctl restart postgresql@16-main"
echo ""
echo "💡 Then restart your application:"
echo "   npm run dev"


