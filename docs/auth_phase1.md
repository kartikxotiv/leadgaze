# Phase 1: Authentication Flow

## SaaS Multi-Tenant CRM - Multi-Organization Auth Setup & Account Creation

---

## 🎯 **Phase 1 Scope**

**What we're documenting:**

- User signup process with trial subscription
- Multi-organization support (users can create multiple organizations)
- Organization creation and management
- Organization switching after login
- User invitation system (invite team members to organizations)
- Invitation acceptance flow
- Role-based permissions (owner, admin, manager, viewer)
- Workspace system within organizations
- Required database schemas for auth
- Validation rules and requirements

**What we're NOT covering yet:**

- Custom roles/permissions (Phase 2)
- Platform admin features (Phase 3)
- Advanced security features (Phase 4)

---

## 🚀 **Signup Flow & Account Creation**

### **6-Step Beautiful Signup UI Flow**

#### **Step 1: Email Collection**

```
UI Features:
- Clean, focused email input with validation
- "Continue" button (disabled until valid email entered)
- Real-time email format validation
- Smooth slide animations between steps

Fields:
📧 Email Address (required, unique, format validation)
```

#### **Step 2: Account Details & Organization**

```
UI Features:
- Personal details form with organization name
- Password strength indicator
- Confirm password validation
- "Continue" button with validation

Fields:
👤 First Name (required)
👤 Last Name (required)
🔒 Password (required, min 8 chars, strength validation)
🔒 Confirm Password (required, must match)
🏢 Account Name/Organization Name (required)
☑️ Agree to Terms of Service and Privacy Policy (required)
```

#### **Step 3: What Brings You Here?**

```
UI Features:
- Beautiful card-based selection interface
- Hover animations and visual feedback
- Single selection from options

Options:
○ Lead management
○ Customer support
○ Sales pipeline
○ Team collaboration
○ All of the above
○ Other
```

#### **Step 4: Current Role**

```
UI Features:
- Professional role selection cards
- Clean grid layout with animations
- Role-based icons and descriptions

Options:
○ CEO/Founder
○ Sales Manager
○ Marketing Manager
○ Business Development
○ Account Manager
○ Other
```

#### **Step 5: Team Size**

```
UI Features:
- Team size selection with descriptive ranges
- Visual cards with team size indicators
- Animated selection states

Options:
○ Just me (1 person)
○ Small team (2-10 people)
○ Medium team (11-25 people)
○ Large team (26-50 people)
○ Very large team (50+ people)
```

#### **Step 6: Company Size**

```
UI Features:
- Company size selection for organization setup
- Employee count ranges with business type labels
- Final step with "Create Account" button

Options:
○ Just me (1 employee)
○ Small business (2-10 employees)
○ Growing business (11-50 employees)
○ Medium business (51-200 employees)
○ Large business (201-1000 employees)
○ Enterprise (1000+ employees)

Final Actions:
- Final terms agreement confirmation
- "Create Account" button (creates user + organization)
- Success message with 2-second display
- Auto-redirect to dashboard
```

### **Account & Organization Creation Process**

```
Backend Process (Single API Call):
1. Validate all 6 steps of form data
2. Check email uniqueness globally
3. Create user record with trial subscription:
   * User created successfully
   * status: "active"
   * email_verified: false
4. Create organization simultaneously:
   * Map company size ranges to numeric values
   * Store setup questions as organization metadata
   * Set trial subscription (14 days)
   * Set user as organization owner
5. Auto-login user with JWT token
6. Return complete authentication data
7. Frontend redirects to dashboard
8. Send welcome email with trial information

Note: User + Organization created in single transaction
```

---

## 🏢 **Organization Creation Flow**

### **Integrated with 6-Step Signup**

```
Organization Creation is now integrated into the signup flow:

Step 2: Organization Name Collection
- User provides "Account Name" which becomes organization name
- Auto-generates organization slug from name

Steps 3-6: Setup Questions Collection
- What brings you here? → stored as industryType/primaryUseCase
- Current role → stored as currentTool
- Team size → stored as metadata
- Company size → mapped to numeric value and stored

Backend Process (Part of Signup):
1. Organization data collected throughout signup steps
2. Generate organization slug from account name
3. Create organization record simultaneously with user:
   * subscription_status: "trial"
   * plan_type: "trial"
   * trial_starts_at: NOW()
   * trial_ends_at: NOW() + 14 days
   * max_users: 5 (trial limit)
   * max_workspaces: 3 (trial limit)
   * features_enabled: trial feature set
   * company_size: numeric value (mapped from UI ranges)
4. Create user-organization relationship:
   * role: "owner"
   * status: "active"
5. Set as current organization in user session
6. Auto-login and redirect to organization dashboard

Note: No separate organization creation step needed!
```

### **Standalone Organization Creation (For Multi-Org Users)**

```
For users who want to create additional organizations:

UI: Simple organization creation form
Fields:
🏢 Organization Name (required)
📝 Description (optional)
🏭 Industry Type (dropdown)
👥 Company Size (numeric or dropdown)

Process:
1. Validate organization data
2. Generate organization slug from name
3. Create organization record with trial subscription
4. Create user-organization relationship (role: "owner")
5. Switch to new organization
6. Redirect to new organization dashboard
```

---

## 🔐 **Sign In Flow**

### **Step 1: Login Form**

```
Login Fields:
📧 Email Address
🔒 Password
☑️ Remember Me (optional)

Additional Options:
🔗 Forgot Password link
🔗 Don't have account? Sign up
```

### **Step 2: Authentication Process**

```
1. User enters email/password
2. System validates credentials globally
3. System finds all organizations this user belongs to
4. Generate JWT with available organizations list
5. If user has only one organization → auto-select it
6. If user has multiple organizations → show organization selector
7. Redirect to selected organization dashboard
```

### **Step 3: Organization Selection (Multi-Org Users)**

```
Organization Selector Modal:
- Shows all organizations user belongs to
- Displays user's role in each organization
- Shows organization status (trial, active, etc.)
- Option to create new organization
- User selects organization to continue
- System updates JWT with selected organization
- Redirect to organization dashboard
```

---

## 🔄 **Organization Switching Flow**

### **Step 1: Organization Switcher (Header Component)**

```
Organization Switcher Features:
- Shows current organization name and user role
- Dropdown with all user's organizations
- Role indicator for each organization
- Organization status (trial, active, etc.)
- "Create New Organization" option
- Quick switch between organizations
```

### **Step 2: Organization Switching Process**

```
1. User clicks organization switcher in header
2. Shows dropdown with all organizations
3. User selects different organization
4. System updates JWT with new current_organization_id
5. Redirect to new organization dashboard
6. Show organization-specific data and workspaces
```

---

## 👥 **User Invitation System**

### **Step 1: Sending Invitations**

```
Organization Admin/Owner Actions:
1. Navigate to organization team management section
2. Click "Invite User" button
3. Fill invitation form:
   - First Name (required)
   - Last Name (required)
   - Email (required)
   - Role (admin, manager, viewer)
   - Optional message
4. System validates invitation:
   - Check subscription user limits (trial: max 5 users)
   - Verify organization is active and not expired
   - Validate role permissions
5. System creates pending invitation record
6. Invitation email sent to user's email
7. Admin sees pending invitation in dashboard
```

### **Step 2: Invitation Email**

```
Email Content:
- Subject: "You're invited to join [Organization Name]"
- Organization logo and branding
- Invitation message from admin
- Assigned role information
- "Accept Invitation" button/link
- Invitation expires in 7 days
- Contact information for questions

Invitation Link Format:
https://yourcrm.com/invite/accept?token={invitation_token}
```

### **Step 3: Invitation Acceptance**

```
User Journey:
1. User clicks invitation link in email
2. System validates invitation token
3. If valid, show invitation acceptance page:
   - Organization name and details
   - Assigned role information
   - Accept/Decline buttons
4. If user doesn't have account, show signup form
5. If user has account, show password confirmation
6. User accepts invitation
7. System creates user-organization relationship
8. System marks invitation as accepted
9. User automatically logged in
10. Redirect to organization dashboard
```

### **Step 4: Invitation Management**

```
Admin Dashboard Features:
- View all pending invitations
- Resend invitation emails
- Cancel pending invitations
- Modify invitation role (before acceptance)
- Track invitation status (sent, opened, accepted, expired)
- Bulk invitation operations

Invitation States:
- pending: Invitation sent, awaiting response
- accepted: User accepted and relationship created
- declined: User declined invitation
- expired: Invitation timeout (7 days)
- cancelled: Admin cancelled before acceptance
```

---

## 📊 **Database Schema (Phase 1)**

### **Core Tables**

```sql
-- Users (Global - can belong to multiple organizations)
users:
- id (UUID, PK)
- email (VARCHAR(255), unique, required)
- password_hash (VARCHAR(255), required)
- first_name (VARCHAR(100), required)
- last_name (VARCHAR(100), required)
- phone_number (VARCHAR(20))
- email_verified (BOOLEAN, default: false)
-- - status (ENUM: active, inactive, suspended)
-status_id (users_config.id)
-last_visited_organization_id (uuid fk to organization.id)
-- Field removed: is_original_user (simplified user model)
- last_login_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

users_config:
-id (uuid pk)
-entity_type (status,invitation_status)
-entity_value (Varchar:active, inactive, suspended)






-- Organizations (Companies/Tenants)
organizations:
- id (UUID, PK)
- name (VARCHAR(255), required)
- slug (VARCHAR(100), unique) -- auto-generated from name
- description (TEXT)
- industry_type (VARCHAR(100))
company_size_config_id (fk to organization_config.id)
-- - company_size (ENUM: solo, small, medium, large, enterprise)
- primary_use_case (VARCHAR(100))
- current_tool (VARCHAR(100))
-status_id (fk to organization_config.id)

-- - status (ENUM: active, inactive, suspended)
-- - subscription_status (ENUM: trial, active, cancelled, past_due, unpaid)
-- - plan_type (ENUM: trial, basic, pro, enterprise)
-- - trial_starts_at (TIMESTAMP)
-- - trial_ends_at (TIMESTAMP)
-- - max_users_config_id (fk to organization_config.id) -- trial limit or plan limit
-- - max_workspaces (INTEGER, default: 3) -- trial limit or plan limit
-- - features_enabled (JSON) -- trial features or plan features
- created_by (UUID, FK to users.id) -- Original user who created this org
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

--organization config

organization_config:
-id (uuid pk)
-entity_type (company_size,status )
-entity_value (varchar: solo , small , medium, large, enterprise)

-- eg Organization_config:
-- id          entity_type     entity_value
-- 1            status          active
-- 2            status          inactive
-- 3            status          suspended
-- 4            company_size     solo
-- 5            company_size      small
-- 6            company_size       medium
-- 7            company_size        large
-- 8            max_users           6
-- 9            min_users           2



-- User-Organization Relationships
user_organizations:
- id (UUID, PK)
- user_id (UUID, FK to users.id)
- organization_id (UUID, FK to organizations.id)
-- - role (ENUM: owner, admin, manager, viewer) -- Role within this organization
-role_id ( fk to organization_role.id)
- status (ENUM: active, inactive, pending)
- joined_at (TIMESTAMP)
- invited_by (UUID, FK to users.id, NULL for owner)

-- Workspaces (Projects/Teams within Organizations)
organization_workspaces:
- id (UUID, PK)
- organization_id (UUID, FK to organizations.id)
- name (VARCHAR(255), required)
- slug (VARCHAR(100), unique within org)
- description (TEXT)
- status (ENUM: active, inactive, archived)
- created_by (UUID, FK to users.id)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)


organization_role:
-id (uuid)
role (varchar)
permissions (json)

-- User Invitations (for organizations)
user_invitations:
- id (UUID, PK)
- organization_id (UUID, FK to organizations.id)
-- - first_name (VARCHAR(100), required)
-- - last_name (VARCHAR(100), required)
- email (VARCHAR(255), required)
- role (ENUM: admin, manager, viewer)
- invitation_token (text, unique)
- invited_by (UUID, FK to users.id)
- message (TEXT) -- optional invitation message
-- - status (ENUM: pending, accepted, declined, expired, cancelled)
-status_id (fk to user_confid.id)
- expires_at (TIMESTAMP)
- accepted_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- User Session/Current Organization (for switching)
-- user_sessions:
-- - id (UUID, PK)
-- - user_id (UUID, FK to users.id)
-- - current_organization_id (UUID, FK to organizations.id, NULL)
-- - last_activity_at (TIMESTAMP)
-- - created_at (TIMESTAMP)
-- - updated_at (TIMESTAMP)

-- Email Verification
email_verifications:
- id (UUID, PK)
- user_id (UUID, FK to users.id)
- token (VARCHAR(255), unique)
- expires_at (TIMESTAMP)
- verified_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP)

-- Password Reset Tokens
password_reset_tokens:
- id (UUID, PK)
- user_id (UUID, FK to users.id)
- token (VARCHAR(255), unique)
- expires_at (TIMESTAMP)
- reseted_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP)
```

--users tokens

---

## 🛡️ **Role-Based Permission System**

### **Permission Hierarchy**

```javascript
const ROLE_PERMISSIONS = {
  owner: {
    // Organization Management
    can_manage_organization: true,
    can_delete_organization: true,
    can_manage_subscription: true,

    // User Management
    can_invite_users: true,
    can_remove_users: true,
    can_change_user_roles: true,

    // Workspace Management
    can_create_workspaces: true,
    can_delete_workspaces: true,
    can_manage_workspaces: true,

    // Data Access
    can_view_all_data: true,
    can_edit_all_data: true,
    can_delete_all_data: true,
  },

  admin: {
    // Organization Management
    can_manage_organization: true,
    can_delete_organization: false,
    can_manage_subscription: false,

    // User Management
    can_invite_users: true,
    can_remove_users: true,
    can_change_user_roles: true,

    // Workspace Management
    can_create_workspaces: true,
    can_delete_workspaces: true,
    can_manage_workspaces: true,

    // Data Access
    can_view_all_data: true,
    can_edit_all_data: true,
    can_delete_all_data: true,
  },

  manager: {
    // Organization Management
    can_manage_organization: false,
    can_delete_organization: false,
    can_manage_subscription: false,

    // User Management
    can_invite_users: true,
    can_remove_users: false,
    can_change_user_roles: false,

    // Workspace Management
    can_create_workspaces: true,
    can_delete_workspaces: false,
    can_manage_workspaces: true,

    // Data Access
    can_view_all_data: true,
    can_edit_all_data: true,
    can_delete_all_data: false,
  },

  viewer: {
    // Organization Management
    can_manage_organization: false,
    can_delete_organization: false,
    can_manage_subscription: false,

    // User Management
    can_invite_users: false,
    can_remove_users: false,
    can_change_user_roles: false,

    // Workspace Management
    can_create_workspaces: false,
    can_delete_workspaces: false,
    can_manage_workspaces: false,

    // Data Access
    can_view_all_data: true,
    can_edit_all_data: false,
    can_delete_all_data: false,
  },
};
```

---

## ⚡ **JWT Token Structure (Phase 1)**

### **Multi-Organization Token Payload**

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Smith",

  "current_organization_id": "uuid",
  "current_organization_name": "ACME Corp",
  "current_organization_slug": "acme-corp",
  "current_role": "owner",
  "available_organizations": [
    {
      "id": "uuid",
      "name": "ACME Corp",
      "slug": "acme-corp",
      "role": "owner",
      "subscription_status": "trial",
      "trial_days_remaining": 12
    },
    {
      "id": "uuid",
      "name": "Tech Solutions",
      "slug": "tech-solutions",
      "role": "admin",
      "subscription_status": "active"
    }
  ],
  "subscription": {
    "status": "trial",
    "plan_type": "trial",
    "trial_ends_at": "2024-02-15T10:00:00Z",
    "days_remaining": 12,
    "max_users": 5,
    "max_workspaces": 3,
    "features_enabled": ["contacts", "leads", "basic_reports"]
  },
  "exp": 1640995200,
  "iat": 1640908800
}
```

---

## 🛡️ **Validation Rules**

### **Email Validation**

```
- Valid email format (RFC 5322)
- Maximum 255 characters
- Case-insensitive storage (lowercase)
- Global uniqueness check
- Domain blacklist check (optional)
```

### **Password Requirements**

```
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)
- Not commonly used passwords (blacklist)
- Not same as email address
```

### **Organization Name & Slug Validation**

```
Organization Name:
- Minimum 2 characters
- Maximum 100 characters
- Auto-generate slug: "ACME Corp" → "acme-corp"
- Slug uniqueness check
- No special characters except spaces, hyphens, apostrophes

Organization Slug:
- Auto-generated from organization name
- Format: lowercase with hyphens
- Global uniqueness check
- Reserved slug protection (no "admin", "api", "www", etc.)
```

---

## 🔄 **User Flows**

### **New User Signup Journey (6-Step Flow)**

```
1. User visits yourcrm.com
2. Clicks "Get Started" or "Sign Up"
3. 6-Step Signup Process:
   Step 1: Enter email address
   Step 2: Enter personal details + organization name + password
   Step 3: Select what brings you here (use case)
   Step 4: Select current role
   Step 5: Select team size
   Step 6: Select company size + agree to terms
4. Click "Create Account" button
5. Single API call creates:
   - User account with trial subscription
   - Organization with user as owner
   - User-organization relationship
6. Auto-login with JWT token
7. Show success message (2 seconds)
8. Auto-redirect to organization dashboard
9. Email verification sent (background)
10. Welcome email sent with trial information
```

### **Existing User Login Journey**

```
1. User visits yourcrm.com/login
2. Enters email/password
3. System validates credentials
4. System finds all user's organizations
5. If single organization → auto-select and redirect
6. If multiple organizations → show organization selector
7. User selects organization
8. Generate JWT token for selected organization
9. Redirect to organization dashboard
```

### **Organization Switching Journey**

```
1. User clicks organization switcher in header
2. Shows dropdown with all user's organizations
3. User selects different organization
4. System updates JWT with new organization
5. Redirect to new organization dashboard
6. Show organization-specific data and workspaces
```

### **User Invitation Journey (Admin Side)**

```
1. Admin/Owner logs into organization dashboard
2. Navigates to "Team" or "Users" section
3. Clicks "Invite User" button
4. Fills invitation form:
   - First name, last name, email
   - Role selection (admin, manager, viewer)
   - Optional personal message
5. Admin reviews and confirms invitation
6. System sends invitation email
7. Admin sees pending invitation in dashboard
8. Admin can track invitation status
```

### **User Invitation Journey (Invited User Side)**

```
1. User receives invitation email
2. Clicks "Accept Invitation" link
3. Arrives at invitation acceptance page:
   - Organization details displayed
   - Assigned role shown
4. If new user → show signup form
5. If existing user → show password confirmation
6. User accepts invitation
7. User-organization relationship created
8. User automatically logged in
9. Redirect to organization dashboard
10. Welcome email sent for reference
```

---

## 📧 **Email Templates Needed**

### **Welcome Email (Post-Signup)**

```
Subject: Welcome to [CRM Name] - Your 14-day trial starts now!

Content:
- Welcome message with trial information
- Account details (user name, trial status)
- Trial details:
  * 14-day free trial started
  * Trial expires on [date]
  * Can create unlimited organizations
  * Up to 5 users per organization
  * Up to 3 workspaces per organization
- Next steps (verify email, create organization, invite team)
- Billing information (what happens after trial)
- Support contact information
- Link to login: yourcrm.com/login
```

### **Email Verification**

```
Subject: Please verify your email address

Content:
- Verification purpose
- Verification link (expires in 24 hours)
- Manual verification code option
- Support contact if issues
```

### **Password Reset**

```
Subject: Reset your password

Content:
- Reset request confirmation
- Reset link (expires in 1 hour)
- Security notice about request
- Support contact if not requested
```

### **User Invitation**

```
Subject: You're invited to join [Organization Name]

Content:
- Invitation from [Inviter Name] at [Organization Name]
- Your assigned role: [Role]
- Personal message from inviter (if provided)
- "Accept Invitation" button/link
- Invitation expires in 7 days
- Organization overview and CRM benefits
- Support contact for questions
- Note: Click link to create your account and set password

Call-to-Action:
- Large "Accept Invitation" button
- Alternative text link
- Decline option (optional)
```

### **Invitation Accepted (Welcome for Invited Users)**

```
Subject: Welcome to [Organization Name]!

Content:
- Welcome message specific to invited users
- Account setup confirmation
- Your role and access level
- Next steps and getting started guide
- Team contact information
- Link to dashboard: yourcrm.com/login
- Resources and help documentation
```

---

## ✅ **Phase 1 Requirements Checklist**

### **Backend Requirements**

- [ ] User registration API
- [ ] Email/password login API
- [ ] Password reset functionality
- [ ] Email verification system
- [ ] JWT token generation/validation
- [ ] Organization creation API
- [ ] Organization slug generation
- [ ] Organization switching API
- [ ] User invitation system APIs
- [ ] Invitation token generation/validation
- [ ] Invitation acceptance flow
- [ ] Invitation management (cancel, resend, status)
- [ ] Trial subscription setup on signup
- [ ] Subscription status validation middleware
- [ ] User limit enforcement for trial organizations
- [ ] Trial expiration tracking
- [ ] Role-based permission system
- [ ] Database schema creation
- [ ] Input validation middleware

### **Frontend Requirements**

- [ ] Signup form with validation
- [ ] Organization creation wizard
- [ ] Login form
- [ ] Forgot password form
- [ ] Password reset form
- [ ] Email verification prompt
- [ ] Organization selector modal (multi-org users)
- [ ] Organization switcher component (header)
- [ ] Organization dashboard
- [ ] User invitation form (for admins)
- [ ] Team management dashboard
- [ ] Pending invitations list
- [ ] Invitation acceptance page
- [ ] Invitation status tracking
- [ ] Trial status display (days remaining, user count)
- [ ] User limit warnings for trial organizations
- [ ] Subscription upgrade prompts
- [ ] Basic loading states and error handling

### **Email System**

- [ ] SMTP configuration
- [ ] Welcome email template
- [ ] Verification email template
- [ ] Password reset email template
- [ ] User invitation email template
- [ ] Invitation accepted welcome email template
- [ ] Email sending service integration

### **Security & Validation**

- [ ] Password hashing (bcrypt)
- [ ] Email format validation
- [ ] Password strength validation
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection
- [ ] Input sanitization

---

## 🤔 **Questions for Review**

1. **Trial Scope**: Should trial apply per user (unlimited orgs) or per organization?

2. **Organization Limits**: Should there be limits on organizations per trial user?

3. **Workspace Limits**: Should there be limits on workspaces per organization during trial?

4. **Role Hierarchy**: Are the 4 roles (owner, admin, manager, viewer) sufficient?

5. **Cross-Organization Access**: Can a user be invited to multiple organizations with different roles?

6. **Organization Creation**: Should only original signup users be able to create organizations?

7. **Invitation Limits**: Should there be limits on how many users can be invited per organization/plan?

8. **Trial Duration**: Is 14 days appropriate for trial period, or should it be 7/30 days?

9. **Trial User Limit**: Is 5 users sufficient for trial organizations, or should it be higher/lower?

10. **Trial Features**: Should trial include all features or be limited to basic features?

11. **Trial Expiration**: What happens when trial expires? Grace period? Immediate suspension?

12. **Social Login**: Should we plan for Google/Microsoft SSO in Phase 1 or later?

13. **Organization Isolation**: Should organizations be completely isolated or allow some data sharing?

14. **Organization Deletion**: What happens to user accounts when an organization is deleted?

---

**This Phase 1 now covers the complete multi-organization authentication foundation including organization switching and role-based access! This gives you a fully functional multi-tenant system where users can manage multiple organizations with their teams. Please review and let me know what needs modification before we move to implementation!** 🚀
