# Phase 3: Platform Management

## SaaS Multi-Tenant CRM - Platform Owner Dashboard

---

Owner Creation Process:
Step 1: User signs up → Creates company → Becomes Owner
Step 2: Owner invites team members → They become Admin/Manager/User/Viewer
Step 3: Only the original signup person remains as "Owner"

## 🎯 **Phase 3 Scope**

**What we're documenting:**

- Platform Owner Dashboard (for YOU to manage your SaaS business)
- Tenant management and oversight
- Subscription and billing management
- Platform analytics and insights
- Feature flag and access control
- Platform user management
- System monitoring and health

**Building on Phase 1 & 2:**

- ✅ User signup and company creation
- ✅ User invitation system
- ✅ Trial subscription management
- ✅ Role-based access control
- ✅ Custom roles and permissions

**What we're NOT covering yet:**

- Complete billing/payment processing (Phase 4)
- Email system infrastructure (Phase 5)
- Audit logging and security (Phase 6)
- CRM core features (Phase 7+)

---

## 🏢 **Platform Architecture Overview**

### **Dual Application Structure**

```
Platform Owner App (YOU)          Tenant CRM App (YOUR CUSTOMERS)
├── yourcrm.com/platform/*        ├── yourcrm.com/* (after login)
├── Manage all tenants             ├── Company-specific CRM
├── Subscription oversight         ├── Team management
├── Platform analytics             ├── Leads, contacts, deals
└── Feature control                └── Role management
```

### **Platform Owner Users vs Tenant Users**

```
Platform Users (YOUR TEAM):
👑 Platform Super Admin (YOU)
🛡️ Platform Admin
📊 Platform Support
💰 Platform Sales

Tenant Users (YOUR CUSTOMERS):
👑 Company Owner (their signup user)
🛡️ Company Admin
📊 Company Manager
👤 Company User
👁️ Company Viewer
```

---

## 🏗️ **Platform User Roles**

### **Platform Role Hierarchy**

```
👑 Platform Super Admin (YOU - Platform Owner)
├── 🛡️ Platform Admin (Full platform management)
├── 📊 Platform Support (Customer support)
├── 💰 Platform Sales (Sales team)
└── 👁️ Platform Viewer (Read-only analytics)
```

### **Platform Role Definitions**

#### **👑 Platform Super Admin**

```
Access Level: FULL PLATFORM CONTROL
User Count: 1-2 (YOU and maybe co-founder)

Permissions:
✅ All tenant management
✅ All subscription/billing control
✅ Platform configuration
✅ Feature flag management
✅ Platform user management
✅ System administration
✅ Security and compliance
✅ Database access and backups

Restrictions:
❌ Cannot be removed by other platform users
❌ Cannot have permissions restricted
```

#### **🛡️ Platform Admin**

```
Access Level: PLATFORM MANAGEMENT
User Count: Multiple allowed (your team)

Permissions:
✅ Tenant management (view, edit, suspend)
✅ Subscription management (plans, billing)
✅ Platform analytics access
✅ Customer support tools
✅ Feature flag control
✅ Platform user management (except Super Admin)

Restrictions:
❌ Cannot modify Super Admin
❌ Cannot access system-level settings
❌ Cannot access database directly
```

#### **📊 Platform Support**

```
Access Level: CUSTOMER SUPPORT
User Count: Multiple allowed (support team)

Permissions:
✅ View tenant information
✅ Customer support tools
✅ Tenant impersonation (for support)
✅ Basic subscription info
✅ Support ticket management
✅ Help documentation access

Restrictions:
❌ Cannot modify subscriptions
❌ Cannot change tenant settings
❌ Cannot access billing details
❌ Cannot manage platform users
```

#### **💰 Platform Sales**

```
Access Level: SALES & ANALYTICS
User Count: Multiple allowed (sales team)

Permissions:
✅ Tenant analytics and insights
✅ Subscription analytics
✅ Sales pipeline visibility
✅ Customer communication tools
✅ Revenue reporting

Restrictions:
❌ Cannot modify tenant data
❌ Cannot access billing details
❌ Cannot change subscriptions
❌ Cannot access support tools
```

---

## 📊 **Platform Dashboard Sections**

### **1. Platform Overview Dashboard**

```
Key Metrics Display:
📈 Total Active Tenants: 1,247
💰 Monthly Recurring Revenue: $45,890
👥 Total Platform Users: 8,934
📊 Trial Conversion Rate: 23.4%
⚠️ Expiring Trials: 45 (next 7 days)
🔄 Churn Rate: 2.1% (this month)

Quick Actions:
- View recent signups
- Check system health
- Review support tickets
- Monitor payment failures
```

### **2. Tenant Management**

```
Tenant List View:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Company Name        Plan      Status    Users  Created     MRR    Actions    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACME Corporation    Pro       Active    12     Jan 15    $299   [View][Edit] │
│ Tech Solutions      Basic     Active    5      Jan 10    $99    [View][Edit] │
│ StartupXYZ          Trial     Active    3      Jan 25    $0     [View][Edit] │
│ BigCorp Inc         Enterprise Active   45     Dec 20    $899   [View][Edit] │
└─────────────────────────────────────────────────────────────────────────────┘

Filters & Search:
- Search by company name, email, or ID
- Filter by plan type (Trial, Basic, Pro, Enterprise)
- Filter by status (Active, Trial, Suspended, Cancelled)
- Filter by creation date range
- Sort by MRR, user count, creation date
```

### **3. Tenant Details View**

```
Company Information:
- Company name, industry, size
- Owner details and contact info
- Account creation date and source
- Current subscription plan and status
- Billing information and payment method

Usage Analytics:
- Number of users (current/max)
- Feature usage statistics
- Login frequency and last activity
- Data usage (contacts, leads, deals)
- API usage (if applicable)

Subscription Details:
- Current plan and billing cycle
- Next billing date and amount
- Payment history and invoices
- Trial information (if applicable)
- Upgrade/downgrade history

Actions Available:
- Impersonate tenant (for support)
- Suspend/unsuspend account
- Change subscription plan
- Send notifications
- Export tenant data
- View audit logs
```

### **4. Subscription Management**

```
Subscription Overview:
📊 Plan Distribution:
- Trial: 234 tenants (18.7%)
- Basic: 456 tenants (36.6%)
- Pro: 423 tenants (34.0%)
- Enterprise: 134 tenants (10.7%)

💰 Revenue Metrics:
- Monthly Recurring Revenue: $45,890
- Annual Recurring Revenue: $550,680
- Average Revenue Per User: $36.82
- Customer Lifetime Value: $1,247

📈 Growth Metrics:
- New subscriptions this month: 67
- Upgrades this month: 23
- Downgrades this month: 8
- Cancellations this month: 12

Recent Transactions:
- Payment successes/failures
- Plan changes
- Refunds and adjustments
```

### **5. Platform Analytics**

```
User Analytics:
- Total registered users across all tenants
- Daily/monthly active users
- User growth trends
- Geographic distribution

Feature Usage:
- Most/least used features
- Feature adoption rates
- Feature-specific user engagement
- Performance bottlenecks

Platform Health:
- System uptime and performance
- API response times
- Database performance metrics
- Error rates and types

Support Metrics:
- Support ticket volume
- Average resolution time
- Customer satisfaction scores
- Common issues and trends
```

### **6. Feature Flag Management**

```
Feature Control:
┌─────────────────────────────────────────────────────────────────────┐
│ Feature Name           Status    Plan Access      Rollout    Actions │
├─────────────────────────────────────────────────────────────────────┤
│ Advanced Reports       Enabled   Pro+            100%      [Edit]    │
│ API Access             Enabled   Enterprise       100%      [Edit]    │
│ Custom Integrations    Beta      All Plans        25%       [Edit]    │
│ White Labeling         Disabled  Enterprise       0%        [Edit]    │
└─────────────────────────────────────────────────────────────────────┘

Feature Controls:
- Enable/disable features globally
- Set plan-based access restrictions
- Gradual rollout percentages
- A/B testing configurations
- Feature usage analytics
```

---

## 🛠️ **Platform Operations Tools**

### **Tenant Impersonation (Support)**

```
Support Use Case:
1. Customer reports an issue
2. Support user logs into platform dashboard
3. Finds customer's tenant
4. Clicks "Impersonate Tenant"
5. Gets logged into customer's CRM as their owner
6. Can see exactly what customer sees
7. Can reproduce and fix issues
8. Logs out of impersonation

Security Measures:
- All impersonation sessions logged
- Time-limited sessions (30 minutes)
- Clear visual indicators when impersonating
- Audit trail of all actions taken
- Cannot access billing during impersonation
```

### **Bulk Operations**

```
Tenant Bulk Actions:
- Bulk plan upgrades/downgrades
- Bulk feature flag changes
- Bulk notifications
- Bulk data exports
- Bulk suspension/reactivation

Examples:
- Upgrade all Basic plan users to Pro
- Enable new feature for Enterprise customers only
- Send maintenance notification to all tenants
- Export user data for compliance audit
```

### **Platform Notifications**

```
Notification Types:
📢 System Maintenance: Schedule downtime notifications
🎉 Feature Announcements: New feature rollouts
⚠️ Security Alerts: Important security updates
💳 Billing Notices: Payment failures, plan changes
📈 Usage Alerts: Reaching plan limits

Delivery Methods:
- In-app notifications (when users login)
- Email notifications to tenant owners/admins
- Dashboard announcements
- Platform status page updates
```

---

## 📊 **Database Schema (Platform Management)**

### **Platform-Specific Tables**

```sql
-- Platform Users (Your Team)
platform_users:
- id (UUID, PK)
- email (VARCHAR(255), unique)
- password_hash (VARCHAR(255))
- first_name (VARCHAR(100))
- last_name (VARCHAR(100))
- role (ENUM: super_admin, admin, support, sales, viewer)
- status (ENUM: active, inactive, suspended)
- last_login_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Platform Sessions & Impersonation
platform_sessions:
- id (UUID, PK)
- platform_user_id (UUID, FK to platform_users.id)
- session_token (VARCHAR(255), unique)
- is_impersonation (BOOLEAN, default: false)
- impersonated_tenant_id (UUID, FK to tenants.id, NULL)
- ip_address (VARCHAR(45))
- user_agent (TEXT)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)

-- Feature Flags
feature_flags:
- id (UUID, PK)
- name (VARCHAR(100), unique) -- "advanced_reports"
- display_name (VARCHAR(100)) -- "Advanced Reports"
- description (TEXT)
- is_enabled (BOOLEAN, default: false)
- plan_restrictions (JSON) -- ["pro", "enterprise"]
- rollout_percentage (INTEGER, default: 0) -- 0-100
- created_by (UUID, FK to platform_users.id)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Platform Notifications
platform_notifications:
- id (UUID, PK)
- title (VARCHAR(200))
- message (TEXT)
- type (ENUM: maintenance, feature, security, billing, usage)
- target_audience (ENUM: all, plan_specific, tenant_specific)
- target_plans (JSON) -- ["basic", "pro"] if plan_specific
- target_tenants (JSON) -- [tenant_ids] if tenant_specific
- delivery_method (ENUM: in_app, email, both)
- scheduled_at (TIMESTAMP)
- sent_at (TIMESTAMP, NULL)
- created_by (UUID, FK to platform_users.id)
- created_at (TIMESTAMP)

-- Platform Analytics Cache
platform_analytics:
- id (UUID, PK)
- metric_name (VARCHAR(100)) -- "total_tenants", "mrr", etc.
- metric_value (DECIMAL(15,2))
- metric_date (DATE)
- created_at (TIMESTAMP)

-- Audit Logs
platform_audit_logs:
- id (UUID, PK)
- platform_user_id (UUID, FK to platform_users.id)
- action (VARCHAR(100)) -- "tenant_suspended", "plan_changed"
- resource_type (VARCHAR(50)) -- "tenant", "subscription", "feature_flag"
- resource_id (VARCHAR(255)) -- ID of the resource
- old_values (JSON) -- Previous state
- new_values (JSON) -- New state
- ip_address (VARCHAR(45))
- user_agent (TEXT)
- created_at (TIMESTAMP)
```

### **Enhanced Tenant Table**

```sql
-- Updated Tenants Table
tenants:
- id (UUID, PK)
- company_name (VARCHAR(255), required)
- slug (VARCHAR(100), unique)
- email_domain (VARCHAR(255), unique)
- industry_type (VARCHAR(100))
- company_size (ENUM: solo, small, medium, large, enterprise)
- primary_use_case (VARCHAR(100))
- current_tool (VARCHAR(100))
- status (ENUM: active, inactive, suspended, trial_expired)
- subscription_status (ENUM: trial, active, cancelled, past_due, unpaid)
- plan_type (ENUM: trial, basic, pro, enterprise)
- trial_starts_at (TIMESTAMP)
- trial_ends_at (TIMESTAMP)
- max_users (INTEGER, default: 5)
- features_enabled (JSON)
- last_activity_at (TIMESTAMP) -- Platform tracking
- created_by_platform_user (UUID, FK to platform_users.id, NULL) -- If created by platform team
- notes (TEXT) -- Platform team notes about this tenant
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## ⚡ **Platform Authentication**

### **Platform Login Flow**

```
1. Platform user visits yourcrm.com/platform/login
2. Separate login form from tenant login
3. Validates against platform_users table
4. Generates platform-specific JWT token
5. Redirects to platform dashboard
6. Platform JWT has different structure than tenant JWT
```

### **Platform JWT Token Structure**

```json
{
  "platform_user_id": "uuid",
  "email": "admin@yourcrm.com",
  "role": "platform_admin",
  "permissions": [
    "tenants:read",
    "tenants:write",
    "subscriptions:read",
    "subscriptions:write",
    "analytics:read",
    "feature_flags:write"
  ],
  "is_platform_token": true,
  "exp": 1640995200,
  "iat": 1640908800
}
```

### **Impersonation JWT Token**

```json
{
  "platform_user_id": "uuid",
  "impersonated_tenant_id": "uuid",
  "impersonated_user_id": "uuid",
  "is_impersonation": true,
  "original_permissions": "platform_admin",
  "impersonation_expires_at": "timestamp",
  "exp": 1640995200,
  "iat": 1640908800
}
```

---

## 🔐 **Security & Access Control**

### **Platform Security Measures**

```
Authentication:
- Separate platform user authentication
- Strong password requirements for platform users
- Multi-factor authentication (recommended)
- IP whitelisting for platform access

Authorization:
- Role-based access to platform features
- Audit logging for all platform actions
- Impersonation logging and time limits
- Resource-level permissions

Data Protection:
- Encrypted platform database connections
- Secure platform-tenant data access
- Compliance with data protection regulations
- Regular security audits
```

### **Tenant Data Access**

```
Platform Access Rules:
✅ Read tenant data for analytics
✅ Read subscription data for billing
✅ Read user counts for plan limits
✅ Impersonate for support purposes

🚫 Direct tenant data modification
🚫 Access to tenant passwords
🚫 Access to sensitive customer data without consent
🚫 Unauthorized data exports
```

---

## ✅ **Phase 3 Requirements Checklist**

### **Backend Requirements**

- [ ] Platform user authentication system
- [ ] Platform role-based access control
- [ ] Tenant management APIs
- [ ] Subscription management APIs
- [ ] Platform analytics aggregation
- [ ] Feature flag management
- [ ] Tenant impersonation system
- [ ] Platform notification system
- [ ] Audit logging system
- [ ] Bulk operations APIs
- [ ] Platform JWT token handling

### **Frontend Requirements**

- [ ] Platform login page
- [ ] Platform dashboard overview
- [ ] Tenant management interface
- [ ] Subscription management dashboard
- [ ] Platform analytics charts
- [ ] Feature flag management UI
- [ ] Tenant impersonation interface
- [ ] Bulk operations interface
- [ ] Platform notification system
- [ ] Audit log viewer

### **Database & Schema**

- [ ] Platform users table
- [ ] Platform sessions and impersonation tracking
- [ ] Feature flags table
- [ ] Platform notifications table
- [ ] Platform analytics cache
- [ ] Audit logs table
- [ ] Enhanced tenant tracking
- [ ] Database indexes for platform queries

### **Security & Infrastructure**

- [ ] Platform authentication middleware
- [ ] Role-based access control
- [ ] Impersonation security measures
- [ ] Audit logging implementation
- [ ] Data access controls
- [ ] Platform API rate limiting

---

## 🤔 **Questions for Review**

1. **Platform User Management**: Should platform users have their own invitation system like tenants?

2. **Impersonation Scope**: Should impersonation give full access or limited support-specific access?

3. **Feature Flag Granularity**: Should feature flags be per-feature or allow more granular control?

4. **Analytics Retention**: How long should platform analytics data be retained?

5. **Tenant Data Access**: What level of tenant data should platform users be able to access?

6. **Notification Delivery**: Should platform notifications be real-time or batch-processed?

7. **Audit Log Retention**: How long should audit logs be kept for compliance?

8. **Platform Scaling**: Should the platform dashboard support multiple platform super admins?

---

**This Phase 3 completes the Platform Management foundation, giving you full control over your SaaS business with tenant management, subscription oversight, and platform analytics!** 🚀
