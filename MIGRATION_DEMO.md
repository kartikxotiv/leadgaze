# Migration Demo - Workspaces Table में user_id Add करना

## 📋 ALTER TABLE Command Syntax

### Basic Syntax:
```sql
ALTER TABLE table_name 
ADD COLUMN column_name data_type [constraints];
```

### Foreign Key के साथ:
```sql
ALTER TABLE table_name 
ADD COLUMN column_name data_type 
REFERENCES other_table(primary_key_column) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;
```

---

## 🎯 हमारा Migration File

**File:** `supabase/migrations/20251105130000_add_user_id_to_workspaces.sql`

```sql
-- Add user_id column to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS user_id UUID 
REFERENCES public.users(user_id) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);

-- Add comment to the column
COMMENT ON COLUMN public.workspaces.user_id IS 'Reference to the user who created or owns this workspace';
```

---

## 🚀 Migration Push करने के तरीके

### Method 1: Supabase CLI (Recommended)

```bash
# 1. Supabase CLI install karo (agar nahi hai)
npm install -g supabase

# 2. Supabase project link karo (agar nahi linked)
supabase link --project-ref your-project-ref

# 3. Migration push karo
supabase db push

# Ya specific migration run karo
supabase migration up
```

### Method 2: DBeaver (Manual - Direct Database)

1. **DBeaver kholo**
2. **SQL Editor → New SQL Script**
3. Migration file open karo: `supabase/migrations/20251105130000_add_user_id_to_workspaces.sql`
4. **Copy-Paste** karo saara content
5. **Execute** karo (F5 ya ▶ button)

### Method 3: PostgreSQL CLI

```bash
# Direct psql command
psql "postgresql://postgres:password@localhost:5432/crm" -f supabase/migrations/20251105130000_add_user_id_to_workspaces.sql

# Ya .env file se
psql $DATABASE_URL -f supabase/migrations/20251105130000_add_user_id_to_workspaces.sql
```

### Method 4: Node.js Script (Programmatic)

```javascript
// Run migration using Node.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, 'supabase/migrations/20251105130000_add_user_id_to_workspaces.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

// Execute using your database client
// Example with pg:
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(sql)
  .then(() => console.log('✅ Migration successful!'))
  .catch(err => console.error('❌ Migration failed:', err));
```

---

## ✅ Verification Queries

Migration ke baad verify karo:

```sql
-- 1. Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workspaces' 
AND column_name = 'user_id';

-- 2. Check foreign key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'workspaces' 
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'user_id';

-- 3. Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'workspaces' 
AND indexname = 'idx_workspaces_user_id';

-- 4. View table structure
\d public.workspaces
```

---

## 📝 ALTER TABLE Commands Reference

### Column Add करना:
```sql
ALTER TABLE table_name ADD COLUMN column_name data_type;
```

### Column Drop करना:
```sql
ALTER TABLE table_name DROP COLUMN column_name;
```

### Column Modify करना (PostgreSQL):
```sql
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_data_type;
```

### Column Rename करना:
```sql
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;
```

### Foreign Key Add करना:
```sql
ALTER TABLE table_name 
ADD CONSTRAINT fk_name 
FOREIGN KEY (column_name) 
REFERENCES other_table(other_column);
```

### Not Null Constraint Add करना:
```sql
ALTER TABLE table_name ALTER COLUMN column_name SET NOT NULL;
```

### Default Value Add करना:
```sql
ALTER TABLE table_name ALTER COLUMN column_name SET DEFAULT 'default_value';
```

---

## 🎓 Example Use Cases

### Example 1: Simple Column Add
```sql
ALTER TABLE workspaces 
ADD COLUMN status VARCHAR(50) DEFAULT 'active';
```

### Example 2: Column with Foreign Key
```sql
ALTER TABLE workspaces 
ADD COLUMN created_by UUID 
REFERENCES users(user_id);
```

### Example 3: Multiple Columns
```sql
ALTER TABLE workspaces 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Example 4: Column with Index
```sql
ALTER TABLE workspaces ADD COLUMN slug VARCHAR(255);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
```

---

## ⚠️ Important Notes

1. **IF NOT EXISTS** use karo - duplicate column error avoid karne ke liye
2. **ON DELETE RESTRICT** - user delete hone par workspace delete nahi hoga
3. **ON UPDATE CASCADE** - user_id update hone par automatically update hoga
4. **Index add karo** - foreign key columns par query performance ke liye
5. **Migration file naming** - timestamp format: `YYYYMMDDHHMMSS_description.sql`

---

## 🚨 Troubleshooting

### Error: "column already exists"
```sql
-- Solution: Use IF NOT EXISTS
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS user_id UUID;
```

### Error: "foreign key constraint fails"
```sql
-- Check: Reference table exists and has data
SELECT * FROM users LIMIT 1;

-- Check: Referenced column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'user_id';
```

### Error: "relation does not exist"
```sql
-- Check: Table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'workspaces';
```

---

## ✅ Success Checklist

- [ ] Migration file created
- [ ] ALTER TABLE command correct
- [ ] Foreign key constraint added
- [ ] Index created
- [ ] Migration executed successfully
- [ ] Verification queries passed
- [ ] No errors in console

---

**Migration file location:** `supabase/migrations/20251105130000_add_user_id_to_workspaces.sql`

**Ready to push!** 🚀

