# Phase 7: Enhanced CRM Core Features

## SaaS Multi-Tenant CRM - Complete Customer Relationship Management System

---

## 🎯 **Phase 7 Enhanced Scope**

**What we're implementing:**

- **Lead Management Module** - Complete lead lifecycle with custom fields
- **Activity Tracking Module** - Call, Email, LinkedIn interactions
- **Follow-Up Scheduler & Reminder System** - Automated reminders and escalations
- **Lead Qualification & Scoring Engine** - Smart scoring with custom rules
- **Opportunity Pipeline Module** - Deal management with custom stages
- **Accounts & Contacts Module** - Company and stakeholder management
- **Notification & Automation Engine** - Trigger-based workflows
- **Reports & Dashboards** - Role-based analytics
- **Admin Panel / System Configuration** - User and workflow management

**Building on Phase 1 Foundation:**

- ✅ User management and multi-organization support
- ✅ Role-based access control (Owner, Admin, Manager, Viewer)
- ✅ Authentication and session management
- ✅ Trial management and subscription limits

---

## 🔄 **CRM Lifecycle Overview**

```
📈 COMPLETE CRM LIFECYCLE:

[LEAD]
 ↓ Activities Logged (Call, Email, LinkedIn)
 ↓ Follow-Up Scheduled
 ↓ Qualified (Scored + Responsive)
 ↓ Opportunity Created
 ↓ Documents Shared (Proposals)
 ↓ Negotiation
 ↓ Closed (Won / Lost)
 ↓ Client Record (if won)

DETAILED FLOW:
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   NEW   │───▶│   CONTACT   │───▶│ IN CONVERSA- │───▶│  QUALIFIED  │
│  LEAD   │    │  ATTEMPTED  │    │     TION     │    │             │
└─────────┘    └─────────────┘    └──────────────┘    └─────────────┘
     │               │                    │                   │
     ▼               ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              DISQUALIFIED / NOT REACHABLE                          │
└─────────────────────────────────────────────────────────────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ OPPORTUNITY │───▶│  PROPOSAL    │───▶│ NEGOTIATION │───▶│   CLOSED    │
│ (DISCOVERY) │    │     SENT     │    │             │    │ (WON/LOST)  │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                                                                   │
                                                                   ▼
                                                          ┌─────────────┐
                                                          │   CLIENT    │
                                                          │   RECORD    │
                                                          │  (if won)   │
                                                          └─────────────┘
```

---

## 📊 **Database Schema Design**

### **Core CRM Tables**

```sql
-- =============================================
-- LEADS MANAGEMENT
-- =============================================

-- Main leads table
CREATE TABLE leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Basic Contact Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    alt_email VARCHAR(255),
    phone VARCHAR(20),
    alt_phone VARCHAR(20),
    linkedin_profile VARCHAR(500),
    alt_linkedin_profile VARCHAR(500),

    -- Company Information
    business_name VARCHAR(255),
    company_website VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50), -- "1-10", "11-50", "51-200", etc.

    -- Lead Details
    source VARCHAR(100), -- "LinkedIn", "Cold Call", "Referral", etc.
    product_interest TEXT,
    tags TEXT[], -- Array of tags

    -- Status & Assignment
    status lead_status DEFAULT 'new',
    assigned_to UUID REFERENCES users(user_id),
    created_by UUID NOT NULL REFERENCES users(user_id),

    -- Scoring & Qualification
    lead_score INTEGER DEFAULT 0,
    score_grade VARCHAR(10), -- "Hot", "Warm", "Cold"
    qualification_notes TEXT,

    -- Timeline
    last_contact_date TIMESTAMPTZ,
    next_followup_date TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT unique_email_per_org UNIQUE(organization_id, email),
    INDEX idx_leads_assigned_to (assigned_to),
    INDEX idx_leads_status (status),
    INDEX idx_leads_score (lead_score),
    INDEX idx_leads_next_followup (next_followup_date),
    INDEX idx_leads_organization (organization_id)
);

-- Lead status enum
CREATE TYPE lead_status AS ENUM (
    'new',
    'contact_attempted',
    'in_conversation',
    'qualified',
    'disqualified',
    'not_reachable'
);

-- =============================================
-- ACTIVITY TRACKING
-- =============================================

CREATE TABLE activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Related entities
    lead_id UUID REFERENCES leads(lead_id),
    opportunity_id UUID REFERENCES opportunities(opportunity_id),
    account_id UUID REFERENCES accounts(account_id),

    -- Activity details
    activity_type activity_type NOT NULL,
    subject VARCHAR(255),
    description TEXT,

    -- Outcome & Results
    outcome VARCHAR(100), -- "Connected", "Voicemail", "No Answer", etc.
    duration_minutes INTEGER,

    -- Files & Attachments
    attachments JSONB, -- Store file metadata

    -- Follow-up
    next_followup_date TIMESTAMPTZ,
    followup_notes TEXT,

    -- User & Timeline
    performed_by UUID NOT NULL REFERENCES users(user_id),
    activity_date TIMESTAMPTZ DEFAULT NOW(),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    INDEX idx_activities_lead (lead_id),
    INDEX idx_activities_opportunity (opportunity_id),
    INDEX idx_activities_type (activity_type),
    INDEX idx_activities_date (activity_date),
    INDEX idx_activities_user (performed_by),
    INDEX idx_activities_followup (next_followup_date)
);

-- Activity type enum
CREATE TYPE activity_type AS ENUM (
    'call',
    'email',
    'linkedin',
    'meeting',
    'note',
    'task'
);

-- =============================================
-- OPPORTUNITY PIPELINE
-- =============================================

CREATE TABLE opportunities (
    opportunity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Basic Information
    opportunity_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Related entities
    lead_id UUID REFERENCES leads(lead_id), -- Original lead
    account_id UUID REFERENCES accounts(account_id),
    primary_contact_id UUID REFERENCES contacts(contact_id),

    -- Pipeline & Status
    stage opportunity_stage DEFAULT 'discovery',
    probability DECIMAL(5,2), -- 0.00 to 100.00

    -- Financial
    deal_value DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Timeline
    expected_close_date DATE,
    actual_close_date DATE,

    -- Assignment
    assigned_bdm UUID REFERENCES users(user_id),

    -- Products/Services
    products_interested TEXT[],
    competitors TEXT[],

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    INDEX idx_opportunities_stage (stage),
    INDEX idx_opportunities_assigned (assigned_bdm),
    INDEX idx_opportunities_close_date (expected_close_date),
    INDEX idx_opportunities_value (deal_value),
    INDEX idx_opportunities_account (account_id)
);

-- Opportunity stage enum
CREATE TYPE opportunity_stage AS ENUM (
    'discovery',
    'proposal_sent',
    'negotiation',
    'verbal_win',
    'closed_won',
    'closed_lost'
);

-- =============================================
-- ACCOUNTS & CONTACTS
-- =============================================

CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Company Information
    company_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    website VARCHAR(500),

    -- Details
    industry VARCHAR(100),
    employee_size VARCHAR(50),
    annual_revenue DECIMAL(15,2),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),

    -- Business Info
    phone VARCHAR(20),
    description TEXT,

    -- CRM Data
    account_status account_status DEFAULT 'prospect',
    assigned_account_manager UUID REFERENCES users(user_id),

    -- Financial
    total_revenue DECIMAL(15,2) DEFAULT 0,
    last_activity_date TIMESTAMPTZ,

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT unique_domain_per_org UNIQUE(organization_id, domain),
    INDEX idx_accounts_status (account_status),
    INDEX idx_accounts_manager (assigned_account_manager),
    INDEX idx_accounts_industry (industry)
);

-- Account status enum
CREATE TYPE account_status AS ENUM (
    'prospect',
    'customer',
    'former_customer',
    'partner'
);

CREATE TABLE contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    account_id UUID NOT NULL REFERENCES accounts(account_id),

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),

    -- Professional Information
    job_title VARCHAR(150),
    department VARCHAR(100),
    linkedin_profile VARCHAR(500),

    -- CRM Data
    is_primary BOOLEAN DEFAULT false,
    is_decision_maker BOOLEAN DEFAULT false,
    contact_status contact_status DEFAULT 'active',

    -- Communication Preferences
    preferred_contact_method VARCHAR(50),

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    INDEX idx_contacts_account (account_id),
    INDEX idx_contacts_email (email),
    INDEX idx_contacts_decision_maker (is_decision_maker),
    CONSTRAINT unique_email_per_account UNIQUE(account_id, email)
);

-- Contact status enum
CREATE TYPE contact_status AS ENUM (
    'active',
    'inactive',
    'bounced'
);

-- =============================================
-- FOLLOW-UP & REMINDERS
-- =============================================

CREATE TABLE followup_reminders (
    reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Related entities
    lead_id UUID REFERENCES leads(lead_id),
    opportunity_id UUID REFERENCES opportunities(opportunity_id),
    activity_id UUID REFERENCES activities(activity_id),

    -- Reminder details
    reminder_type reminder_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Scheduling
    due_date TIMESTAMPTZ NOT NULL,
    reminder_time TIMESTAMPTZ, -- When to send notification

    -- Assignment
    assigned_to UUID NOT NULL REFERENCES users(user_id),
    created_by UUID NOT NULL REFERENCES users(user_id),

    -- Status
    status reminder_status DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,

    -- Escalation
    escalation_level INTEGER DEFAULT 0, -- 0=none, 1=first, 2=second, 3=final
    last_escalation_sent TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    INDEX idx_reminders_due_date (due_date),
    INDEX idx_reminders_assigned (assigned_to),
    INDEX idx_reminders_status (status),
    INDEX idx_reminders_lead (lead_id),
    INDEX idx_reminders_opportunity (opportunity_id)
);

-- Reminder enums
CREATE TYPE reminder_type AS ENUM (
    'follow_up_call',
    'send_email',
    'send_proposal',
    'schedule_demo',
    'check_decision',
    'custom'
);

CREATE TYPE reminder_status AS ENUM (
    'pending',
    'completed',
    'overdue',
    'cancelled'
);

-- =============================================
-- LEAD SCORING SYSTEM
-- =============================================

CREATE TABLE lead_scoring_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Rule definition
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Trigger conditions
    trigger_event VARCHAR(100) NOT NULL, -- 'email_opened', 'email_clicked', 'responded', etc.
    trigger_criteria JSONB, -- Additional conditions

    -- Scoring
    points_awarded INTEGER NOT NULL,
    points_deducted INTEGER DEFAULT 0,

    -- Rule settings
    is_active BOOLEAN DEFAULT true,
    max_applications INTEGER, -- How many times this rule can apply to same lead

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_scoring_rules_event (trigger_event),
    INDEX idx_scoring_rules_active (is_active)
);

CREATE TABLE lead_score_history (
    score_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    lead_id UUID NOT NULL REFERENCES leads(lead_id),

    -- Scoring event
    rule_id UUID REFERENCES lead_scoring_rules(rule_id),
    event_trigger VARCHAR(100) NOT NULL,
    points_changed INTEGER NOT NULL, -- Can be positive or negative
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,

    -- Context
    triggered_by_activity UUID REFERENCES activities(activity_id),
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_score_history_lead (lead_id),
    INDEX idx_score_history_date (created_at)
);

-- =============================================
-- DOCUMENTS & PROPOSALS
-- =============================================

CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Document details
    document_name VARCHAR(255) NOT NULL,
    document_type document_type NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),

    -- Related entities
    opportunity_id UUID REFERENCES opportunities(opportunity_id),
    account_id UUID REFERENCES accounts(account_id),

    -- Versioning
    version_number INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(document_id),

    -- Status
    status document_status DEFAULT 'draft',

    -- Sharing & Tracking
    is_shared_externally BOOLEAN DEFAULT false,
    external_share_link VARCHAR(500),
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,

    -- Audit
    uploaded_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_documents_opportunity (opportunity_id),
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_status (status)
);

-- Document enums
CREATE TYPE document_type AS ENUM (
    'proposal',
    'quote',
    'contract',
    'presentation',
    'brochure',
    'other'
);

CREATE TYPE document_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'sent',
    'signed',
    'archived'
);

-- =============================================
-- NOTIFICATIONS & AUTOMATION
-- =============================================

CREATE TABLE notification_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Rule definition
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Trigger conditions
    trigger_event VARCHAR(100) NOT NULL,
    trigger_conditions JSONB,

    -- Actions
    notification_type notification_type NOT NULL,
    recipients JSONB, -- User IDs, roles, or specific emails
    message_template TEXT,

    -- Settings
    is_active BOOLEAN DEFAULT true,
    delay_minutes INTEGER DEFAULT 0,

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_notification_rules_event (trigger_event),
    INDEX idx_notification_rules_active (is_active)
);

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
    'email',
    'in_app',
    'slack',
    'sms'
);

CREATE TABLE notification_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Notification details
    rule_id UUID REFERENCES notification_rules(rule_id),
    notification_type notification_type NOT NULL,
    recipient_user_id UUID REFERENCES users(user_id),
    recipient_email VARCHAR(255),

    -- Content
    subject VARCHAR(255),
    message TEXT,

    -- Status
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    -- Related entities
    related_lead_id UUID REFERENCES leads(lead_id),
    related_opportunity_id UUID REFERENCES opportunities(opportunity_id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_notification_logs_status (status),
    INDEX idx_notification_logs_recipient (recipient_user_id),
    INDEX idx_notification_logs_date (created_at)
);

-- Notification status enum
CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'cancelled'
);

-- =============================================
-- REPORTS & DASHBOARD DATA
-- =============================================

CREATE TABLE dashboard_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Metric details
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'leads_count', 'conversion_rate', etc.
    metric_value DECIMAL(15,4),

    -- Dimensions
    user_id UUID REFERENCES users(user_id), -- For user-specific metrics
    time_period VARCHAR(20), -- 'daily', 'weekly', 'monthly'
    date_recorded DATE NOT NULL,

    -- Additional context
    metadata JSONB,

    -- Audit
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    INDEX idx_dashboard_metrics_org_date (organization_id, date_recorded),
    INDEX idx_dashboard_metrics_user (user_id),
    INDEX idx_dashboard_metrics_type (metric_type),
    CONSTRAINT unique_metric_per_day UNIQUE(organization_id, metric_name, metric_type, user_id, date_recorded)
);
```

---

## 🎯 **1. Lead Management Module**

### **Lead Creation & Custom Fields**

```typescript
interface Lead {
  // Basic Information
  leadId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  altEmail?: string;
  phone?: string;
  altPhone?: string;
  linkedinProfile?: string;
  altLinkedinProfile?: string;

  // Company Information
  businessName?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;

  // Lead Details
  source: string; // "LinkedIn", "Cold Call", "Referral"
  productInterest?: string;
  tags: string[];

  // Status & Assignment
  status: LeadStatus;
  assignedTo?: string; // User ID
  createdBy: string;

  // Scoring & Qualification
  leadScore: number;
  scoreGrade: "Hot" | "Warm" | "Cold";
  qualificationNotes?: string;

  // Timeline
  lastContactDate?: Date;
  nextFollowupDate?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type LeadStatus =
  | "new"
  | "contact_attempted"
  | "in_conversation"
  | "qualified"
  | "disqualified"
  | "not_reachable";
```

### **Lead Auto-Assignment Logic**

```typescript
interface AssignmentRule {
  ruleId: string;
  organizationId: string;
  ruleName: string;

  // Conditions
  sourceConditions?: string[]; // ["LinkedIn", "Cold Call"]
  industryConditions?: string[]; // ["Technology", "Healthcare"]
  companySize?: string[]; // ["11-50", "51-200"]
  region?: string[];

  // Assignment
  assignmentType: "round_robin" | "lead_score" | "manual";
  eligibleUsers: string[]; // User IDs

  // Settings
  isActive: boolean;
  priority: number; // Higher priority rules evaluated first
}

// Assignment Logic Example:
const assignmentLogic = {
  creator_ownership: {
    description: "Whoever creates the lead becomes the owner",
    priority: 1,
    implementation: "Set assignedTo = createdBy",
  },

  bdm_reassignment: {
    description: "BDM can assign/reassign leads to team",
    roles: ["owner", "admin", "manager"],
    implementation: "Allow role-based reassignment",
  },

  auto_assignment: {
    description: "Automatic assignment based on rules",
    priority: 2,
    implementation: "Apply assignment rules if no manual assignment",
  },
};
```

### **Duplicate Detection System**

```typescript
interface DuplicateDetectionRule {
  ruleId: string;
  organizationId: string;

  // Matching criteria
  emailMatch: boolean; // Exact match
  phoneMatch: boolean; // Normalized match
  companyAndNameMatch: boolean; // Fuzzy match
  linkedinMatch: boolean; // URL match
  domainSimilarity: number; // 0.8 = 80% similarity threshold

  // Actions
  autoMergeThreshold: number; // 95% = auto-merge
  suggestMergeThreshold: number; // 80% = suggest merge
  allowDuplicateThreshold: number; // <80% = allow

  isActive: boolean;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number; // 0-100
  matchingLeads: Array<{
    leadId: string;
    matchReason: string;
    confidence: number;
  }>;
  recommendedAction: "auto_merge" | "suggest_merge" | "manual_review" | "allow";
}
```

---

## 📱 **2. Activity Tracking Module**

### **Activity Types & Structure**

```typescript
interface Activity {
  activityId: string;
  organizationId: string;

  // Related entities
  leadId?: string;
  opportunityId?: string;
  accountId?: string;

  // Activity details
  activityType: ActivityType;
  subject: string;
  description?: string;

  // Outcome & Results
  outcome?: string; // "Connected", "Voicemail", "No Answer"
  durationMinutes?: number;

  // Files & Attachments
  attachments?: ActivityAttachment[];

  // Follow-up
  nextFollowupDate?: Date;
  followupNotes?: string;

  // User & Timeline
  performedBy: string; // User ID
  activityDate: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type ActivityType = "call" | "email" | "linkedin" | "meeting" | "note" | "task";

interface ActivityAttachment {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
}

// Activity outcome options by type
const activityOutcomes = {
  call: [
    "Connected - Interested",
    "Connected - Not Interested",
    "Connected - Call Back Later",
    "Voicemail Left",
    "No Answer",
    "Wrong Number",
    "Busy Signal",
  ],

  email: [
    "Sent Successfully",
    "Opened",
    "Clicked Link",
    "Replied - Positive",
    "Replied - Negative",
    "Bounced",
    "Unsubscribed",
  ],

  linkedin: [
    "Connection Request Sent",
    "Connection Accepted",
    "Message Sent",
    "Message Replied",
    "Profile Viewed",
    "Not Responded",
  ],
};
```

### **Activity Logging Interface**

```typescript
// Activity creation flow
interface CreateActivityRequest {
  // Required
  activityType: ActivityType;
  relatedEntityId: string; // Lead or Opportunity ID
  relatedEntityType: "lead" | "opportunity" | "account";
  subject: string;
  performedBy: string;

  // Optional
  description?: string;
  outcome?: string;
  durationMinutes?: number;
  activityDate?: Date; // Defaults to now

  // Follow-up
  scheduleFollowup?: boolean;
  followupDate?: Date;
  followupType?: string;
  followupNotes?: string;

  // Attachments
  attachments?: File[];
}

interface ActivityTimelineView {
  leadId: string;
  activities: Array<{
    activity: Activity;
    user: {
      userId: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    attachments: ActivityAttachment[];
  }>;

  // Grouping options
  groupBy: "date" | "type" | "user";
  filterBy: {
    dateRange?: { start: Date; end: Date };
    activityTypes?: ActivityType[];
    users?: string[];
  };
}
```

---

## ⏰ **3. Follow-Up Scheduler & Reminder System**

### **Reminder Creation & Management**

```typescript
interface FollowupReminder {
  reminderId: string;
  organizationId: string;

  // Related entities
  leadId?: string;
  opportunityId?: string;
  activityId?: string; // If created from activity

  // Reminder details
  reminderType: ReminderType;
  title: string;
  description?: string;

  // Scheduling
  dueDate: Date;
  reminderTime?: Date; // When to send notification

  // Assignment
  assignedTo: string; // User ID
  createdBy: string;

  // Status
  status: ReminderStatus;
  completedAt?: Date;
  completionNotes?: string;

  // Escalation
  escalationLevel: number; // 0=none, 1=first, 2=second, 3=final
  lastEscalationSent?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type ReminderType =
  | "follow_up_call"
  | "send_email"
  | "send_proposal"
  | "schedule_demo"
  | "check_decision"
  | "custom";

type ReminderStatus = "pending" | "completed" | "overdue" | "cancelled";
```

### **Notification & Escalation System**

```typescript
interface NotificationRule {
  ruleId: string;
  organizationId: string;

  // Rule definition
  ruleName: string;
  description?: string;

  // Trigger conditions
  triggerEvent: NotificationTrigger;
  triggerConditions?: Record<string, any>;

  // Actions
  notificationType: NotificationType;
  recipients: NotificationRecipient[];
  messageTemplate: string;

  // Settings
  isActive: boolean;
  delayMinutes: number; // 0 = immediate
}

type NotificationTrigger =
  | "reminder_due"
  | "reminder_overdue"
  | "lead_untouched"
  | "lead_score_threshold"
  | "opportunity_stale"
  | "activity_logged"
  | "status_changed";

type NotificationType = "email" | "in_app" | "slack" | "sms";

interface NotificationRecipient {
  type: "user" | "role" | "email";
  value: string; // User ID, role name, or email address
}

// Default escalation rules
const escalationRules = {
  first_reminder: {
    delayHours: 0,
    message: "You have a follow-up due today",
  },

  second_reminder: {
    delayHours: 24,
    message: "OVERDUE: Follow-up was due yesterday",
  },

  manager_escalation: {
    delayHours: 72,
    message: "Team member has overdue follow-ups",
    recipients: ["manager", "admin"],
  },
};
```

---

## 🎯 **4. Lead Qualification & Scoring Engine**

### **Scoring Rules & Logic**

```typescript
interface LeadScoringRule {
  ruleId: string;
  organizationId: string;

  // Rule definition
  ruleName: string;
  description?: string;

  // Trigger conditions
  triggerEvent: string; // 'email_opened', 'email_clicked', 'responded'
  triggerCriteria?: Record<string, any>;

  // Scoring
  pointsAwarded: number;
  pointsDeducted: number;

  // Rule settings
  isActive: boolean;
  maxApplications?: number; // How many times this rule can apply
}

// Default scoring rules based on your requirements
const defaultScoringRules = [
  {
    ruleName: "Responded to Outreach",
    triggerEvent: "activity_outcome",
    triggerCriteria: {
      activityType: "email",
      outcome: ["Replied - Positive", "Replied - Negative"],
    },
    pointsAwarded: 5,
    pointsDeducted: 0,
  },

  {
    ruleName: "Opened Email / Clicked Link",
    triggerEvent: "activity_outcome",
    triggerCriteria: {
      activityType: "email",
      outcome: ["Opened", "Clicked Link"],
    },
    pointsAwarded: 3,
    pointsDeducted: 0,
  },

  {
    ruleName: "Asked for Quotation",
    triggerEvent: "activity_outcome",
    triggerCriteria: {
      outcome: ["Connected - Interested"],
      keywords: ["quote", "pricing", "proposal", "cost"],
    },
    pointsAwarded: 10,
    pointsDeducted: 0,
  },

  {
    ruleName: "No Response for 10+ Days",
    triggerEvent: "time_based",
    triggerCriteria: {
      daysSinceLastActivity: 10,
      noResponse: true,
    },
    pointsAwarded: 0,
    pointsDeducted: 3,
  },

  {
    ruleName: "Matched ICP Industry/Title",
    triggerEvent: "lead_created",
    triggerCriteria: {
      icpMatching: true,
    },
    pointsAwarded: 5,
    pointsDeducted: 0,
  },
];

// Score grading system
const scoreGrading = {
  hot: { minScore: 40, maxScore: 100, color: "#ff4444" },
  warm: { minScore: 20, maxScore: 39, color: "#ffaa00" },
  cold: { minScore: 0, maxScore: 19, color: "#4444ff" },
};
```

### **Automatic Qualification Triggers**

```typescript
interface QualificationTrigger {
  triggerId: string;
  organizationId: string;

  // Trigger conditions
  triggerName: string;
  conditions: QualificationCondition[];

  // Actions
  autoQualify: boolean;
  notifyUsers: string[]; // User IDs to notify
  createOpportunity: boolean;

  isActive: boolean;
}

interface QualificationCondition {
  type:
    | "score_threshold"
    | "activity_count"
    | "response_received"
    | "icp_match";
  operator: ">=" | ">" | "=" | "<" | "<=";
  value: number | string | boolean;
}

// Example triggers
const qualificationTriggers = [
  {
    triggerName: "High Score Auto-Qualification",
    conditions: [{ type: "score_threshold", operator: ">=", value: 40 }],
    autoQualify: false, // Suggest, don't auto-qualify
    notifyUsers: ["assigned_user", "manager"],
    createOpportunity: false,
  },

  {
    triggerName: "Engaged Lead - Multiple Responses",
    conditions: [
      { type: "activity_count", operator: ">=", value: 3 },
      { type: "response_received", operator: "=", value: true },
    ],
    autoQualify: false,
    notifyUsers: ["assigned_user"],
    createOpportunity: false,
  },
];
```

---

## 💼 **5. Opportunity Pipeline Module**

### **Opportunity Structure & Stages**

```typescript
interface Opportunity {
  opportunityId: string;
  organizationId: string;

  // Basic Information
  opportunityName: string;
  description?: string;

  // Related entities
  leadId?: string; // Original lead
  accountId?: string;
  primaryContactId?: string;

  // Pipeline & Status
  stage: OpportunityStage;
  probability: number; // 0-100

  // Financial
  dealValue: number;
  currency: string;

  // Timeline
  expectedCloseDate?: Date;
  actualCloseDate?: Date;

  // Assignment
  assignedBdm?: string; // User ID

  // Products/Services
  productsInterested: string[];
  competitors: string[];

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type OpportunityStage =
  | "discovery"
  | "proposal_sent"
  | "negotiation"
  | "verbal_win"
  | "closed_won"
  | "closed_lost";

// Stage configuration with probabilities
const stageConfiguration = {
  discovery: { probability: 20, color: "#e3f2fd" },
  proposal_sent: { probability: 40, color: "#fff3e0" },
  negotiation: { probability: 60, color: "#fff8e1" },
  verbal_win: { probability: 80, color: "#f3e5f5" },
  closed_won: { probability: 100, color: "#e8f5e8" },
  closed_lost: { probability: 0, color: "#ffebee" },
};
```

### **Opportunity Workflow & Automation**

```typescript
interface OpportunityWorkflow {
  workflowId: string;
  organizationId: string;

  // Workflow definition
  workflowName: string;
  triggerStage: OpportunityStage;

  // Actions
  actions: WorkflowAction[];

  // Settings
  isActive: boolean;
  delayDays: number; // Days to wait before executing
}

interface WorkflowAction {
  actionType:
    | "create_task"
    | "send_notification"
    | "update_field"
    | "create_activity";
  actionConfig: Record<string, any>;
}

// Example workflows
const opportunityWorkflows = [
  {
    workflowName: "Discovery Stage Entry",
    triggerStage: "discovery",
    actions: [
      {
        actionType: "create_task",
        actionConfig: {
          title: "Conduct discovery call",
          description:
            "Schedule and conduct discovery call to understand requirements",
          dueInDays: 3,
          assignTo: "opportunity_owner",
        },
      },
      {
        actionType: "send_notification",
        actionConfig: {
          recipients: ["opportunity_owner", "manager"],
          message: "New opportunity created - discovery stage",
        },
      },
    ],
  },

  {
    workflowName: "Proposal Stage Reminder",
    triggerStage: "proposal_sent",
    delayDays: 7,
    actions: [
      {
        actionType: "create_task",
        actionConfig: {
          title: "Follow up on proposal",
          description: "Follow up on proposal sent a week ago",
          assignTo: "opportunity_owner",
        },
      },
    ],
  },
];
```

---

## 🏢 **6. Accounts & Contacts Module**

### **Account Management System**

```typescript
interface Account {
  accountId: string;
  organizationId: string;

  // Company Information
  companyName: string;
  domain?: string;
  website?: string;

  // Details
  industry?: string;
  employeeSize?: string;
  annualRevenue?: number;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  // Business Info
  phone?: string;
  description?: string;

  // CRM Data
  accountStatus: AccountStatus;
  assignedAccountManager?: string; // User ID

  // Financial
  totalRevenue: number; // Sum of all won deals
  lastActivityDate?: Date;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type AccountStatus = "prospect" | "customer" | "former_customer" | "partner";

interface Contact {
  contactId: string;
  organizationId: string;
  accountId: string;

  // Personal Information
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;

  // Professional Information
  jobTitle?: string;
  department?: string;
  linkedinProfile?: string;

  // CRM Data
  isPrimary: boolean;
  isDecisionMaker: boolean;
  contactStatus: ContactStatus;

  // Communication Preferences
  preferredContactMethod?: string;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type ContactStatus = "active" | "inactive" | "bounced";
```

### **Account Hierarchy & Relationships**

```typescript
interface AccountRelationship {
  relationshipId: string;
  organizationId: string;

  // Related accounts
  parentAccountId: string;
  childAccountId: string;

  // Relationship details
  relationshipType:
    | "subsidiary"
    | "parent_company"
    | "partner"
    | "vendor"
    | "customer";
  description?: string;

  // Timeline
  relationshipStartDate?: Date;
  relationshipEndDate?: Date;

  isActive: boolean;
  createdAt: Date;
}

// Account aggregation for reporting
interface AccountSummary {
  accountId: string;
  companyName: string;

  // Contact statistics
  totalContacts: number;
  decisionMakers: number;
  activeContacts: number;

  // Opportunity statistics
  totalOpportunities: number;
  openOpportunities: number;
  totalValue: number;
  wonValue: number;

  // Activity statistics
  lastActivityDate?: Date;
  totalActivities: number;
  recentActivities: number; // Last 30 days

  // Engagement score
  engagementScore: number; // Calculated based on activities, responses, etc.
}
```

---

## 📊 **7. Reports & Dashboards**

### **Role-Based Dashboard Views**

```typescript
interface DashboardConfig {
  configId: string;
  organizationId: string;

  // Configuration
  dashboardName: string;
  roleAccess: string[]; // Roles that can access this dashboard

  // Widgets
  widgets: DashboardWidget[];
  layout: DashboardLayout;

  // Settings
  refreshInterval: number; // Minutes
  isDefault: boolean;

  createdBy: string;
  createdAt: Date;
}

interface DashboardWidget {
  widgetId: string;
  widgetType: WidgetType;
  title: string;

  // Data configuration
  dataSource: string;
  filters: Record<string, any>;
  dateRange: DateRangeConfig;

  // Display configuration
  chartType?: ChartType;
  position: { x: number; y: number; width: number; height: number };

  // Settings
  refreshInterval: number;
  isVisible: boolean;
}

type WidgetType =
  | "metric_card"
  | "chart"
  | "table"
  | "progress_bar"
  | "activity_feed"
  | "task_list";

type ChartType = "line" | "bar" | "pie" | "doughnut" | "area" | "funnel";
```

### **SDR Dashboard Metrics**

```typescript
interface SDRDashboardMetrics {
  userId: string;
  dateRange: { start: Date; end: Date };

  // Activity metrics
  callsMade: number;
  emailsSent: number;
  linkedinMessages: number;

  // Lead metrics
  leadsAdded: number;
  leadsContacted: number;
  leadsQualified: number;

  // Performance metrics
  contactRate: number; // % of leads contacted
  responseRate: number; // % of contacts that responded
  conversionRate: number; // % of leads converted to qualified

  // Follow-up metrics
  followUpsDue: number;
  followUpsCompleted: number;
  overdueFollowUps: number;

  // Goals & targets
  monthlyTargets: {
    callsTarget: number;
    leadsTarget: number;
    qualifiedTarget: number;
  };

  achievementPercentage: {
    calls: number;
    leads: number;
    qualified: number;
  };
}
```

### **BDM Dashboard Metrics**

```typescript
interface BDMDashboardMetrics {
  userId: string;
  dateRange: { start: Date; end: Date };

  // Pipeline metrics
  totalPipelineValue: number;
  weightedPipelineValue: number; // Value * Probability
  numberOfOpportunities: number;

  // Deal velocity
  averageDealSize: number;
  averageSalesCycle: number; // Days
  dealVelocity: number; // Value per day

  // Win rate metrics
  totalDealsClosedWon: number;
  totalDealsClosedLost: number;
  winRate: number; // %

  // Revenue metrics
  revenueThisMonth: number;
  revenueThisQuarter: number;
  revenueThisYear: number;

  // Forecast metrics
  forecastThisMonth: number;
  forecastThisQuarter: number;
  commitForecast: number;
  bestCaseForecast: number;

  // Stage analysis
  dealsByStage: Array<{
    stage: OpportunityStage;
    count: number;
    totalValue: number;
    averageAge: number; // Days in stage
  }>;
}
```

### **Manager Dashboard Metrics**

```typescript
interface ManagerDashboardMetrics {
  organizationId: string;
  dateRange: { start: Date; end: Date };

  // Team overview
  teamSize: number;
  activeUsers: number;

  // Team performance
  teamMetrics: {
    totalCalls: number;
    totalEmails: number;
    totalLeadsAdded: number;
    totalQualified: number;
    totalRevenue: number;
  };

  // Individual performance
  teamLeaderboard: Array<{
    userId: string;
    userName: string;
    role: string;

    // Performance metrics
    leadsAdded: number;
    leadsQualified: number;
    dealsWon: number;
    revenue: number;

    // Activity metrics
    callsMade: number;
    emailsSent: number;

    // Efficiency metrics
    conversionRate: number;
    responseRate: number;

    rank: number;
  }>;

  // Pipeline analysis
  pipelineHealth: {
    totalValue: number;
    weightedValue: number;
    averageDealAge: number;
    staleDeals: number; // 45+ days in stage

    stageDropOff: Array<{
      fromStage: OpportunityStage;
      toStage: OpportunityStage;
      count: number;
      percentage: number;
    }>;
  };

  // Alerts & attention needed
  alerts: Array<{
    alertType:
      | "overdue_followup"
      | "stale_deal"
      | "low_activity"
      | "missed_target";
    userId?: string;
    entityId?: string;
    message: string;
    priority: "high" | "medium" | "low";
    createdAt: Date;
  }>;
}
```

---

## ⚙️ **8. Admin Panel / System Configuration**

### **User Management & Roles**

```typescript
interface CRMUserRole {
  roleId: string;
  organizationId: string;

  // Role definition
  roleName: string;
  description?: string;

  // Permissions
  permissions: CRMPermissions;

  // Settings
  isSystemRole: boolean; // Cannot be deleted
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

interface CRMPermissions {
  // Lead management
  canViewAllLeads: boolean;
  canEditAllLeads: boolean;
  canDeleteLeads: boolean;
  canImportLeads: boolean;
  canExportLeads: boolean;
  canAssignLeads: boolean;

  // Opportunity management
  canViewAllOpportunities: boolean;
  canEditAllOpportunities: boolean;
  canDeleteOpportunities: boolean;
  canCloseOpportunities: boolean;

  // Account management
  canViewAllAccounts: boolean;
  canEditAccounts: boolean;
  canDeleteAccounts: boolean;

  // Activity management
  canViewAllActivities: boolean;
  canLogActivities: boolean;
  canEditActivities: boolean;
  canDeleteActivities: boolean;

  // Reporting
  canViewReports: boolean;
  canCreateReports: boolean;
  canExportReports: boolean;
  canViewTeamMetrics: boolean;

  // Administration
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageWorkflows: boolean;
  canManageIntegrations: boolean;
  canViewAuditLogs: boolean;

  // System configuration
  canConfigurePipeline: boolean;
  canConfigureScoring: boolean;
  canConfigureNotifications: boolean;
}

// Default role configurations
const defaultCRMRoles = {
  sdr: {
    roleName: "Sales Development Representative",
    permissions: {
      canViewAllLeads: false, // Only assigned leads
      canEditAllLeads: false, // Only assigned leads
      canDeleteLeads: false,
      canImportLeads: true,
      canExportLeads: true,
      canAssignLeads: false,

      canViewAllOpportunities: false, // Only created by them
      canEditAllOpportunities: false,
      canDeleteOpportunities: false,
      canCloseOpportunities: false,

      canLogActivities: true,
      canEditActivities: true, // Only their own
      canDeleteActivities: false,

      canViewReports: true, // Personal reports only
      canViewTeamMetrics: false,

      // No admin permissions
      canManageUsers: false,
      canManageRoles: false,
      canManageWorkflows: false,
    },
  },

  bdm: {
    roleName: "Business Development Manager",
    permissions: {
      canViewAllLeads: true,
      canEditAllLeads: true,
      canDeleteLeads: false,
      canImportLeads: true,
      canExportLeads: true,
      canAssignLeads: true,

      canViewAllOpportunities: true,
      canEditAllOpportunities: true,
      canDeleteOpportunities: false,
      canCloseOpportunities: true,

      canViewAllActivities: true,
      canLogActivities: true,
      canEditActivities: true,
      canDeleteActivities: false,

      canViewReports: true,
      canCreateReports: true,
      canExportReports: true,
      canViewTeamMetrics: true,

      // Limited admin permissions
      canManageUsers: false,
      canManageRoles: false,
      canManageWorkflows: false,
    },
  },

  manager: {
    roleName: "Sales Manager",
    permissions: {
      // Full access to most features
      canViewAllLeads: true,
      canEditAllLeads: true,
      canDeleteLeads: true,
      canImportLeads: true,
      canExportLeads: true,
      canAssignLeads: true,

      canViewAllOpportunities: true,
      canEditAllOpportunities: true,
      canDeleteOpportunities: true,
      canCloseOpportunities: true,

      canViewAllActivities: true,
      canLogActivities: true,
      canEditActivities: true,
      canDeleteActivities: true,

      canViewReports: true,
      canCreateReports: true,
      canExportReports: true,
      canViewTeamMetrics: true,

      // Advanced admin permissions
      canManageUsers: true,
      canManageRoles: false, // Cannot modify roles
      canManageWorkflows: true,
      canManageIntegrations: false,
      canViewAuditLogs: true,

      canConfigurePipeline: true,
      canConfigureScoring: true,
      canConfigureNotifications: true,
    },
  },
};
```

### **Workflow Builder Configuration**

```typescript
interface WorkflowBuilder {
  workflowId: string;
  organizationId: string;

  // Workflow definition
  workflowName: string;
  description?: string;

  // Trigger configuration
  trigger: WorkflowTrigger;

  // Actions sequence
  actions: WorkflowActionStep[];

  // Settings
  isActive: boolean;
  executionOrder: number; // If multiple workflows match

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowTrigger {
  triggerType: "event" | "schedule" | "manual";

  // Event triggers
  eventType?: string; // 'lead_created', 'opportunity_stage_changed', etc.
  conditions?: WorkflowCondition[];

  // Schedule triggers
  scheduleType?: "once" | "recurring";
  scheduleDate?: Date;
  recurringPattern?: string; // Cron expression

  // Manual triggers
  allowedRoles?: string[]; // Roles that can manually trigger
}

interface WorkflowCondition {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "not_contains";
  value: any;
  logicalOperator?: "AND" | "OR"; // For multiple conditions
}

interface WorkflowActionStep {
  stepId: string;
  actionType: WorkflowActionType;
  actionConfig: Record<string, any>;
  delayMinutes?: number; // Delay before executing this step

  // Conditional execution
  conditions?: WorkflowCondition[];
}

type WorkflowActionType =
  | "send_email"
  | "create_task"
  | "update_field"
  | "assign_user"
  | "create_opportunity"
  | "log_activity"
  | "send_notification"
  | "call_webhook";
```

---

## 🔄 **Implementation Phases**

### **Phase 7A: Foundation (Weeks 1-4)**

```typescript
const phase7A_Implementation = {
  week1: [
    "Setup enhanced database schema",
    "Create Lead model with custom fields",
    "Basic Lead CRUD operations",
    "Lead assignment logic implementation",
  ],

  week2: [
    "Activity tracking system",
    "Activity logging interface",
    "Activity timeline view",
    "Basic duplicate detection",
  ],

  week3: [
    "Follow-up reminder system",
    "Basic notification engine",
    "Lead scoring foundation",
    "Opportunity creation from leads",
  ],

  week4: [
    "Account and Contact management",
    "Basic pipeline management",
    "Integration with existing auth system",
    "API endpoint completion",
  ],
};
```

### **Phase 7B: Enhancement (Weeks 5-8)**

```typescript
const phase7B_Implementation = {
  week5: [
    "Advanced lead scoring rules",
    "Qualification triggers",
    "Workflow automation engine",
    "Enhanced duplicate detection",
  ],

  week6: [
    "Dashboard metrics calculation",
    "Role-based reporting",
    "Advanced pipeline features",
    "Opportunity aging analysis",
  ],

  week7: [
    "Notification system enhancement",
    "Email integration",
    "Advanced workflow builder",
    "Performance optimization",
  ],

  week8: [
    "Admin panel completion",
    "User role management",
    "System configuration UI",
    "Testing and bug fixes",
  ],
};
```

---

## 📋 **API Endpoints Specification**

### **Lead Management APIs**

```typescript
// Lead CRUD operations
POST   /api/leads                    // Create lead
GET    /api/leads                    // List leads with filters
GET    /api/leads/:id                // Get lead details
PUT    /api/leads/:id                // Update lead
DELETE /api/leads/:id                // Delete lead
POST   /api/leads/:id/assign         // Assign lead to user
POST   /api/leads/:id/qualify        // Mark lead as qualified
POST   /api/leads/:id/convert        // Convert to opportunity

// Lead import/export
POST   /api/leads/import             // Bulk import leads
GET    /api/leads/export             // Export leads

// Lead scoring
GET    /api/leads/:id/score          // Get lead score details
POST   /api/leads/:id/score/manual   // Manual score adjustment

// Duplicate detection
POST   /api/leads/duplicate-check    // Check for duplicates
POST   /api/leads/merge              // Merge duplicate leads
```

### **Activity Tracking APIs**

```typescript
// Activity management
POST   /api/activities               // Log new activity
GET    /api/activities               // List activities
GET    /api/activities/:id           // Get activity details
PUT    /api/activities/:id           // Update activity
DELETE /api/activities/:id           // Delete activity

// Activity timeline
GET    /api/leads/:id/activities     // Get lead activity timeline
GET    /api/opportunities/:id/activities // Get opportunity activities

// Activity attachments
POST   /api/activities/:id/attachments   // Upload attachment
DELETE /api/activities/:id/attachments/:fileId // Delete attachment
```

### **Opportunity Pipeline APIs**

```typescript
// Opportunity management
POST   /api/opportunities            // Create opportunity
GET    /api/opportunities            // List opportunities
GET    /api/opportunities/:id        // Get opportunity details
PUT    /api/opportunities/:id        // Update opportunity
DELETE /api/opportunities/:id        // Delete opportunity
POST   /api/opportunities/:id/stage  // Move to next stage
POST   /api/opportunities/:id/close  // Close opportunity (won/lost)

// Pipeline views
GET    /api/pipeline/board           // Kanban board data
GET    /api/pipeline/stages          // Pipeline stage configuration
PUT    /api/pipeline/stages          // Update stage configuration
```

### **Reporting & Analytics APIs**

```typescript
// Dashboard metrics
GET    /api/dashboard/sdr            // SDR dashboard data
GET    /api/dashboard/bdm            // BDM dashboard data
GET    /api/dashboard/manager        // Manager dashboard data

// Reports
GET    /api/reports/leads            // Lead reports
GET    /api/reports/activities       // Activity reports
GET    /api/reports/pipeline         // Pipeline reports
GET    /api/reports/performance      // Performance reports
POST   /api/reports/custom          // Generate custom report
GET    /api/reports/export/:id       // Export report

// Metrics calculation
GET    /api/metrics/conversion-rates // Conversion rate metrics
GET    /api/metrics/team-performance // Team performance metrics
GET    /api/metrics/pipeline-health  // Pipeline health metrics
```

## 📧 **Email Service Integration for Mass Email Campaigns**

### **Email Service Provider Options**

```typescript
// Recommended Email Service Providers
const emailServiceProviders = {
  // Transactional + Marketing
  sendgrid: {
    name: "SendGrid",
    features: ["Transactional", "Marketing", "Templates", "Analytics"],
    pricing: "Free tier: 100 emails/day",
    integration: "REST API + SMTP",
    pros: ["Reliable delivery", "Good analytics", "Template builder"],
    cons: ["Can be expensive at scale"],
  },

  resend: {
    name: "Resend",
    features: ["Developer-friendly", "React templates", "Analytics"],
    pricing: "Free tier: 3,000 emails/month",
    integration: "REST API",
    pros: ["Modern API", "React email templates", "Good deliverability"],
    cons: ["Newer service", "Limited marketing features"],
  },

  brevo: {
    name: "Brevo (formerly Sendinblue)",
    features: ["Email marketing", "SMS", "Chat", "CRM"],
    pricing: "Free tier: 300 emails/day",
    integration: "REST API + SMTP",
    pros: ["All-in-one platform", "Good free tier", "EU-based (GDPR)"],
    cons: ["Interface can be complex"],
  },

  // Since you're already using Apollo
  apollo: {
    name: "Apollo.io",
    features: ["Email sequences", "Lead database", "Analytics"],
    pricing: "Subscription-based",
    integration: "API + Webhook",
    pros: ["Already integrated", "Lead data included", "Sales-focused"],
    cons: ["More expensive", "Limited customization"],
  },
};
```

### **Enhanced Database Schema for Email Campaigns**

```sql
-- =============================================
-- EMAIL CAMPAIGNS & SEQUENCES
-- =============================================

CREATE TABLE email_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Campaign details
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type campaign_type NOT NULL,
    description TEXT,

    -- Email content
    subject_line VARCHAR(255) NOT NULL,
    email_template_id UUID REFERENCES email_templates(template_id),
    preheader_text VARCHAR(150),

    -- Targeting
    target_criteria JSONB, -- Lead filters, tags, etc.
    target_count INTEGER DEFAULT 0,

    -- Scheduling
    send_type send_type DEFAULT 'immediate',
    scheduled_at TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Campaign status
    status campaign_status DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,

    -- Settings
    tracking_enabled BOOLEAN DEFAULT true,
    reply_to_email VARCHAR(255),
    from_name VARCHAR(100),
    from_email VARCHAR(255),

    -- External service
    external_campaign_id VARCHAR(255), -- For service provider reference
    service_provider VARCHAR(50), -- 'sendgrid', 'resend', 'apollo', etc.

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    INDEX idx_campaigns_status (status),
    INDEX idx_campaigns_created_by (created_by),
    INDEX idx_campaigns_scheduled (scheduled_at)
);

-- Campaign types
CREATE TYPE campaign_type AS ENUM (
    'one_time',
    'sequence',
    'drip_campaign',
    'follow_up',
    'newsletter'
);

-- Send types
CREATE TYPE send_type AS ENUM (
    'immediate',
    'scheduled',
    'triggered'
);

-- Campaign status
CREATE TYPE campaign_status AS ENUM (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'paused',
    'cancelled',
    'completed'
);

-- =============================================
-- EMAIL TEMPLATES
-- =============================================

CREATE TABLE email_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Template details
    template_name VARCHAR(255) NOT NULL,
    template_type template_type NOT NULL,
    description TEXT,

    -- Content
    subject_line VARCHAR(255),
    html_content TEXT,
    text_content TEXT,

    -- Variables/Personalization
    variables JSONB, -- Available merge fields

    -- Categories
    category VARCHAR(100),
    tags TEXT[],

    -- Usage
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_shared BOOLEAN DEFAULT false, -- Share across organization

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_templates_type (template_type),
    INDEX idx_templates_category (category)
);

-- Template types
CREATE TYPE template_type AS ENUM (
    'outreach',
    'follow_up',
    'proposal',
    'thank_you',
    'newsletter',
    'announcement'
);

-- =============================================
-- EMAIL SEQUENCE AUTOMATION
-- =============================================

CREATE TABLE email_sequences (
    sequence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Sequence details
    sequence_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Trigger conditions
    trigger_type sequence_trigger NOT NULL,
    trigger_conditions JSONB,

    -- Settings
    is_active BOOLEAN DEFAULT true,
    max_emails INTEGER DEFAULT 5,
    stop_on_reply BOOLEAN DEFAULT true,

    -- Stats
    enrolled_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,

    -- Audit
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_sequences_trigger (trigger_type),
    INDEX idx_sequences_active (is_active)
);

-- Sequence triggers
CREATE TYPE sequence_trigger AS ENUM (
    'lead_created',
    'lead_tagged',
    'activity_logged',
    'score_threshold',
    'manual_enrollment'
);

CREATE TABLE email_sequence_steps (
    step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES email_sequences(sequence_id),

    -- Step details
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255),
    template_id UUID REFERENCES email_templates(template_id),

    -- Timing
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,

    -- Conditions
    send_conditions JSONB, -- Additional conditions to send

    -- Stats
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_step_per_sequence UNIQUE(sequence_id, step_number),
    INDEX idx_sequence_steps_sequence (sequence_id)
);

-- =============================================
-- EMAIL TRACKING & ANALYTICS
-- =============================================

CREATE TABLE email_sends (
    send_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Campaign/Sequence reference
    campaign_id UUID REFERENCES email_campaigns(campaign_id),
    sequence_id UUID REFERENCES email_sequences(sequence_id),
    sequence_step_id UUID REFERENCES email_sequence_steps(step_id),

    -- Recipient
    lead_id UUID REFERENCES leads(lead_id),
    contact_id UUID REFERENCES contacts(contact_id),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),

    -- Email details
    subject_line VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(100),

    -- External tracking
    external_message_id VARCHAR(255), -- Provider's message ID
    service_provider VARCHAR(50),

    -- Status
    send_status email_send_status DEFAULT 'queued',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    first_opened_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,

    -- Engagement tracking
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,
    bounce_reason VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_email_sends_lead (lead_id),
    INDEX idx_email_sends_campaign (campaign_id),
    INDEX idx_email_sends_status (send_status),
    INDEX idx_email_sends_sent_at (sent_at)
);

-- Email send status
CREATE TYPE email_send_status AS ENUM (
    'queued',
    'sending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'replied',
    'bounced',
    'failed',
    'unsubscribed'
);

-- =============================================
-- UNSUBSCRIBE & COMPLIANCE
-- =============================================

CREATE TABLE email_unsubscribes (
    unsubscribe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),

    -- Contact info
    email VARCHAR(255) NOT NULL,
    lead_id UUID REFERENCES leads(lead_id),
    contact_id UUID REFERENCES contacts(contact_id),

    -- Unsubscribe details
    unsubscribed_from unsubscribe_type NOT NULL,
    campaign_id UUID REFERENCES email_campaigns(campaign_id),

    -- Compliance
    unsubscribe_reason VARCHAR(255),
    ip_address INET,
    user_agent TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_email_unsubscribe UNIQUE(organization_id, email, unsubscribed_from),
    INDEX idx_unsubscribes_email (email),
    INDEX idx_unsubscribes_active (is_active)
);

-- Unsubscribe types
CREATE TYPE unsubscribe_type AS ENUM (
    'all_emails',
    'marketing_emails',
    'sequence_emails',
    'specific_campaign'
);
```

### **Email Service Integration Architecture**

```typescript
// Email service interface
interface EmailServiceProvider {
  name: string;
  apiKey: string;
  baseUrl: string;

  // Core methods
  sendSingleEmail(email: EmailMessage): Promise<EmailSendResult>;
  sendBulkEmails(emails: EmailMessage[]): Promise<EmailSendResult[]>;
  createTemplate(template: EmailTemplate): Promise<string>;
  updateTemplate(templateId: string, template: EmailTemplate): Promise<void>;

  // Tracking
  getDeliveryStatus(messageId: string): Promise<EmailStatus>;
  getOpenStats(messageId: string): Promise<EmailStats>;
  getClickStats(messageId: string): Promise<EmailStats>;

  // List management
  addToSuppressionList(email: string): Promise<void>;
  removeFromSuppressionList(email: string): Promise<void>;
  checkSuppressionList(email: string): Promise<boolean>;
}

// SendGrid implementation
class SendGridProvider implements EmailServiceProvider {
  name = "SendGrid";
  apiKey: string;
  baseUrl = "https://api.sendgrid.com/v3";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendSingleEmail(email: EmailMessage): Promise<EmailSendResult> {
    const response = await fetch(`${this.baseUrl}/mail/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: email.to, name: email.toName }],
            subject: email.subject,
            custom_args: {
              lead_id: email.leadId,
              campaign_id: email.campaignId,
            },
          },
        ],
        from: { email: email.from, name: email.fromName },
        content: [
          { type: "text/html", value: email.htmlContent },
          { type: "text/plain", value: email.textContent },
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
        },
      }),
    });

    return {
      success: response.ok,
      messageId: response.headers.get("X-Message-Id"),
      error: response.ok ? null : await response.text(),
    };
  }

  async sendBulkEmails(emails: EmailMessage[]): Promise<EmailSendResult[]> {
    // Implement bulk sending with rate limiting
    const results: EmailSendResult[] = [];
    const batchSize = 100; // SendGrid allows up to 1000 per request

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await this.sendBatch(batch);
      results.push(...batchResults);

      // Rate limiting - wait 1 second between batches
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  private async sendBatch(emails: EmailMessage[]): Promise<EmailSendResult[]> {
    // Implementation for batch sending
    // ...
  }
}

// Resend implementation
class ResendProvider implements EmailServiceProvider {
  name = "Resend";
  apiKey: string;
  baseUrl = "https://api.resend.com";

  async sendSingleEmail(email: EmailMessage): Promise<EmailSendResult> {
    const response = await fetch(`${this.baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${email.fromName} <${email.from}>`,
        to: [email.to],
        subject: email.subject,
        html: email.htmlContent,
        text: email.textContent,
        tags: [
          { name: "campaign_id", value: email.campaignId },
          { name: "lead_id", value: email.leadId },
        ],
      }),
    });

    const result = await response.json();

    return {
      success: response.ok,
      messageId: result.id,
      error: response.ok ? null : result.message,
    };
  }

  // ... other methods
}
```

### **Mass Email Campaign API Endpoints**

```typescript
// Campaign management
POST   /api/email/campaigns                    // Create campaign
GET    /api/email/campaigns                    // List campaigns
GET    /api/email/campaigns/:id                // Get campaign details
PUT    /api/email/campaigns/:id                // Update campaign
DELETE /api/email/campaigns/:id                // Delete campaign
POST   /api/email/campaigns/:id/send           // Send campaign
POST   /api/email/campaigns/:id/pause          // Pause campaign
POST   /api/email/campaigns/:id/resume         // Resume campaign

// Template management
POST   /api/email/templates                    // Create template
GET    /api/email/templates                    // List templates
GET    /api/email/templates/:id                // Get template
PUT    /api/email/templates/:id                // Update template
DELETE /api/email/templates/:id                // Delete template
POST   /api/email/templates/:id/duplicate      // Duplicate template

// Sequence management
POST   /api/email/sequences                    // Create sequence
GET    /api/email/sequences                    // List sequences
GET    /api/email/sequences/:id                // Get sequence
PUT    /api/email/sequences/:id                // Update sequence
POST   /api/email/sequences/:id/enroll         // Enroll leads
POST   /api/email/sequences/:id/pause          // Pause sequence

// Analytics and tracking
GET    /api/email/campaigns/:id/stats          // Campaign statistics
GET    /api/email/sequences/:id/stats          // Sequence statistics
GET    /api/email/sends/:id/track              // Track individual email
POST   /api/email/webhooks/delivery            // Delivery webhooks
POST   /api/email/webhooks/engagement          // Engagement webhooks

// Compliance
GET    /api/email/unsubscribes                 // List unsubscribes
POST   /api/email/unsubscribe                  // Manual unsubscribe
GET    /api/email/suppression-list             // Get suppression list
POST   /api/email/suppression-list             // Add to suppression
```

### **Email Campaign Features for CRM**

```typescript
interface EmailCampaignFeatures {
  // Mass email capabilities
  bulkSending: {
    maxRecipientsPerCampaign: number; // e.g., 10,000
    rateLimiting: boolean;
    batchProcessing: boolean;
    queueManagement: boolean;
  };

  // Personalization
  mergeFields: string[]; // [firstName], [companyName], [leadScore], etc.
  conditionalContent: boolean; // Show different content based on lead data
  dynamicSubjectLines: boolean;

  // Tracking & Analytics
  tracking: {
    opens: boolean;
    clicks: boolean;
    replies: boolean;
    bounces: boolean;
    unsubscribes: boolean;
    conversions: boolean; // Link to opportunities created
  };

  // Automation
  triggerCampaigns: {
    leadScoreThreshold: boolean;
    tagAdded: boolean;
    stageChanged: boolean;
    timeDelay: boolean;
  };

  // Compliance
  compliance: {
    unsubscribeLink: boolean;
    gdprCompliant: boolean;
    canSpamCompliant: boolean;
    suppressionList: boolean;
  };
}
```

### **Implementation Recommendation**

```typescript
const recommendedImplementation = {
  // Phase 1: Basic email integration
  phase1: [
    "Choose email provider (Resend for modern API)",
    "Implement basic campaign creation",
    "Template system with merge fields",
    "Simple bulk sending with rate limiting",
    "Basic tracking (opens, clicks)",
  ],

  // Phase 2: Automation
  phase2: [
    "Email sequences/drip campaigns",
    "Trigger-based campaigns",
    "Advanced personalization",
    "A/B testing for subject lines",
    "Enhanced analytics dashboard",
  ],

  // Phase 3: Advanced features
  phase3: [
    "AI-powered send time optimization",
    "Spam score checking",
    "Advanced segmentation",
    "Integration with Apollo.io",
    "Multi-channel campaigns (email + LinkedIn)",
  ],
};
```

### **Email Service Provider Comparison**

| Feature               | SendGrid   | Resend      | Brevo      | Apollo.io  |
| --------------------- | ---------- | ----------- | ---------- | ---------- |
| **Free Tier**         | 100/day    | 3,000/month | 300/day    | None       |
| **Deliverability**    | Excellent  | Very Good   | Good       | Excellent  |
| **API Quality**       | Good       | Excellent   | Good       | Good       |
| **Template Builder**  | Yes        | Code-based  | Yes        | Yes        |
| **Analytics**         | Advanced   | Basic       | Advanced   | Advanced   |
| **CRM Integration**   | Manual     | Manual      | Built-in   | Built-in   |
| **Lead Data**         | No         | No          | Basic      | Extensive  |
| **Cost (10k emails)** | ~$15/month | ~$20/month  | ~$25/month | ~$79/month |

### **Recommended Choice for Your CRM:**

**For Phase 1: Resend**

- Modern, developer-friendly API
- Good free tier for testing
- React email templates
- Easy integration

**For Scale: SendGrid**

- Better for high-volume sending
- Advanced analytics
- Proven deliverability
- Enterprise features

**For Existing Apollo Users: Integrate Apollo API**

- Already paying for it
- Includes lead data
- Sales-focused features
- No additional cost

---

This enhanced Phase 7 specification provides a comprehensive foundation for implementing your specific CRM requirements with proper database schemas, detailed module specifications, and a clear implementation roadmap.

Would you like me to proceed with implementing any specific module first, or would you prefer to review and modify any part of this specification?
