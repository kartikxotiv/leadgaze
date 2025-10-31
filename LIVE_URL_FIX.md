# ✅ Live URL Configuration Fix

## 🎯 Problem
After Supabase migration, API calls were going to `localhost:3000` instead of live URL `https://leadgaze.vercel.app`

## ✅ Solution Applied

### 1. **Added Environment Variable Support**
Created `NEXT_PUBLIC_API_URL` environment variable support in:
- `lib/hooks/use-auth.ts` - All auth API calls
- `lib/api-client.ts` - Main API client

### 2. **Updated Files:**

#### `lib/hooks/use-auth.ts`
- ✅ `loginUser()` - Now uses `NEXT_PUBLIC_API_URL`
- ✅ `registerUser()` - Now uses `NEXT_PUBLIC_API_URL`
- ✅ `switchOrganization()` - Now uses `NEXT_PUBLIC_API_URL`
- ✅ `createOrganization()` - Now uses `NEXT_PUBLIC_API_URL`

#### `lib/api-client.ts`
- ✅ Constructor now checks for `NEXT_PUBLIC_API_URL` env variable
- ✅ Falls back to `/api` (relative) for local development

---

## 🔧 **How to Configure**

### **For Production (Vercel):**

Add to your `.env.local` or Vercel environment variables:

```bash
# For Production (Vercel)
NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app
```

### **For Local Development:**

Leave it empty or don't set it - it will use relative paths:

```bash
# For Local Development (Optional - leave empty)
# NEXT_PUBLIC_API_URL=
# Or just don't set it - will use "/api" (relative path)
```

---

## 📋 **Environment Variable Behavior**

| Environment | `NEXT_PUBLIC_API_URL` | Result |
|-------------|----------------------|--------|
| **Local Dev** | Not set or empty | Uses `/api` (relative → `localhost:3000/api`) |
| **Production** | `https://leadgaze.vercel.app` | Uses `https://leadgaze.vercel.app/api` |

---

## 🚀 **Setup Instructions**

### **Step 1: Add to `.env.local` (Local Testing)**

```bash
# For testing production URL locally (optional)
NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app
```

### **Step 2: Add to Vercel Environment Variables**

1. Go to Vercel Dashboard
2. Select your project: `leadgaze`
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://leadgaze.vercel.app`
   - **Environment:** Production, Preview, Development (all)

### **Step 3: Deploy**

After adding the environment variable:
1. Redeploy your app on Vercel
2. The API calls will now use the live URL

---

## ✅ **What Changed:**

### **Before:**
```typescript
// Hardcoded relative path
fetch("/api/auth/login", ...)  // Always goes to localhost in browser
```

### **After:**
```typescript
// Dynamic URL based on environment
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
fetch(`${apiUrl}/api/auth/login`, ...)  // Uses live URL in production
```

---

## 🧪 **Testing**

### **Local Development:**
- Leave `NEXT_PUBLIC_API_URL` unset
- API calls go to `localhost:3000/api/*`

### **Production:**
- Set `NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app`
- API calls go to `https://leadgaze.vercel.app/api/*`

---

## ⚠️ **Important Notes:**

1. **`NEXT_PUBLIC_` prefix is required** - Next.js only exposes env variables to client-side if they start with `NEXT_PUBLIC_`

2. **No trailing slash** - The code automatically handles trailing slashes

3. **Redeploy required** - After adding env variable to Vercel, you need to redeploy

4. **Local testing** - If you want to test production URL locally, add it to `.env.local`

---

## ✅ **All Fixed API Endpoints:**

- ✅ `/api/auth/login`
- ✅ `/api/auth/register`
- ✅ `/api/auth/switch-organization`
- ✅ `/api/auth/organization`
- ✅ All other API calls via `apiClient`

