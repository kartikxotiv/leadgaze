# 🧪 Complete Monday.com-Style Invitation Flow Test

## Step-by-Step Testing Guide

### 🚀 **Phase 1: Fresh Invitation**

1. **Send Invitation** via UI (Header invite icon)
   - Email: `test@example.com`
   - Organization: Your current org
   - Role: Admin/Member
   - Expected: ✅ Success, invitation created

### 🎯 **Phase 2: Accept Invitation**

2. **Accept Invitation** via invitation link
   - Set Full Name: `Test User`
   - Set Password: `password123`
   - Expected: ✅ Success, auto-login, redirect to dashboard

### 🔄 **Phase 3: Verify Org-Scoped Account**

3. **Check Database**
   ```sql
   SELECT email, first_name, last_name, organization_id FROM org_user_accounts;
   ```
   - Expected: ✅ One record with test@example.com

### 🌟 **Phase 4: Cross-Company Test (Monday.com Behavior)**

4. **Create Second Organization** (if needed)
5. **Send Same Email to Different Org**

   - Email: `test@example.com` (same as before)
   - Organization: Different org
   - Expected: ✅ Success (no "already member" error)

6. **Accept Second Invitation**
   - Set Different Password: `differentpass456`
   - Expected: ✅ Success, separate org-scoped account

### 🎯 **Phase 5: Verify Monday.com Behavior**

7. **Check Database Again**
   ```sql
   SELECT email, first_name, organization_id FROM org_user_accounts;
   ```
   - Expected: ✅ Two records, same email, different org_ids

### 🔐 **Phase 6: Test Org-Scoped Login**

8. **Login with Org Context**

   ```javascript
   POST /api/auth/login
   {
     "email": "test@example.com",
     "password": "password123",
     "organizationId": "org-1-uuid"
   }
   ```

   - Expected: ✅ Success with org-1 context

9. **Login with Different Org**
   ```javascript
   POST /api/auth/login
   {
     "email": "test@example.com",
     "password": "differentpass456",
     "organizationId": "org-2-uuid"
   }
   ```
   - Expected: ✅ Success with org-2 context

## 🏆 **Success Criteria**

- ✅ Same email can be invited to multiple organizations
- ✅ Each organization gets separate credentials
- ✅ Different passwords per organization
- ✅ Org-scoped login works correctly
- ✅ Auto-login after invitation acceptance
- ✅ No duplicate constraint errors

## 🚨 **Common Issues to Check**

- Server restart needed after code changes
- Clear browser localStorage if needed
- Check for transaction rollbacks in logs
- Verify all tables have correct data

## 📝 **Database Verification Commands**

```sql
-- Check invitations
SELECT email, accepted_at, organization_id FROM user_invitations;

-- Check org-scoped accounts
SELECT email, organization_id, created_at FROM org_user_accounts;

-- Check global relationships (legacy)
SELECT u.email, uo.organization_id FROM users u
JOIN user_organizations uo ON u.user_id = uo.user_id;
```
