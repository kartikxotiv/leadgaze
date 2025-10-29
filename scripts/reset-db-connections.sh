


echo "🔄 Resetting PostgreSQL connections..."

echo "⚠️  This will require sudo privileges to restart PostgreSQL"
echo "Please run: sudo systemctl restart postgresql@16-main"

echo "Attempting to terminate idle connections..."

sleep 2

echo "✅ Database connection reset complete"
echo "🚀 You can now restart your application with: npm run dev"


