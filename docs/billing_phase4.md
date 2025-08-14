# Phase 4: Complete Billing System

## SaaS Multi-Tenant CRM - Payment Processing & Subscription Management

---

## 🎯 **Phase 4 Scope**

**What we're documenting:**

- Payment processing integration (Stripe)
- Subscription lifecycle management
- Plan upgrades and downgrades
- Billing cycles and invoicing
- Payment failure handling
- Refunds and credits system
- Billing analytics and reporting
- Tax calculation and compliance
- Dunning management (failed payments)

**Building on Phase 1, 2 & 3:**

- ✅ Trial subscription setup from Phase 1
- ✅ User limits and feature access from Phase 2
- ✅ Platform billing oversight from Phase 3

**What we're NOT covering yet:**

- Email system infrastructure (Phase 5)
- Audit logging and security (Phase 6)
- CRM core features (Phase 7+)

---

## 💳 **Payment Processing Architecture**

### **Stripe Integration Strategy**

```
Payment Flow:
1. Customer chooses plan
2. Frontend collects payment method
3. Backend creates Stripe customer
4. Backend creates Stripe subscription
5. Webhook confirms payment
6. System activates subscription
7. User gets immediate access
```

### **Stripe Objects Mapping**

```
Stripe Customer → CRM Tenant (Company)
Stripe Subscription → CRM Subscription Record
Stripe Invoice → CRM Invoice Record
Stripe Payment Method → CRM Payment Method
Stripe Product → CRM Subscription Plan
Stripe Price → CRM Plan Pricing
```

---

## 📋 **Subscription Plans Management**

### **Platform Owner Plan Control**

**🎛️ YOU (Platform Owner) have FULL CRUD control over all subscription plans:**

```
✅ CREATE new plans anytime
✅ READ all plan details and analytics
✅ UPDATE pricing, features, limits
✅ DELETE/disable unused plans
✅ Reorder plan display
✅ Set plan availability
✅ A/B test different pricing
```

### **Default Plan Hierarchy & Features**

```
🆓 TRIAL PLAN (14 days)
├── Users: 5 maximum
├── Contacts: 1,000 limit
├── Leads: 500 limit
├── Storage: 1GB
├── Features: Basic CRM only
└── Support: Email only

💰 BASIC PLAN ($29/month)
├── Users: 10 maximum
├── Contacts: 10,000 limit
├── Leads: 5,000 limit
├── Storage: 10GB
├── Features: Basic + Reports
└── Support: Email + Chat

🚀 PRO PLAN ($79/month)
├── Users: 25 maximum
├── Contacts: 50,000 limit
├── Leads: 25,000 limit
├── Storage: 50GB
├── Features: Pro + Automation + API
└── Support: Priority + Phone

🏢 ENTERPRISE PLAN ($199/month)
├── Users: Unlimited
├── Contacts: Unlimited
├── Leads: Unlimited
├── Storage: 500GB
├── Features: Everything + Custom
└── Support: Dedicated Success Manager
```

### **Plan Management Interface (Platform Owner)**

```
📋 Plan Management Dashboard:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Plan Name           Price     Active   Users    Revenue   Status    Actions   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Trial (14 days)     $0        ✅       234      $0        Active    [Edit]    │
│ Basic Plan          $29/mo    ✅       456      $13,224   Active    [Edit]    │
│ Professional        $79/mo    ✅       423      $33,417   Active    [Edit]    │
│ Enterprise          $199/mo   ✅       134      $26,666   Active    [Edit]    │
│ Legacy Starter      $19/mo    ❌       0        $0        Disabled  [Archive] │
└─────────────────────────────────────────────────────────────────────────────┘

Platform Owner CRUD Operations:
✅ [+ Create New Plan]    ✅ [Bulk Update Pricing]    ✅ [A/B Test Plans]
✅ [Import from Stripe]   ✅ [Export Plan Data]       ✅ [Plan Analytics]
```

### **Plan Creation/Edit Form (Platform Owner)**

```
Plan Creation Form:
┌─────────────────────────────────────────────────────────────────┐
│ Plan Name: [Professional Plan          ]                       │
│ Display Name: [Pro                     ]                       │
│ Description: [Perfect for growing teams]                       │
│                                                                 │
│ Pricing:                                                        │
│ Monthly: $[79.00] USD    Annual: $[790.00] USD (17% off)      │
│                                                                 │
│ Limits:                                                         │
│ Max Users: [25     ]    Storage: [50 GB]                      │
│ Contacts: [50,000 ]     Leads: [25,000]                       │
│                                                                 │
│ Features: [☑] Basic CRM [☑] Reports [☑] Automation            │
│          [☑] API Access [☐] White Label [☐] Custom Fields     │
│                                                                 │
│ Status: [🟢 Active] [📊 Visible] [🎯 Featured]                │
│                                                                 │
│ [Save Plan] [Save & Create Stripe Product] [Cancel]            │
└─────────────────────────────────────────────────────────────────┘
```

### **Platform Owner Plan Control Actions**

```
For Each Plan, You Can:
🎯 CREATE: Add new subscription plans anytime
📖 READ: View plan details, analytics, customer distribution
✏️ UPDATE: Modify pricing, features, limits, descriptions
🗑️ DELETE: Disable/archive plans (existing customers unaffected)

Advanced Operations:
🔄 Clone existing plans with modifications
💰 Bulk pricing updates across multiple plans
📊 A/B test different pricing strategies
🎨 Customize plan appearance and ordering
⚡ Enable/disable plans for new signups
📈 View plan performance analytics
🔗 Sync with Stripe products automatically

⚠️ Safety Rules:
- Deleting plans only hides them from new signups
- Existing customers keep their current plan until they change
- Plan modifications take effect immediately for new signups
- Existing customers get updates at their next billing cycle
```

---

## 🏢 **Custom Enterprise Plans (Platform Owner)**

### **When Companies Request Custom Features**

```
Scenario: ACME Corp Enterprise Customer Request
💬 "We need a custom CRM integration with our ERP system +
    white-label branding + dedicated database instance"

Platform Owner Response:
1. Create tenant-specific custom plan
2. Set custom pricing ($500/month)
3. Enable requested features for that tenant only
4. Create custom Stripe product/price
5. Assign plan to specific company
```

### **Custom Plan Creation Workflow**

```
Step 1: Customer Request Analysis
├── Customer: ACME Corp (tenant_id: abc-123)
├── Request: Custom ERP integration + White labeling
├── Budget: $500/month
└── Timeline: 30 days implementation

Step 2: Platform Owner Creates Custom Plan
┌─────────────────────────────────────────────────────────────────┐
│ Custom Plan for: ACME Corp                                     │
│ Plan Name: [ACME Custom Enterprise    ]                        │
│ Description: [Custom ERP integration + White label]            │
│                                                                 │
│ Pricing: $[500.00]/month (Custom negotiated rate)             │
│                                                                 │
│ Base Features: [☑] All Enterprise features                     │
│ Custom Features: [☑] ERP Integration  [☑] White Labeling      │
│                 [☑] Dedicated DB      [☐] Custom API          │
│                                                                 │
│ Tenant Assignment: [ACME Corp Only] (Not visible to others)    │
│ Effective Date: [2024-02-01]                                   │
│                                                                 │
│ [Create Custom Plan] [Generate Quote] [Cancel]                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Custom Plan Features**

```
🎯 Tenant-Specific Plans:
✅ Only visible to assigned company
✅ Custom pricing (higher or lower than standard)
✅ Custom feature combinations
✅ Custom limits (users, storage, API calls)
✅ Custom billing cycles (quarterly, annual only)
✅ Custom contract terms

🔧 Custom Features:
✅ Enable beta features early
✅ Create tenant-specific integrations
✅ White-label customizations
✅ Dedicated infrastructure
✅ Custom API endpoints
✅ Special compliance requirements

💰 Custom Pricing Options:
✅ Fixed monthly rate
✅ Usage-based pricing
✅ Volume discounts
✅ Multi-year contracts
✅ One-time setup fees
✅ Custom payment terms
```

### **Platform Owner Custom Plan Management**

```
Custom Plans Dashboard:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Company Name     Custom Plan          Price      Features        Status      │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACME Corp        ERP + White Label    $500/mo    Enterprise+     Active      │
│ BigTech Inc      Dedicated Instance   $1200/mo   Custom DB       Active      │
│ StartupXYZ       Volume Discount      $59/mo     Pro (50% off)   Active      │
│ MegaCorp         Annual Contract      $8000/yr   Enterprise      Active      │
└─────────────────────────────────────────────────────────────────────────────┘

Actions Available:
✅ [+ Create Custom Plan]  ✅ [Clone to Standard]  ✅ [Generate Quote]
✅ [Modify Features]       ✅ [Update Pricing]     ✅ [Contract Terms]
```

### **Custom Plan Assignment Process**

```
Assignment Workflow:
1. Platform Owner creates custom plan
2. Sets tenant-specific visibility
3. Notifies customer of new plan availability
4. Customer sees custom plan in their billing settings
5. Customer accepts and upgrades
6. Billing automatically switches to custom plan
7. Custom features immediately activated

Customer View (ACME Corp only sees):
┌─────────────────────────────────────────────────────────┐
│ Available Plans for ACME Corp:                         │
│                                                         │
│ 🏢 Current: Enterprise ($199/mo)                       │
│                                                         │
│ 🎯 CUSTOM: ACME Custom Enterprise ($500/mo)            │
│    ✅ All Enterprise features                           │
│    🚀 Custom ERP Integration                            │
│    🎨 White Label Branding                              │
│    🔧 Dedicated Database Instance                       │
│    📞 Dedicated Success Manager                         │
│                                                         │
│    [Upgrade to Custom Plan]                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 **Custom Plan to Standard Plan Transitions**

### **When Custom Plan Customers Want Standard Plans**

```
Scenario: ACME Corp on Custom Plan ($500/mo) wants to downgrade

Options Available:
├── 📈 Upgrade to higher standard plan (if any)
├── 📉 Downgrade to lower standard plan
├── 🔄 Switch to equivalent standard plan
└── ❌ Cancel custom plan entirely

Customer Reasons:
- "Custom features no longer needed"
- "Want to reduce costs to standard pricing"
- "Prefer self-service over custom support"
- "Company downsizing/budget cuts"
```

### **Transition Workflow (Customer Side)**

```
Customer on Custom Plan sees:
┌─────────────────────────────────────────────────────────────────────┐
│ 🎯 Current: ACME Custom Enterprise ($500/mo)                       │
│    Custom ERP Integration + White Labeling + Dedicated DB          │
│                                                                     │
│ Available Standard Plans:                                           │
│                                                                     │
│ 🏢 Enterprise ($199/mo) - DOWNGRADE                                │
│    ✅ All standard Enterprise features                              │
│    ❌ Lose: ERP Integration, White Labeling, Dedicated DB          │
│    💰 Save: $301/month                                              │
│    [Downgrade to Enterprise] ⚠️                                    │
│                                                                     │
│ 🚀 Pro ($79/mo) - MAJOR DOWNGRADE                                  │
│    ⚠️  Limited users (25 max), features, storage                   │
│    ❌ Lose: All custom features + Enterprise features              │
│    💰 Save: $421/month                                              │
│    [Downgrade to Pro] ⚠️                                           │
│                                                                     │
│ 💰 Basic ($29/mo) - SIGNIFICANT DOWNGRADE                          │
│    ⚠️  Very limited functionality                                   │
│    [Downgrade to Basic] ⚠️                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### **Platform Owner Transition Management**

```
Transition Approval Dashboard:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Company          Current Plan           Requested Change      Action Required │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACME Corp        Custom ($500/mo)      → Enterprise ($199)   [Review]        │
│ BigTech Inc      Dedicated ($1200/mo)  → Enterprise ($199)   [Approve]       │
│ StartupXYZ       Custom Pro ($59/mo)   → Basic ($29/mo)      [Auto-approve]  │
└─────────────────────────────────────────────────────────────────────────────┘

Platform Owner Options:
✅ Auto-approve downgrades
✅ Require manual approval
✅ Offer retention discount
✅ Schedule transition date
✅ Data migration assistance
```

### **Transition Process Steps**

```
Step 1: Customer Request Analysis
├── Current: ACME Custom Enterprise ($500/mo)
├── Requested: Standard Enterprise ($199/mo)
├── Impact: Lose custom ERP + White labeling + Dedicated DB
└── Savings: $301/month ($3,612/year)

Step 2: Platform Owner Review
├── Customer value: High ($6,000/year revenue)
├── Custom features usage: Active (ERP used daily)
├── Retention offer: 20% discount ($400/mo custom plan)
└── Decision: Offer retention or approve downgrade

Step 3: Customer Notification
"We've received your downgrade request. Custom features will be
removed. As a valued customer, we can offer your current custom
plan at $400/mo (20% off). Would you like to keep your custom
features at this reduced rate?"

Step 4A: Customer Accepts Retention Offer
├── Update custom plan pricing to $400/mo
├── Keep all custom features
├── Apply discount starting next billing cycle

Step 4B: Customer Proceeds with Downgrade
├── Schedule downgrade for next billing cycle
├── Notify about feature removal timeline
├── Offer data export for custom features
├── Process transition on effective date
```

### **Feature Removal Process**

```
Custom Features Removal Timeline:

Immediate (Upon Downgrade):
❌ Remove custom feature access flags
❌ Disable custom API endpoints
❌ Hide white-label customizations
❌ Remove dedicated infrastructure access

30-Day Grace Period:
📦 Export custom ERP integration data
📦 Backup white-label assets
📦 Migrate from dedicated to shared DB
📦 Archive custom configurations

After 30 Days:
🗑️ Permanently delete custom feature data
🗑️ Remove custom infrastructure
🗑️ Close dedicated support channel
```

### **Pricing Transition Logic**

```
Transition Billing Rules:

Downgrade (Custom → Standard):
✅ Credit unused portion of custom plan
✅ Start standard plan billing immediately
✅ Prorated refund for price difference
✅ Next billing cycle uses standard pricing

Examples:
Custom Plan: $500/mo, 15 days used = $250 used, $250 credit
Standard Plan: $199/mo, 15 days remaining = $99.50 charge
Net Credit: $150.50 applied to account

Mid-cycle calculation:
- Custom plan prorated credit: $250
- Standard plan prorated charge: $99.50
- Account credit: $150.50
- Next month: Standard $199/mo billing
```

### **Customer Communication Templates**

```
Downgrade Confirmation Email:
─────────────────────────────────────
Subject: Your Plan Change Confirmation

Hi [Customer],

Your plan change has been processed:
✅ Changed from: ACME Custom Enterprise ($500/mo)
✅ Changed to: Enterprise ($199/mo)
✅ Effective: Next billing cycle (Feb 1, 2024)
✅ Account credit: $150.50

Important Changes:
❌ Custom ERP Integration - Disabled Feb 1
❌ White Label Branding - Disabled Feb 1
❌ Dedicated Database - Data migrated Feb 1

Data Export Available:
📦 Your custom data will be available for export until Mar 1
📦 Download here: [Export Link]

Questions? Contact support or your account manager.
─────────────────────────────────────
```

### **Annual Discount Structure**

```
Monthly vs Annual Pricing:
- Basic: $29/mo → $290/year (17% off)
- Pro: $79/mo → $790/year (17% off)
- Enterprise: $199/mo → $1990/year (17% off)

Benefits of Annual:
- 2 months free
- Priority support
- Advanced analytics
- Early feature access
```

---

## 🔄 **Subscription Lifecycle Management**

### **1. Trial to Paid Conversion**

```
Trial Conversion Flow:

Day 12 (2 days before expiry):
1. Send conversion reminder email
2. Show in-app upgrade prompts
3. Limit some features to encourage upgrade

Day 14 (Trial expires):
1. If upgraded → Continue seamlessly
2. If not upgraded → Suspend access
3. Keep data for 30 days
4. Send "We miss you" email sequence

Day 44 (30 days after trial):
1. Final warning email
2. Schedule data deletion in 7 days

Day 51:
1. Permanently delete tenant data
2. Send confirmation email
```

### **2. Plan Upgrades**

```
Upgrade Process:
1. User selects higher plan
2. Calculate prorated amount
3. Charge difference immediately
4. Update Stripe subscription
5. Apply new limits instantly
6. Send upgrade confirmation
7. Log upgrade event

Immediate Benefits:
✅ Higher user limits
✅ More storage
✅ New features unlocked
✅ Better support tier
```

### **3. Plan Downgrades**

```
Downgrade Process:
1. User selects lower plan
2. Check if current usage fits new limits
3. If over limits → Show usage reduction options
4. Schedule downgrade for next billing cycle
5. Apply credit for unused period
6. Send downgrade confirmation

Usage Validation:
❌ Can't downgrade if:
   - More users than new plan allows
   - More data than new storage limit
   - Using features not in new plan

✅ Downgrade options:
   - Remove excess users first
   - Archive old data
   - Export and delete contacts/leads
```

### **4. Plan Cancellation**

```
Cancellation Flow:
1. User clicks "Cancel Subscription"
2. Show retention offers (discount, pause)
3. If proceeding → Survey for feedback
4. Cancel at end of billing period
5. Keep account active until period ends
6. Archive data after cancellation
7. Send farewell email with data export

Grace Period:
- 30 days of read-only access
- Data export available
- Easy reactivation option
- After 30 days → Delete all data
```

---

## 💰 **Billing Cycles & Invoicing**

### **Monthly Billing Process**

```
Billing Timeline:

Day 1: Subscription starts
Day 28: Pre-billing notification
Day 30: Invoice generated
Day 30: Payment attempted
Day 33: First retry (if failed)
Day 36: Second retry (if failed)
Day 39: Final retry (if failed)
Day 42: Suspend account
Day 72: Cancel subscription
```

### **Invoice Generation**

```
Invoice Components:
1. Base subscription fee
2. User overage charges (if applicable)
3. Storage overage charges
4. Add-on features
5. Taxes (based on location)
6. Credits and discounts
7. Prorated charges/refunds

Invoice Details:
- Company billing information
- Payment method on file
- Itemized charges
- Tax breakdown
- Payment due date
- Payment instructions
```

### **Usage-Based Billing**

```
Overage Charges:
- Extra Users: $5/user/month over plan limit
- Extra Storage: $0.50/GB/month over plan limit
- API Calls: $0.001 per call over monthly limit
- Email Sends: $0.10 per 100 emails over limit

Tracking:
- Real-time usage monitoring
- Monthly usage reports
- Overage warnings at 80% and 100%
- Usage analytics in dashboard
```

---

## ⚠️ **Payment Failure Handling**

### **Dunning Management**

```
Failed Payment Sequence:

Payment Fails:
├── Day 0: Immediate retry (card issuer issue)
├── Day 3: Second attempt + email notification
├── Day 7: Third attempt + urgent email
├── Day 10: Final attempt + phone call (Enterprise)
├── Day 14: Suspend account access
└── Day 30: Cancel subscription

Recovery Actions:
1. Update payment method prompts
2. Alternative payment options
3. Account manager outreach (Enterprise)
4. Temporary payment plans
5. Grace period extensions
```

### **Payment Recovery Tools**

```
Customer Self-Service:
- Update payment method anytime
- Retry failed payments instantly
- View payment history
- Download invoices
- Set backup payment methods

Platform Owner Tools:
- Manual payment retry
- Payment plan setup
- Account notes and flags
- Payment method verification
- Dunning process overrides
```

---

## 💸 **Refunds & Credits System**

### **Refund Policy**

```
Automatic Refunds:
- Downgrades: Credit unused portion
- Cancellations: Prorated refund within 7 days
- Failed upgrades: Full refund

Manual Refunds (Platform Decision):
- Service outages > 4 hours
- Billing errors
- Customer satisfaction issues
- Technical problems preventing usage

Refund Timeline:
- Process within 48 hours
- Reflect in account 3-5 business days
- Email confirmation sent
- Account credit option available
```

### **Credit System**

```
Account Credits:
- Downgrade credits applied automatically
- Referral bonuses
- Service level agreement compensations
- Customer satisfaction credits
- Marketing promotion credits

Credit Usage:
1. Credits applied to next invoice automatically
2. Can accumulate across billing cycles
3. Expire after 12 months if unused
4. Transferable to account extensions
5. Refundable if account cancelled
```

---

## 📊 **Database Schema (Billing)**

### **Core Billing Tables**

```sql
-- Subscription Plans
subscription_plans:
- id (UUID, PK)
- name (VARCHAR(100)) -- "Basic", "Pro", "Enterprise", "ACME Custom"
- display_name (VARCHAR(100)) -- "Professional Plan"
- description (TEXT)
- stripe_product_id (VARCHAR(100), unique)
- features (JSON) -- Array of included features
- limits (JSON) -- user_limit, storage_limit, etc.
- is_active (BOOLEAN, default: true)
- is_custom (BOOLEAN, default: false) -- True for tenant-specific plans
- assigned_tenant_id (UUID, FK to tenants.id, NULL) -- For custom plans only
- custom_pricing (JSON) -- Custom pricing rules for this tenant
- contract_terms (TEXT) -- Custom contract terms
- sort_order (INTEGER)
- created_by (UUID, FK to platform_users.id) -- Platform owner who created
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Plan Pricing
plan_pricing:
- id (UUID, PK)
- plan_id (UUID, FK to subscription_plans.id)
- billing_interval (ENUM: monthly, yearly)
- amount (DECIMAL(10,2)) -- Price in cents
- currency (VARCHAR(3), default: 'USD')
- stripe_price_id (VARCHAR(100), unique)
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)

-- Tenant Subscriptions (Enhanced)
tenant_subscriptions:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id, unique)
- plan_id (UUID, FK to subscription_plans.id)
- billing_interval (ENUM: monthly, yearly)
- status (ENUM: trial, active, past_due, cancelled, suspended)
- stripe_customer_id (VARCHAR(100), unique)
- stripe_subscription_id (VARCHAR(100), unique)
- current_period_start (TIMESTAMP)
- current_period_end (TIMESTAMP)
- trial_start (TIMESTAMP, NULL)
- trial_end (TIMESTAMP, NULL)
- cancelled_at (TIMESTAMP, NULL)
- ends_at (TIMESTAMP, NULL) -- For cancelled subscriptions
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Payment Methods
payment_methods:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- stripe_payment_method_id (VARCHAR(100), unique)
- type (ENUM: card, bank_transfer, paypal)
- card_brand (VARCHAR(20)) -- visa, mastercard, amex
- card_last4 (VARCHAR(4))
- card_exp_month (INTEGER)
- card_exp_year (INTEGER)
- is_default (BOOLEAN, default: false)
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Invoices
invoices:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- subscription_id (UUID, FK to tenant_subscriptions.id)
- stripe_invoice_id (VARCHAR(100), unique)
- invoice_number (VARCHAR(50), unique)
- status (ENUM: draft, open, paid, void, uncollectible)
- amount_due (DECIMAL(10,2))
- amount_paid (DECIMAL(10,2))
- amount_remaining (DECIMAL(10,2))
- subtotal (DECIMAL(10,2))
- tax (DECIMAL(10,2))
- total (DECIMAL(10,2))
- currency (VARCHAR(3), default: 'USD')
- billing_period_start (TIMESTAMP)
- billing_period_end (TIMESTAMP)
- due_date (TIMESTAMP)
- paid_at (TIMESTAMP, NULL)
- invoice_pdf_url (VARCHAR(500))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Invoice Line Items
invoice_line_items:
- id (UUID, PK)
- invoice_id (UUID, FK to invoices.id)
- description (VARCHAR(255))
- amount (DECIMAL(10,2))
- quantity (INTEGER, default: 1)
- unit_amount (DECIMAL(10,2))
- type (ENUM: subscription, overage, credit, tax, discount)
- metadata (JSON) -- Additional details
- created_at (TIMESTAMP)

-- Payment Transactions
payment_transactions:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- invoice_id (UUID, FK to invoices.id, NULL)
- stripe_payment_intent_id (VARCHAR(100), unique)
- amount (DECIMAL(10,2))
- currency (VARCHAR(3), default: 'USD')
- status (ENUM: pending, succeeded, failed, cancelled)
- payment_method_id (UUID, FK to payment_methods.id)
- failure_reason (VARCHAR(255), NULL)
- processed_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Account Credits
account_credits:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- amount (DECIMAL(10,2))
- currency (VARCHAR(3), default: 'USD')
- reason (ENUM: refund, downgrade, referral, compensation, promotion)
- description (TEXT)
- status (ENUM: pending, available, applied, expired)
- applied_to_invoice_id (UUID, FK to invoices.id, NULL)
- expires_at (TIMESTAMP, NULL)
- created_by (UUID, FK to platform_users.id, NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Usage Tracking
usage_records:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- metric_name (VARCHAR(100)) -- "users", "storage", "api_calls"
- metric_value (INTEGER)
- billing_period (DATE) -- YYYY-MM format
- recorded_at (TIMESTAMP)
- created_at (TIMESTAMP)

-- Billing Events Log
billing_events:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- event_type (VARCHAR(100)) -- "subscription_created", "payment_failed"
- stripe_event_id (VARCHAR(100), unique)
- data (JSON) -- Stripe webhook data
- processed (BOOLEAN, default: false)
- processed_at (TIMESTAMP, NULL)
- error_message (TEXT, NULL)
- created_at (TIMESTAMP)

-- Tenant Custom Features (For Custom Plans)
tenant_custom_features:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- feature_name (VARCHAR(100)) -- "erp_integration", "white_labeling"
- feature_config (JSON) -- Configuration specific to this tenant
- is_enabled (BOOLEAN, default: true)
- enabled_by (UUID, FK to platform_users.id) -- Platform owner who enabled
- expires_at (TIMESTAMP, NULL) -- Optional expiration
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Custom Plan Quotes (Before activation)
custom_plan_quotes:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- plan_id (UUID, FK to subscription_plans.id)
- quoted_price (DECIMAL(10,2))
- quote_valid_until (TIMESTAMP)
- features_included (JSON)
- contract_terms (TEXT)
- status (ENUM: draft, sent, accepted, rejected, expired)
- created_by (UUID, FK to platform_users.id)
- accepted_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Plan Transition Requests (Custom ↔ Standard)
plan_transition_requests:
- id (UUID, PK)
- tenant_id (UUID, FK to tenants.id)
- from_plan_id (UUID, FK to subscription_plans.id)
- to_plan_id (UUID, FK to subscription_plans.id)
- transition_type (ENUM: custom_to_standard, standard_to_custom, custom_to_custom)
- requested_by (UUID, FK to users.id) -- Tenant user who requested
- reviewed_by (UUID, FK to platform_users.id, NULL) -- Platform owner review
- status (ENUM: pending, approved, rejected, completed, cancelled)
- reason (TEXT) -- Customer reason for transition
- retention_offer_made (BOOLEAN, default: false)
- retention_offer_price (DECIMAL(10,2), NULL)
- retention_offer_accepted (BOOLEAN, NULL)
- effective_date (TIMESTAMP) -- When transition takes effect
- features_to_remove (JSON) -- Custom features being lost
- data_export_deadline (TIMESTAMP) -- When custom data will be deleted
- approved_at (TIMESTAMP, NULL)
- completed_at (TIMESTAMP, NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🔌 **Stripe Webhook Events**

### **Critical Webhooks to Handle**

```
Subscription Events:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.trial_will_end

Payment Events:
- invoice.payment_succeeded
- invoice.payment_failed
- invoice.finalized
- payment_intent.succeeded
- payment_intent.payment_failed

Customer Events:
- customer.updated
- customer.deleted
- payment_method.attached
- payment_method.detached
```

### **Webhook Processing Logic**

```
Webhook Handler Flow:
1. Verify webhook signature
2. Parse event type and data
3. Check if event already processed
4. Update local database records
5. Trigger internal business logic
6. Send notifications if needed
7. Return 200 success response

Example: Payment Failed
1. Receive invoice.payment_failed webhook
2. Update subscription status to "past_due"
3. Log payment failure
4. Trigger dunning email sequence
5. Restrict account access if needed
6. Notify platform team for high-value accounts
```

---

## 📈 **Billing Analytics & Reporting**

### **Revenue Metrics**

```
Key Metrics Dashboard:
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer Lifetime Value (CLV)
- Average Revenue Per User (ARPU)
- Churn Rate (monthly/annual)
- Trial to Paid Conversion Rate
- Plan Distribution
- Revenue Growth Rate

Revenue Cohort Analysis:
- Customer acquisition by month
- Revenue retention by cohort
- Expansion revenue tracking
- Churn analysis by plan type
```

### **Billing Health Monitoring**

```
Operational Metrics:
- Payment Success Rate: 94.5%
- Failed Payment Recovery: 67%
- Invoice Collection Time: 3.2 days avg
- Dunning Success Rate: 45%
- Refund Rate: 2.1%
- Support Tickets (Billing): 23/month

Alerts & Notifications:
- Payment success rate < 90%
- High-value payment failures
- Unusual refund requests
- Subscription cancellations
- Trial conversion drops
```

---

## ✅ **Phase 4 Requirements Checklist**

### **Backend Requirements**

#### Stripe Integration

- [ ] Stripe API configuration and keys
- [ ] Customer creation and management
- [ ] Subscription creation and updates
- [ ] Payment method management
- [ ] Invoice generation and retrieval
- [ ] Webhook endpoint security
- [ ] Event processing and error handling

#### Subscription Management

- [ ] Plan upgrade/downgrade logic
- [ ] Prorated billing calculations
- [ ] Trial conversion automation
- [ ] Cancellation and suspension flows
- [ ] Usage tracking and overage billing
- [ ] Credit and refund processing

#### Platform Owner Plan Management (CRUD)

- [ ] Create new subscription plans API
- [ ] Read/list all plans with analytics
- [ ] Update plan pricing, features, limits
- [ ] Delete/disable plans (with safety checks)
- [ ] Bulk plan operations
- [ ] Plan performance analytics
- [ ] Stripe product synchronization

#### Custom Enterprise Plans

- [ ] Create tenant-specific custom plans
- [ ] Custom pricing and feature combinations
- [ ] Custom plan quote generation
- [ ] Tenant-specific feature enablement
- [ ] Custom plan assignment workflow
- [ ] Custom contract terms management
- [ ] Custom plan analytics and tracking

#### Plan Transition Management

- [ ] Custom plan to standard plan downgrades
- [ ] Standard plan to custom plan upgrades
- [ ] Transition request approval workflow
- [ ] Retention offer system
- [ ] Feature removal and data migration
- [ ] Prorated billing calculations for transitions
- [ ] Automated transition processing

#### Payment Processing

- [ ] Secure payment collection
- [ ] Failed payment retry logic
- [ ] Dunning management system
- [ ] Payment method validation
- [ ] PCI compliance measures
- [ ] Fraud detection integration

### **Frontend Requirements**

#### Customer Billing Interface

- [ ] Plan selection and upgrade UI
- [ ] Payment method management
- [ ] Billing history and invoices
- [ ] Usage dashboard and analytics
- [ ] Cancellation and downgrade flows
- [ ] Credit and refund visibility

#### Platform Billing Dashboard

- [ ] Revenue analytics and charts
- [ ] Subscription management tools
- [ ] Failed payment monitoring
- [ ] Refund and credit processing
- [ ] Billing event logs
- [ ] Customer payment profiles

#### Platform Plan Management Interface

- [ ] Plan CRUD interface (Create, Read, Update, Delete)
- [ ] Plan analytics and performance charts
- [ ] Bulk plan operations UI
- [ ] A/B testing plan comparison
- [ ] Stripe integration status monitoring
- [ ] Plan customer distribution analytics

#### Custom Plan Management Interface

- [ ] Custom plan creation wizard
- [ ] Tenant-specific plan assignment
- [ ] Custom feature enablement interface
- [ ] Custom pricing calculator
- [ ] Quote generation and approval
- [ ] Custom contract terms editor
- [ ] Custom plan analytics dashboard

#### Plan Transition Interface

- [ ] Customer plan transition request form
- [ ] Platform owner transition approval dashboard
- [ ] Retention offer management interface
- [ ] Feature impact and data migration warnings
- [ ] Transition timeline and progress tracking
- [ ] Automated transition notification system
- [ ] Data export and backup interfaces

### **Database & Schema**

- [ ] Subscription plans and pricing tables
- [ ] Enhanced tenant subscription tracking
- [ ] Payment methods and transactions
- [ ] Invoice and line item tables
- [ ] Usage tracking and billing events
- [ ] Account credits and adjustments
- [ ] Billing analytics cache tables
- [ ] Tenant custom features table
- [ ] Custom plan quotes table
- [ ] Custom plan assignment tracking
- [ ] Plan transition requests table
- [ ] Feature removal timeline tracking
- [ ] Retention offer management

### **Security & Compliance**

- [ ] PCI DSS compliance measures
- [ ] Stripe webhook signature validation
- [ ] Payment data encryption
- [ ] Billing data access controls
- [ ] Audit trails for financial transactions
- [ ] GDPR billing data handling

### **Testing & Quality**

- [ ] Stripe test mode integration
- [ ] Payment failure simulation
- [ ] Webhook event testing
- [ ] Billing calculation accuracy
- [ ] Edge case handling
- [ ] Performance optimization

---

## 🚨 **Critical Business Rules**

### **Subscription Modifications**

```
Upgrade Rules:
✅ Immediate access to new features
✅ Prorated charge for current period
✅ Next invoice reflects new plan price
✅ User limits updated instantly

Downgrade Rules:
✅ Change effective at next billing cycle
✅ Credit applied for unused portion
✅ Features restricted at downgrade date
✅ Data export period before restriction

Cancellation Rules:
✅ Access continues until period end
✅ No partial refunds after 7 days
✅ Data retained for 30 days
✅ Easy reactivation within retention period
```

### **Payment Failure Protocol**

```
Grace Period: 3 days
First Retry: Day 3 + email
Second Retry: Day 7 + urgent email
Final Retry: Day 10 + phone call (Enterprise)
Account Suspension: Day 14
Subscription Cancellation: Day 30

During Grace Period:
✅ Full access maintained
✅ Payment update prompts shown
✅ Email reminders sent

After Suspension:
❌ Login blocked
❌ API access disabled
❌ Data export still available
```

---

## 🤔 **Questions for Review**

1. **Pricing Strategy**: Are the proposed plan prices and limits appropriate for the target market?

2. **Payment Methods**: Should we support payment methods beyond credit cards (ACH, PayPal, wire transfer)?

3. **Tax Handling**: How should we handle international tax requirements (VAT, GST)?

4. **Dunning Strategy**: Is the 14-day grace period appropriate, or should it vary by plan?

5. **Usage Overages**: Should overage charges be automatic or require explicit approval?

6. **Annual Billing**: Should annual plans have different feature sets or just pricing discounts?

7. **Enterprise Sales**: Should Enterprise plans go through manual sales process or self-service?

8. **Refund Policy**: Is the 7-day refund window sufficient, or should it be longer?

9. **Custom Plans**: Should custom plans require manual approval or be automatically activated after quote acceptance?

10. **Custom Features**: How should we handle development costs for tenant-specific custom features?

11. **Custom Pricing**: Should there be minimum/maximum limits on custom pricing to prevent underpricing?

12. **Quote Expiration**: How long should custom plan quotes remain valid before expiring?

13. **Plan Transitions**: Should custom-to-standard plan transitions require manual platform owner approval?

14. **Retention Strategy**: What percentage discounts should be offered to retain custom plan customers?

15. **Feature Removal**: How long should custom feature data be retained after downgrade (30 days, 60 days)?

16. **Transition Billing**: Should plan transitions take effect immediately or at the next billing cycle?

---

**This Phase 4 completes the Complete Billing System foundation, giving you full subscription management, payment processing, and revenue optimization for your SaaS CRM platform!** 💰🚀
