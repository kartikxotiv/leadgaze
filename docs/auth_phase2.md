# Phase 2: Roles & Permissions System

## SaaS Multi-Tenant CRM - Advanced Access Control

---

## 🎯 **Phase 2 Scope**

**What we're documenting:**

- Default system roles (Owner, Admin, Manager, User, Viewer)
- Custom role creation by tenant admins
- Granular permission system
- Role assignment and management
- Permission inheritance and conflict resolution
- Role-based feature access control
- Owner privileges and restrictions

**Building on Phase 1:**

- ✅ User signup and company creation
- ✅ User invitation system
- ✅ Trial subscription management
- ✅ Basic authentication flows

**What we're NOT covering yet:**

- CRM core features (Phase 3)
- Platform admin features (Phase 4)
- Advanced integrations (Phase 5)

---

## 👑 **Owner Phase & Privileges**

### **What is "Owner Phase"?**

```
Owner = The user who created the company during signup
- Highest level of access within the tenant
- Cannot be removed or demoted
- Has unique privileges that even Admins don't have
- Can transfer ownership to another user
- Controls subscription and billing
```

### **Owner-Only Privileges**

```
🔒 Exclusive Owner Powers:
- Delete company/tenant entirely
- Transfer ownership to another user
- Access billing and subscription management
- Cancel or upgrade subscription plans
- View and download all company data
- Access compliance and audit logs
- Manage company-level integrations
- Control data export and deletion (GDPR)

🚫 Cannot be done to Owner:
- Remove owner from company
- Change owner's role
- Restrict owner's access
- Block owner's login (except platform-level suspension)
```

---

## 🏗️ **System Roles (Built-in)**

### **Role Hierarchy**

```
👑 Owner (Company Creator)
├── 🛡️ Admin (Full company management)
├── 📊 Manager (Team & feature management)
├── 👤 User (Standard CRM access)
└── 👁️ Viewer (Read-only access)
```

### **Role Definitions**

#### **👑 Owner Role**

```
Access Level: FULL CONTROL
User Count: 1 per company (the signup user)

Permissions:
✅ Everything an Admin can do, PLUS:
✅ Billing & subscription management
✅ Company deletion
✅ Ownership transfer
✅ Platform-level settings
✅ Data export/import (full company)
✅ Legal compliance access
✅ Audit log access

Restrictions:
❌ Cannot be removed from company
❌ Cannot have role changed
❌ Cannot be blocked by other users
```

#### **🛡️ Admin Role**

```
Access Level: FULL COMPANY MANAGEMENT
User Count: Multiple allowed

Permissions:
✅ User management (invite, remove, role assignment)
✅ Custom role creation and management
✅ All CRM features (contacts, leads, deals, etc.)
✅ Advanced reporting and analytics
✅ Integration management
✅ Company settings (except billing)
✅ Data management and exports
✅ Workspace management

Restrictions:
❌ Cannot access billing/subscription
❌ Cannot delete company
❌ Cannot remove/demote Owner
❌ Cannot transfer ownership
```

#### **📊 Manager Role**

```
Access Level: TEAM & FEATURE MANAGEMENT
User Count: Multiple allowed

Permissions:
✅ Team management (limited user invitations)
✅ Most CRM features access
✅ Department/team-level reporting
✅ Workflow management
✅ Basic integrations
✅ Team-specific settings

Restrictions:
❌ Cannot manage Admins or Owner
❌ Cannot create custom roles
❌ Cannot access company-wide settings
❌ Cannot manage billing
❌ Limited user invitation (maybe only same/lower roles)
```

#### **👤 User Role**

```
Access Level: STANDARD CRM ACCESS
User Count: Unlimited (within subscription limits)

Permissions:
✅ Core CRM features (contacts, leads, deals)
✅ Personal dashboard and reports
✅ Own data management
✅ Basic collaboration features
✅ Standard workflow participation

Restrictions:
❌ Cannot invite other users
❌ Cannot access admin settings
❌ Cannot manage other users
❌ Cannot create custom roles
❌ Limited reporting scope
```

#### **👁️ Viewer Role**

```
Access Level: READ-ONLY
User Count: Unlimited (within subscription limits)

Permissions:
✅ View contacts, leads, deals (scope-limited)
✅ View reports and dashboards
✅ Basic profile management
✅ Read-only access to shared data

Restrictions:
❌ Cannot create/edit/delete records
❌ Cannot invite users
❌ Cannot access settings
❌ Cannot export data
❌ Very limited functionality
```

---

## 🎨 **Custom Roles System**

### **Who Can Create Custom Roles**

```
✅ Owner: Can create unlimited custom roles
✅ Admin: Can create custom roles (with some restrictions)
❌ Manager/User/Viewer: Cannot create custom roles
```

### **Custom Role Creation Process**

```
1. Admin/Owner goes to "Team Management"
2. Clicks "Create Custom Role"
3. Fills role creation form:
   - Role name (e.g., "Sales Manager")
   - Description
   - Department/team assignment
   - Color and icon selection
4. Sets permissions using permission matrix
5. Reviews and creates role
6. Role becomes available for user assignment
```

### **Permission Categories**

```
📞 CONTACTS
- contacts:create, contacts:read, contacts:update, contacts:delete
- contacts:export, contacts:import, contacts:assign

🎯 LEADS
- leads:create, leads:read, leads:update, leads:delete
- leads:convert, leads:assign, leads:export

💼 DEALS
- deals:create, deals:read, deals:update, deals:delete
- deals:approve, deals:assign, deals:export

📊 REPORTS
- reports:read, reports:create, reports:export
- reports:advanced, reports:company_wide

👥 USERS
- users:invite, users:read, users:update, users:remove
- users:role_assign, users:bulk_operations

⚙️ SETTINGS
- settings:company, settings:integrations, settings:billing
- settings:security, settings:compliance

🏢 WORKSPACES
- workspaces:create, workspaces:read, workspaces:update, workspaces:delete
- workspaces:manage, workspaces:assign_users
```

### **Data Scope Levels**

```
🔐 own: Only user's own records
👥 team: User's team/department records
🏢 department: Entire department access
🌍 all: Company-wide access
📋 assigned: Records assigned to user
🛠️ created: Records created by user
```

---

## 🔄 **Role Assignment & Management**

### **Multiple Roles per User**

```
✅ Users can have multiple custom roles
✅ System role + multiple custom roles
✅ Permission combination and inheritance
✅ Conflict resolution (most permissive wins)

Example:
User: Sarah Johnson
System Role: User (baseline)
Custom Roles:
- Sales Manager (team sales access)
- Marketing Lead (campaign access)
- Data Analyst (reporting access)

Final Permissions: Combined from all roles
```

### **Role Assignment Flow**

```
1. Admin selects user from team list
2. Views current roles and permissions
3. Assigns additional custom roles:
   - Select roles from dropdown
   - Set assignment duration (permanent/temporary)
   - Add assignment notes
4. System calculates combined permissions
5. User receives role change notification
6. JWT token updated with new permissions
```

### **Permission Calculation**

```
Final Permissions = System Role (base) + ALL Custom Roles (combined)

Rules:
1. Most permissive permission wins
2. Explicit denies override grants
3. System role provides minimum baseline
4. Custom roles can only ADD permissions
5. Owner permissions cannot be restricted
```

---

## 📊 **Database Schema (Phase 2)**

### **Additional Tables for Roles & Permissions**

```sql
-- Custom Roles (Per Tenant)
tenant_roles:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- name (VARCHAR(100)) -- "Sales Manager"
- description (TEXT)
- color (VARCHAR(7)) -- Hex color for UI
- icon (VARCHAR(50)) -- Icon identifier
- department (VARCHAR(100)) -- Optional department assignment
- created_by (UUID, FK to users.id)
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Permission Definitions
permissions:
- id (UUID, PK)
- resource (VARCHAR(50)) -- "contacts", "leads", "deals"
- action (VARCHAR(20)) -- "create", "read", "update", "delete"
- scope (ENUM: own, team, department, all, assigned, created)
- description (TEXT)
- category (VARCHAR(50)) -- Grouping for UI

-- Role-Permission Mapping
role_permissions:
- id (UUID, PK)
- role_id (UUID, FK to tenant_roles.id)
- permission_id (UUID, FK to permissions.id)
- granted (BOOLEAN, default: true)
- conditions (JSON) -- Additional conditions if needed
- created_at (TIMESTAMP)

-- User Custom Role Assignments
user_custom_roles:
- id (UUID, PK)
- tenant_user_id (UUID, FK to tenant_users.id)
- role_id (UUID, FK to tenant_roles.id)
- assigned_by (UUID, FK to users.id)
- assigned_at (TIMESTAMP)
- expires_at (TIMESTAMP, NULL) -- Optional expiration
- is_active (BOOLEAN, default: true)
- notes (TEXT) -- Assignment reason/notes

-- Permission Categories (For UI Organization)
permission_categories:
- id (UUID, PK)
- name (VARCHAR(100)) -- "CRM Features", "User Management"
- description (TEXT)
- sort_order (INTEGER)
- icon (VARCHAR(50))
- color (VARCHAR(7))
```

---

## ⚡ **Enhanced JWT Token (Phase 2)**

### **Token with Roles & Permissions**

```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "email": "user@company.com",
  "system_role": "user",
  "custom_roles": [
    {
      "role_id": "role_1",
      "role_name": "Sales Manager",
      "assigned_at": "2024-01-01T00:00:00Z",
      "expires_at": null
    },
    {
      "role_id": "role_2",
      "role_name": "Marketing Lead",
      "assigned_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-12-31T23:59:59Z"
    }
  ],
  "permissions": [
    "contacts:read:all",
    "contacts:create:team",
    "leads:all:team",
    "deals:read:own",
    "reports:read:department"
  ],
  "data_scopes": {
    "contacts": "all",
    "leads": "team",
    "deals": "own",
    "reports": "department"
  },
  "subscription": {
    "status": "trial",
    "plan_type": "trial",
    "features_enabled": ["contacts", "leads", "basic_reports"]
  },
  "exp": 1640995200,
  "iat": 1640908800
}
```

---

## 🎨 **User Interface Design**

### **Role Management Dashboard**

```
1. Role Overview Section:
   - List of all custom roles
   - Usage statistics (how many users have each role)
   - Quick actions (edit, clone, delete)

2. Create Role Wizard:
   - Basic info (name, description, color, icon)
   - Permission matrix (resource × action grid)
   - Scope selection dropdowns
   - Preview permissions summary

3. User Role Assignment:
   - User list with current roles
   - Drag-and-drop role assignment
   - Multi-select for bulk operations
   - Role combination preview
```

### **Permission Matrix Interface**

```
Visual Grid:
                Create | Read | Update | Delete | Export
Contacts         ✅    | ✅   |   ✅   |   ❌   |   ✅
Leads           ✅    | ✅   |   ✅   |   ✅   |   ❌
Deals           ❌    | ✅   |   ❌   |   ❌   |   ❌
Reports         ❌    | ✅   |   ❌   |   ❌   |   ✅

Scope Dropdowns:
- Contacts: [All Company] ▼
- Leads: [Team Only] ▼
- Deals: [Own Records] ▼
- Reports: [Department] ▼
```

---

## ✅ **Phase 2 Requirements Checklist**

### **Backend Requirements**

- [ ] Custom role creation APIs
- [ ] Permission matrix management
- [ ] Role assignment APIs
- [ ] Permission calculation engine
- [ ] Role validation middleware
- [ ] Permission checking functions
- [ ] Owner privilege enforcement
- [ ] Role-based access control (RBAC)
- [ ] Multiple role support per user
- [ ] Permission conflict resolution
- [ ] Role audit logging
- [ ] Enhanced JWT with permissions

### **Frontend Requirements**

- [ ] Role management dashboard
- [ ] Custom role creation wizard
- [ ] Permission matrix interface
- [ ] User role assignment interface
- [ ] Role-based menu/feature visibility
- [ ] Permission-based button states
- [ ] Owner privilege indicators
- [ ] Role assignment history
- [ ] Bulk role operations
- [ ] Role usage analytics

### **Database & Schema**

- [ ] Custom roles table creation
- [ ] Permission definitions setup
- [ ] Role-permission mapping
- [ ] User role assignments
- [ ] Permission categories
- [ ] Database indexes for performance
- [ ] Role inheritance queries

---

## 🤔 **Questions for Review**

1. **Owner Transfer**: Should ownership transfer require email verification or just password confirmation?

2. **Role Limits**: Should there be limits on how many custom roles a tenant can create?

3. **Permission Granularity**: Is the current permission structure detailed enough, or should we add more granular permissions?

4. **Role Expiration**: Should custom role assignments support automatic expiration?

5. **Permission Inheritance**: Should permissions be additive only, or allow for permission removal/denial?

6. **Role Templates**: Should we provide pre-built role templates (Sales Manager, Marketing Lead, etc.)?

7. **Department Scope**: Should we add formal department/team structure to support department-level permissions?

8. **Owner Limits**: Should we allow multiple owners per company, or keep it single-owner?

---

**This Phase 2 covers the complete roles and permissions foundation, including special Owner privileges and custom role creation. The system allows for flexible team management while maintaining proper access controls!** 🚀
