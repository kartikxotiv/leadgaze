# Sequelize to Supabase Migration Pattern Guide

This document provides patterns and examples for migrating API routes from Sequelize to Supabase.

## Table of Contents
1. [Import Changes](#import-changes)
2. [Field Name Mappings](#field-name-mappings)
3. [Query Patterns](#query-patterns)
4. [Common Operations](#common-operations)
5. [Step-by-Step Migration Checklist](#step-by-step-migration-checklist)
6. [Examples](#examples)

---

## 1. Import Changes

### Before (Sequelize)
```typescript
import { Lead, User, Organization, Activity } from "@/models";
import { Op } from "sequelize";
```

### After (Supabase)
```typescript
import { getLeadById, createLead, updateLead } from "@/lib/data/leads";
import { getUserById } from "@/lib/data/users";
import { getOrganizationById } from "@/lib/data/organizations";
import { createActivity } from "@/lib/data/activities";
```

### Common Import Patterns

**Model Imports → Data Access Functions:**

| Sequelize Model | Supabase Data Access File |
|----------------|---------------------------|
| `Lead` | `@/lib/data/leads` |
| `User` | `@/lib/data/users` |
| `Organization` | `@/lib/data/organizations` |
| `UserOrganization` | `@/lib/data/user-organizations` |
| `Activity` | `@/lib/data/activities` |
| `LeadScore` | `@/lib/data/lead-scores` |
| `LeadConfig` | `@/lib/data/lead-config` |
| `Notification` | `@/lib/data/notifications` |
| `Deal` | `@/lib/data/deals` |
| `Task` | `@/lib/data/tasks` (if exists) |
| `UserInvitation` | `@/lib/data/user-invitations` |
| `PasswordResetToken` | `@/lib/data/password-reset-tokens` |

---

## 2. Field Name Mappings

### CamelCase → Snake_case Conversion

**User Fields:**
- `userId` → `user_id`
- `firstName` → `first_name`
- `lastName` → `last_name`
- `phoneNumber` → `phone_number`
- `emailVerified` → `email_verified`
- `lastLogin` → `last_login`
- `loginAttempts` → `login_attempts`
- `lockUntil` → `lock_until`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

**Lead Fields:**
- `leadId` → `lead_id`
- `firstName` → `first_name`
- `lastName` → `last_name`
- `businessName` → `business_name`
- `companyWebsite` → `company_website`
- `jobTitle` → `job_title`
- `linkedinProfile` → `linkedin_profile`
- `organizationId` → `organization_id`
- `sourceId` → `source_id`
- `industryId` → `industry_id`
- `companySizeId` → `company_size_id`
- `productInterest` → `product_interest`
- `qualificationNotes` → `qualification_notes`
- `leadScore` → `lead_score`
- `statusId` → `status_id`
- `assignedTo` → `assigned_to`
- `createdBy` → `created_by`

**Organization Fields:**
- `organizationId` → `organization_id`
- `subscriptionStatus` → `subscription_status`
- `subscriptionPlan` → `subscription_plan`
- `trialStartsAt` → `trial_starts_at`
- `trialEndsAt` → `trial_ends_at`
- `maxUsers` → `max_users`
- `maxWorkspaces` → `max_workspaces`
- `featuresEnabled` → `features_enabled`

**Activity Fields:**
- `activityId` → `activity_id`
- `activityType` → `activity_type`
- `relatedType` → `related_type`
- `relatedId` → `related_id`
- `userId` → `user_id`

**Deal Fields:**
- `dealId` → `deal_id`
- `userId` → `user_id`
- `organizationId` → `organization_id`

**General:**
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- Any camelCase → snake_case

---

## 3. Query Patterns

### 3.1 Find Single Record

#### Before (Sequelize)
```typescript
const lead = await Lead.findByPk(leadId);
const user = await User.findOne({
  where: { email: email.toLowerCase() }
});
```

#### After (Supabase)
```typescript
const lead = await getLeadById(leadId);
const user = await getUserByEmail(email.toLowerCase());
```

### 3.2 Find Multiple Records

#### Before (Sequelize)
```typescript
const leads = await Lead.findAll({
  where: { organizationId },
  order: [["createdAt", "DESC"]],
});
```

#### After (Supabase)
```typescript
const leads = await getLeads(organizationId);
// OR use paginated version
const result = await getLeadsPaginated(organizationId, page, limit);
```

### 3.3 Find with Conditions

#### Before (Sequelize)
```typescript
const leads = await Lead.findAll({
  where: {
    organizationId,
    statusId: someStatusId,
    [Op.or]: [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ]
  }
});
```

#### After (Supabase)
```typescript
const result = await getLeadsPaginated(
  organizationId,
  page,
  limit,
  { status_id: someStatusId }, // filters
  search // search term
);
```

### 3.4 Create Record

#### Before (Sequelize)
```typescript
const lead = await Lead.create({
  firstName: body.firstName,
  lastName: body.lastName,
  organizationId: body.organizationId,
  // ...
});
```

#### After (Supabase)
```typescript
const lead = await createLead({
  first_name: body.firstName,
  last_name: body.lastName,
  organization_id: body.organizationId,
  // ...
});
```

### 3.5 Update Record

#### Before (Sequelize)
```typescript
await Lead.update(
  { statusId: newStatusId },
  { where: { leadId } }
);

// OR
await lead.update({ statusId: newStatusId });
```

#### After (Supabase)
```typescript
await updateLead(leadId, {
  status_id: newStatusId
});
```

### 3.6 Delete Record

#### Before (Sequelize)
```typescript
await Lead.destroy({ where: { leadId } });
```

#### After (Supabase)
```typescript
await deleteLead(leadId);
```

### 3.7 Find with Includes (Joins)

#### Before (Sequelize)
```typescript
const lead = await Lead.findByPk(leadId, {
  include: [
    {
      model: User,
      as: "assignedUser",
      attributes: ["firstName", "lastName", "email"]
    },
    {
      model: LeadConfig,
      as: "status",
      attributes: ["entityValue"]
    }
  ]
});
```

#### After (Supabase)
```typescript
// Use getLeadWithRelations or getLeadsPaginated
const lead = await getLeadWithRelations(leadId);
// These already include related data via Supabase foreign key joins
```

### 3.8 Count Records

#### Before (Sequelize)
```typescript
const count = await Lead.count({
  where: { organizationId, statusId }
});
```

#### After (Supabase)
```typescript
// Use paginated query and get total
const result = await getLeadsPaginated(organizationId, 1, 1, { status_id });
const count = result.total;
```

### 3.9 Find with Op Operators

| Sequelize Op | Supabase Equivalent |
|--------------|---------------------|
| `Op.eq` | `.eq()` (default) |
| `Op.ne` | `.neq()` |
| `Op.gt` | `.gt()` |
| `Op.gte` | `.gte()` |
| `Op.lt` | `.lt()` |
| `Op.lte` | `.lte()` |
| `Op.in` | `.in()` |
| `Op.notIn` | `.not('column', 'in', array)` |
| `Op.like` | `.ilike()` (case-insensitive) |
| `Op.iLike` | `.ilike()` |
| `Op.contains` | `.contains()` (for JSONB) |
| `Op.or` | `.or()` |
| `Op.and` | Multiple `.eq()` calls or filters object |

#### Examples

**Op.in:**
```typescript
// Before
where: { statusId: { [Op.in]: [id1, id2] } }

// After
query = query.in('status_id', [id1, id2])
```

**Op.like / Op.iLike:**
```typescript
// Before
where: { email: { [Op.iLike]: `%${search}%` } }

// After
query = query.ilike('email', `%${search}%`)
```

**Op.contains (JSONB):**
```typescript
// Before
where: { metadata: { [Op.contains]: { workspaceId } } }

// After
query = query.contains('metadata', { workspaceId })
```

---

## 4. Common Operations

### 4.1 Pagination

#### Before (Sequelize)
```typescript
const { count, rows } = await Lead.findAndCountAll({
  where: { organizationId },
  limit,
  offset: (page - 1) * limit,
  order: [["createdAt", "DESC"]]
});
```

#### After (Supabase)
```typescript
const result = await getLeadsPaginated(organizationId, page, limit);
// result.data = rows
// result.total = count
// result.totalPages, result.offset are also available
```

### 4.2 Transactions

#### Before (Sequelize)
```typescript
const transaction = await sequelize.transaction();
try {
  await Lead.create({ ... }, { transaction });
  await Activity.create({ ... }, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

#### After (Supabase)
```typescript
// Supabase doesn't support explicit transactions in the same way
// For simple cases, just do operations sequentially
// For complex transactions, consider PostgreSQL functions or
// rely on Supabase's atomic operations

try {
  const lead = await createLead({ ... });
  await createActivity({ ... });
} catch (error) {
  // Handle error - operations are independent
  throw error;
}

// OR use Supabase RPC for complex transactions (if needed)
```

### 4.3 Error Handling

#### Before (Sequelize)
```typescript
const lead = await Lead.findByPk(leadId);
if (!lead) {
  throw new Error("Lead not found");
}
```

#### After (Supabase)
```typescript
const lead = await getLeadById(leadId);
if (!lead) {
  throw new Error("Lead not found");
}
// Supabase returns null if not found, so check is the same
```

---

## 5. Step-by-Step Migration Checklist

For each API route file:

### Step 1: Update Imports
- [ ] Remove Sequelize model imports (`from "@/models"`)
- [ ] Remove `Op` import from "sequelize"
- [ ] Add Supabase data access function imports
- [ ] Add any utility imports needed

### Step 2: Convert Field Names
- [ ] Scan for all camelCase field names
- [ ] Convert to snake_case in create/update operations
- [ ] Update response mappings if needed

### Step 3: Replace Query Operations
- [ ] Replace `Model.findByPk()` → `getXxxById()`
- [ ] Replace `Model.findOne()` → appropriate get function
- [ ] Replace `Model.findAll()` → `getXxx()` or `getXxxPaginated()`
- [ ] Replace `Model.create()` → `createXxx()`
- [ ] Replace `Model.update()` → `updateXxx()`
- [ ] Replace `Model.destroy()` → `deleteXxx()`
- [ ] Replace `Model.findAndCountAll()` → `getXxxPaginated()`

### Step 4: Update Query Logic
- [ ] Replace `Op` operators with Supabase query methods
- [ ] Update `where` clauses to filter objects or query builders
- [ ] Replace `include` with relations (already handled in data layer)

### Step 5: Handle Relationships
- [ ] Use `getXxxWithRelations()` if relations needed
- [ ] Or use `getXxxPaginated()` which includes relations

### Step 6: Update Response Format
- [ ] Ensure response fields match expected format
- [ ] Map snake_case to camelCase in response if needed (optional)

### Step 7: Test & Verify
- [ ] Check for linting errors
- [ ] Verify all imports are correct
- [ ] Test the endpoint if possible

---

## 6. Examples

### Example 1: Simple GET Route

#### Before
```typescript
import { Lead } from "@/models";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  
  const lead = await Lead.findByPk(leadId);
  
  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json({ data: lead });
}
```

#### After
```typescript
import { getLeadById } from "@/lib/data/leads";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  
  const lead = await getLeadById(leadId!);
  
  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  return NextResponse.json({ data: lead });
}
```

### Example 2: POST Route with Validation

#### Before
```typescript
import { Lead, LeadConfig } from "@/models";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate
  const sourceConfig = await LeadConfig.findByPk(body.sourceId);
  if (!sourceConfig) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  
  // Check duplicate
  const existing = await Lead.findOne({
    where: {
      email: body.email,
      organizationId: body.organizationId
    }
  });
  
  if (existing) {
    return NextResponse.json({ error: "Duplicate" }, { status: 409 });
  }
  
  // Create
  const lead = await Lead.create({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    organizationId: body.organizationId,
    sourceId: body.sourceId
  });
  
  return NextResponse.json({ data: lead });
}
```

#### After
```typescript
import { createLead, findLeadByEmail } from "@/lib/data/leads";
import { getLeadConfigById } from "@/lib/data/lead-config";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate
  const sourceConfig = await getLeadConfigById(body.sourceId);
  if (!sourceConfig || !sourceConfig.is_active) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  
  // Check duplicate
  const existing = await findLeadByEmail(
    body.email,
    body.organizationId
  );
  
  if (existing) {
    return NextResponse.json({ error: "Duplicate" }, { status: 409 });
  }
  
  // Create
  const lead = await createLead({
    first_name: body.firstName,
    last_name: body.lastName,
    email: body.email,
    organization_id: body.organizationId,
    source_id: body.sourceId
  });
  
  return NextResponse.json({ data: lead });
}
```

### Example 3: Complex Query with Filters

#### Before
```typescript
import { Lead } from "@/models";
import { Op } from "sequelize";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  
  const whereClause: any = { organizationId };
  
  if (status) {
    whereClause.statusId = status;
  }
  
  if (search) {
    whereClause[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const { count, rows } = await Lead.findAndCountAll({
    where: whereClause,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]]
  });
  
  return NextResponse.json({
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  });
}
```

#### After
```typescript
import { getLeadsPaginated } from "@/lib/data/leads";
import { getLeadConfigByTypeAndValue } from "@/lib/data/lead-config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  
  const filters: Record<string, any> = {};
  
  if (status) {
    const statusConfig = await getLeadConfigByTypeAndValue("status", status);
    if (statusConfig) {
      filters.status_id = statusConfig.id;
    }
  }
  
  const result = await getLeadsPaginated(
    organizationId!,
    page,
    limit,
    Object.keys(filters).length > 0 ? filters : undefined,
    search || undefined
  );
  
  return NextResponse.json({
    data: result.data,
    pagination: {
      total: result.total,
      page,
      limit,
      totalPages: result.totalPages
    }
  });
}
```

---

## 7. Quick Reference: Common Data Access Functions

### Leads
```typescript
getLeadById(leadId)
getLeads(organizationId)
getLeadsPaginated(orgId, page, limit, filters?, search?)
getLeadWithRelations(leadId)
createLead(data)
updateLead(leadId, updates)
deleteLead(leadId)
findLeadByEmail(email, organizationId)
```

### Users
```typescript
getUserById(userId)
getUserByEmail(email)
createUser(data)
updateUser(userId, updates)
```

### Organizations
```typescript
getOrganizationById(orgId)
getOrganizationBySlug(slug)
createOrganization(data)
updateOrganization(orgId, updates)
getOrganizationsByUserId(userId)
getUserWithOrganizations(userId)
```

### Activities
```typescript
getActivityById(activityId)
getActivities(organizationId)
getActivitiesByRelated(relatedType, relatedId)
createActivity(data)
updateActivity(activityId, updates)
```

### Config Tables
```typescript
getLeadConfigById(id)
getLeadConfigByTypeAndValue(type, value)
getUserConfigByTypeAndValue(type, value)
getOrganizationConfigByTypeAndValue(type, value)
```

---

## 8. Common Pitfalls & Solutions

### Pitfall 1: Forgetting Field Name Conversion
**Problem:** Using camelCase in Supabase operations
**Solution:** Always convert to snake_case

### Pitfall 2: Using Sequelize Op Operators
**Problem:** `Op.in`, `Op.like` still in code
**Solution:** Replace with Supabase query methods (`.in()`, `.ilike()`)

### Pitfall 3: Missing Error Handling for Null Returns
**Problem:** Supabase returns `null` instead of throwing for not found
**Solution:** Always check for `null` explicitly

### Pitfall 4: Include/Join Syntax
**Problem:** Trying to use Sequelize `include`
**Solution:** Use `getXxxWithRelations()` or `getXxxPaginated()` which handle joins

### Pitfall 5: Transaction Logic
**Problem:** Complex transaction dependencies
**Solution:** For simple cases, sequential operations work. For complex cases, consider PostgreSQL functions or redesign flow.

---

## 9. Testing Checklist

After migrating each route:
- [ ] Import statements are correct
- [ ] No Sequelize references remain
- [ ] Field names are snake_case
- [ ] Queries return expected data structure
- [ ] Error handling works
- [ ] Linter passes
- [ ] API endpoint responds correctly (manual test if possible)

---

## 10. Migration Priority Order

Suggested order for migrating remaining routes:

1. **High Priority:**
   - Auth routes (`/api/auth/*`)
   - User routes (`/api/users/*`)
   - Organization routes (`/api/organizations/*`)

2. **Medium Priority:**
   - Deal routes (`/api/deals/*`)
   - Activity routes (`/api/activities/*`)
   - Task routes (`/api/tasks/*`)

3. **Lower Priority:**
   - Analytics routes (`/api/analytics/*`)
   - Notification routes (`/api/notifications/*`)
   - Test routes (can be removed or migrated last)

---

**Happy Migrating! 🚀**

For questions or issues, refer to:
- `lib/data/*.ts` files for available functions
- `app/api/leads/route.ts` as a complete example
- `lib/auth-service.ts` for complex migration patterns

