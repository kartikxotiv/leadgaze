# DBeaver mein Roles Table Run Karne Ki Instructions

## Step 1: DBeaver Kholo aur Connection Setup Karo

1. DBeaver kholo
2. Top menu: **Database → New Database Connection**
3. **PostgreSQL** select karo
4. Fill karo:
   - **Host:** localhost (ya apna server address)
   - **Port:** 5432 (default)
   - **Database:** crm
   - **Username:** postgres (ya apna DB username)
   - **Password:** apna DB password
5. **Test Connection** click karo
6. **Finish** click karo

## Step 2: Migration SQL Run Karo

### Method 1: SQL File Import
1. DBeaver mein: **File → Open SQL Script**
2. Select: `supabase/migrations/20251103080027_create_roles_table.sql`
3. **Execute SQL Script** button click karo (F5 ya play button)
4. Success message aayega! ✅

### Method 2: Manual Copy-Paste
1. DBeaver mein **New SQL Script** kholo
2. `supabase/migrations/20251103080027_create_roles_table.sql` file kholo
3. Puri file copy karo
4. DBeaver SQL Editor mein paste karo
5. **Execute** run karo (F5)

### Method 3: Direct PostgreSQL CLI
```bash
# .env file se DATABASE_URL lo
psql "your_database_connection_string" -f supabase/migrations/20251103080027_create_roles_table.sql
```

## Step 3: Verify Karo

DBeaver SQL Editor mein yeh query run karo:

```sql
-- Saare roles dekhne ke liye:
SELECT 
  role, 
  display_name, 
  hierarchy_level, 
  is_active 
FROM public.roles 
ORDER BY hierarchy_level DESC;

-- Specific role details:
SELECT * FROM public.roles WHERE role = 'sales_rep';

-- Permissions check:
SELECT role, display_name, permissions 
FROM public.roles;
```

## Expected Result:

6 rows aane chahiye:
1. system_admin (100)
2. workspace_admin (90)  
3. marketing_manager (80)
4. project_manager (75)
5. sales_manager (70)
6. sales_rep (60)

## Table Browser Se Dekhna:

1. Left sidebar: **Database Navigator**
2. Expand karo:
   - Databases → crm → Schemas → public → Tables
3. **roles** table par double-click karo
4. Saara data dikhega!

## Troubleshooting:

**Error: "relation roles already exists"**
- Table pehle se exists hai
- Ya to drop karo aur phir run karo:
```sql
DROP TABLE IF EXISTS public.roles CASCADE;
```

**Error: "permission denied"**
- Admin access check karo
- RLS policies disable karke try karo

**Connection Error:**
- Database server running hai na?
- Host/Port/Password sahi hai na?
- Firewall issues to nahi?

## Success Indicators:

✅ Table created with 198 lines
✅ 6 roles inserted successfully
✅ All indexes created
✅ RLS policies active

Kaam ho gaya! 🎉

