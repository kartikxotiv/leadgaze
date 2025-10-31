# ✅ Complete Database & Environment Check

## 🔍 **ENVIRONMENT VARIABLES CHECK**

### ✅ **Supabase Configuration (CORRECT)**
```bash
✅ NEXT_PUBLIC_SUPABASE_URL="https://carwrljcvuzabktofqmt.supabase.co"
✅ SUPABASE_URL="https://carwrljcvuzabktofqmt.supabase.co"
✅ SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..." (present)
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..." (present)
```

**Status:** ✅ All Supabase env variables are correctly set

### ⚠️ **Note about DATABASE_URL**
```bash
DATABASE_URL="postgres://postgres:...@db.carwrljcvuzabktofqmt.supabase.co:5432/postgres"
```
- This is **NOT used** by the application code
- Only used for migrations/scripts
- Application uses Supabase REST API (via `NEXT_PUBLIC_SUPABASE_URL`)

---

## 📊 **DATABASE TABLE STRUCTURE CHECK**

### ✅ **Users Table Columns** (Matches TypeScript types)
```sql
user_id UUID PRIMARY KEY
email VARCHAR(255) NOT NULL UNIQUE
password VARCHAR(255) NOT NULL
first_name VARCHAR(100) NOT NULL
last_name VARCHAR(100) NOT NULL
phone_number VARCHAR(20)
email_verified BOOLEAN DEFAULT FALSE
status_id UUID
last_visited_organization_id UUID
last_login TIMESTAMPTZ
login_attempts INTEGER DEFAULT 0
lock_until TIMESTAMPTZ
password_reset_token VARCHAR(255)
password_reset_expires TIMESTAMPTZ
password_changed_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Status:** ✅ All columns match TypeScript `User` interface

---

## 🔧 **CODE CHECKS**

### ✅ **Supabase Client** (`lib/supabase-client.ts`)
- ✅ Checks `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- ✅ Checks `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Validates URL is not localhost
- ✅ Error messages are descriptive

### ✅ **User Data Access** (`lib/data/users.ts`)
- ✅ `getUserByEmail()` - Uses Supabase client
- ✅ `getUserById()` - Uses Supabase client
- ✅ All queries use snake_case column names
- ✅ Fixed `lock_until: null` → `undefined`

### ⚠️ **Potential Issue: getUserWithOrganizations**
- Uses complex join with foreign keys
- May need explicit foreign key references
- **FIXED:** Added explicit foreign key references

---

## 🧪 **TESTING**

### **Test Endpoint Created:** `/api/test-supabase`

**To test:**
```bash
curl http://localhost:3000/api/test-supabase
```

**This will check:**
1. ✅ Supabase connection
2. ✅ Users table access
3. ✅ Row count
4. ✅ admin@admin.com user exists
5. ✅ Environment variables

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue 1: RLS (Row Level Security) Policies**
If Supabase RLS is enabled, you need policies for service role:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- If RLS is enabled, create policy:
CREATE POLICY "Service role can access all" ON public.users
  FOR ALL
  TO service_role
  USING (true);
```

### **Issue 2: Foreign Key References**
The `getUserWithOrganizations` query was updated to use explicit foreign key references.

### **Issue 3: Column Name Mismatch**
✅ All columns use snake_case (database) matching TypeScript types.

---

## 📋 **DEBUGGING STEPS**

### **Step 1: Test Supabase Connection**
```bash
# Open in browser:
http://localhost:3000/api/test-supabase
```

### **Step 2: Check Server Logs**
When you try to login, check your terminal/server console for:
- Detailed error messages
- Stack traces
- Supabase query errors

### **Step 3: Verify Database Has Data**
```sql
-- Run in Supabase SQL Editor:
SELECT user_id, email, first_name, last_name 
FROM users 
WHERE email = 'admin@admin.com';
```

### **Step 4: Check RLS Policies**
```sql
-- In Supabase SQL Editor:
SELECT * FROM pg_policies 
WHERE tablename = 'users';
```

---

## ✅ **FIXES APPLIED**

1. ✅ Fixed `lock_until: null` → `undefined` in `updateUserLastLogin`
2. ✅ Improved `getUserWithOrganizations` with explicit foreign keys
3. ✅ Added better error logging in login route
4. ✅ Created test endpoint `/api/test-supabase`
5. ✅ Added error details in login response (dev mode only)

---

## 🎯 **NEXT STEPS**

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Test Supabase connection:**
   ```bash
   curl http://localhost:3000/api/test-supabase
   # or open in browser
   ```

3. **Try login again** and check server console for detailed errors

4. **Share the error message** from server console if login still fails

