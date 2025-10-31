# ✅ QUICK FIX - Live URL Configuration

## 🎯 **Problem:**
Login API calls going to `localhost:3000` instead of live URL `https://leadgaze.vercel.app`

## ✅ **Solution Applied:**

### **1. Added to `.env.local`:**
```bash
NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app
```

### **2. Updated Code:**
- ✅ `lib/hooks/use-auth.ts` - All auth endpoints now use `NEXT_PUBLIC_API_URL`
- ✅ `lib/api-client.ts` - Main API client uses `NEXT_PUBLIC_API_URL`

---

## 🚀 **AB AAPKO YE KARNA HAI:**

### **Step 1: Restart Dev Server** ⚠️ **IMPORTANT**
Environment variables load only when server starts!

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### **Step 2: Test Login**
1. Browser mein login page kholo
2. Browser Console kholo (F12 → Console tab)
3. Login try karo
4. Console mein yeh dikhna chahiye:
   ```
   🔍 Login - API Base URL: https://leadgaze.vercel.app
   🌐 Login - Full Endpoint: https://leadgaze.vercel.app/api/auth/login
   ```

### **Step 3: Check Network Tab**
Network tab mein dekhna chahiye:
- **Request URL:** `https://leadgaze.vercel.app/api/auth/login` ✅
- **NOT:** `localhost:3000/api/auth/login` ❌

---

## 🔍 **Verification:**

### **Check if env variable is set:**
```bash
# Terminal mein run karo:
cat .env.local | grep NEXT_PUBLIC_API_URL
```

**Expected output:**
```
NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app
```

### **If NOT found:**
Manually add to `.env.local`:
```bash
echo "NEXT_PUBLIC_API_URL=https://leadgaze.vercel.app" >> .env.local
```

---

## ⚠️ **IMPORTANT NOTES:**

1. **Server Restart REQUIRED** - Environment variables only load on server start
2. **Check Browser Console** - Debug logs will show which URL is being used
3. **Network Tab** - Verify the actual request URL

---

## 🐛 **Still Not Working?**

### **Check 1: Environment Variable**
```bash
# Verify it exists:
cat .env.local | grep API_URL
```

### **Check 2: Server Logs**
Server console mein koi error dikh rahi hai?

### **Check 3: Browser Console**
F12 → Console tab → Login try karo → Console messages check karo

---

## ✅ **Success Signs:**

When it's working:
- ✅ Browser Console shows: `🌐 Login - Full Endpoint: https://leadgaze.vercel.app/api/auth/login`
- ✅ Network tab shows: `Request URL: https://leadgaze.vercel.app/api/auth/login`
- ✅ Login works successfully

---

## 📝 **For Vercel Deployment:**

1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Add:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://leadgaze.vercel.app`
   - **Environments:** All (Production, Preview, Development)
4. Redeploy

