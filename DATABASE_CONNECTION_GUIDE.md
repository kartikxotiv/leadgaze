# Database Connection Management Guide

## Problem: "Sorry, too many clients already"

This error occurs when PostgreSQL reaches its maximum number of concurrent connections. This typically happens when:

1. The application creates too many database connections
2. Connections are not properly closed
3. Multiple application instances are running
4. Connection pooling is not configured properly

## Solution: Fixed Connection Management

### 1. Singleton Database Connection Pattern

The application now uses a singleton pattern to ensure only one database connection instance is created:

```typescript
// lib/database.ts
let sequelizeInstance: Sequelize | null = null;

const getSequelizeInstance = (): Sequelize => {
  if (!sequelizeInstance) {
    sequelizeInstance = new Sequelize(DATABASE_URL, {
      // ... configuration
    });
  }
  return sequelizeInstance;
};
```

### 2. Optimized Connection Pool Settings

Updated connection pool configuration in `.env.local`:

```env
# Database Connection Pool Settings
DB_POOL_MAX=5          # Maximum connections (reduced from 20)
DB_POOL_MIN=1          # Minimum connections
DB_POOL_ACQUIRE=30000  # Connection acquire timeout (30s)
DB_POOL_IDLE=5000     # Idle connection timeout (5s)
DB_POOL_EVICT=1000    # Connection eviction time (1s)
```

### 3. Connection Monitoring Tools

Created monitoring scripts:

- `scripts/monitor-db-connections.sh` - Monitor active connections
- `scripts/fix-db-connections.sh` - Comprehensive fix script
- `scripts/reset-db-connections.sh` - Reset connections

### 4. Pagination for Large Datasets

All API endpoints now support pagination to handle large datasets efficiently:

```typescript
// Example: GET /api/leads?limit=20&offset=0
const limit = parseInt(searchParams.get("limit") || "50");
const offset = parseInt(searchParams.get("offset") || "0");
```

## Quick Fix Steps

### Step 1: Restart PostgreSQL
```bash
sudo systemctl restart postgresql@16-main
```

### Step 2: Restart Application
```bash
npm run dev
```

### Step 3: Monitor Connections
```bash
./scripts/monitor-db-connections.sh
```

## Prevention

1. **Use Connection Pooling**: The application now uses proper connection pooling
2. **Implement Pagination**: All data fetching uses pagination
3. **Monitor Connections**: Use the monitoring scripts to track connection usage
4. **Proper Error Handling**: Database errors are properly handled and logged

## Environment Variables

Make sure your `.env.local` contains:

```env
NODE_ENV=development
DB_USER=postgres
DB_PASSWORD=admin@123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm
DB_SSL=false

# Database Connection Pool Settings
DB_POOL_MAX=5
DB_POOL_MIN=1
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=5000
DB_POOL_EVICT=1000
```

## Troubleshooting

### If you still get "too many clients already":

1. Check if multiple application instances are running:
   ```bash
   ps aux | grep node
   ```

2. Kill all Node.js processes:
   ```bash
   pkill -f node
   ```

3. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql@16-main
   ```

4. Restart application:
   ```bash
   npm run dev
   ```

### Monitor Connection Usage:

```bash
# Check active connections
./scripts/monitor-db-connections.sh

# Check PostgreSQL configuration
PGPASSWORD=admin@123 psql -h localhost -U postgres -d crm -c "SHOW max_connections;"
```

## Best Practices

1. **Always use pagination** for data fetching
2. **Monitor connection usage** regularly
3. **Restart PostgreSQL** if connections get stuck
4. **Use the singleton pattern** for database connections
5. **Implement proper error handling** for database operations

## API Pagination Examples

### Leads API
```
GET /api/leads?organizationId=xxx&limit=20&offset=0
```

### Deals API
```
GET /api/deals?organizationId=xxx&limit=20&offset=0
```

### Tasks API
```
GET /api/tasks?organizationId=xxx&limit=20&offset=0
```

All APIs return pagination metadata:
```json
{
  "success": true,
  "data": {
    "leads": [...],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "pages": 5
    }
  }
}
```


