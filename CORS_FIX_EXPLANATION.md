# 🔧 CORS "Failed to Fetch" Fix Explanation

## 🎯 **Problem:**
- Frontend running on: `localhost:3000`
- Trying to call: `https://leadgaze.vercel.app/api/auth/login`
- Browser blocks this: **CORS Error** (Cross-Origin Request)

## ✅ **Two Solutions:**

### **Solution 1: Use Relative URLs for Local Dev (RECOMMENDED)**

For local development, use relative paths so API calls go to your local server:

```bash
# In .env.local - REMOVE or COMMENT OUT this line:
# NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app
```

**Why?**
- Local dev mein: Frontend `localhost:3000` par chalega
- API calls bhi `localhost:3000/api/*` par jaengi (relative path)
- Server-side code live Supabase connect karega (via `SUPABASE_URL`)
- No CORS issue!

### **Solution 2: Add CORS Headers (DONE)**

I've added CORS headers to login route so cross-origin requests work.

---

## 🎯 **RECOMMENDED APPROACH:**

### **For Local Development:**

```bash
# .env.local - REMOVE this line or comment it:
# NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app

# API calls will use relative paths (/api) → localhost:3000/api
# But database will still use live Supabase (SUPABASE_URL is set)
```

### **For Production (Vercel):**

```bash
# In Vercel Environment Variables:
NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app

# When deployed, frontend and API are on same domain
# No CORS issue!
```

---

## 🔍 **How It Works:**

| Environment | Frontend | API Calls | Database | CORS? |
|-------------|----------|-----------|----------|-------|
| **Local Dev** (no NEXT_PUBLIC_API_URL) | localhost:3000 | localhost:3000/api | Live Supabase ✅ | No issue ✅ |
| **Local Dev** (with NEXT_PUBLIC_API_URL) | localhost:3000 | leadgaze.vercel.app/api | Live Supabase | CORS ❌ |
| **Production** (Vercel) | leadgaze.vercel.app | leadgaze.vercel.app/api | Live Supabase ✅ | No issue ✅ |

---

## 🚀 **FIX IT NOW:**

### **Step 1: Update .env.local**

```bash
# Comment out or remove this line:
# NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app
```

### **Step 2: Restart Server**

```bash
# Stop server (Ctrl+C)
npm run dev
```

### **Step 3: Test**

Login try karo - ab `localhost:3000/api/auth/login` par call jayega (no CORS issue)

---

## ✅ **Why This Works:**

1. **Relative URLs** (`/api/auth/login`) automatically use current domain
   - Local: `localhost:3000/api/auth/login` ✅
   - Production: `leadgaze.vercel.app/api/auth/login` ✅

2. **Server-side** still connects to live Supabase via `SUPABASE_URL`

3. **No CORS** - same origin requests

---

## 📝 **Summary:**

**REMOVE** `NEXT_PUBLIC_API_URL` from `.env.local` for local development!

The code will automatically:
- Use relative paths locally (`/api`)
- Use live URL when deployed on Vercel (if set in Vercel env vars)

