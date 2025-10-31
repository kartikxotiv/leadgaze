# Migration Plan: Sequelize to Supabase

## 📋 Executive Summary

This document outlines a comprehensive plan to migrate the CRM application from Sequelize ORM to Supabase. The migration will eliminate all Sequelize dependencies and replace them with Supabase's client library for all database operations.

**Current State:**
- ✅ Supabase client is already set up (`lib/supabase-client.ts`)
- ✅ Supabase migrations exist in `supabase/migrations/`
- ✅ One example migration exists (`lib/data/leads.ts`)
- ❌ All API routes still use Sequelize models
- ❌ Library files use Sequelize
- ❌ Scripts use Sequelize
- ❌ Sequelize dependencies still in package files

**Target State:**
- ✅ All database queries use Supabase client
- ✅ All Sequelize imports removed
- ✅ All Sequelize operators replaced with Supabase queries
- ✅ All Sequelize model methods replaced with Supabase table operations
- ✅ All Sequelize transactions replaced with Supabase RPC or batched operations
- ✅ All Sequelize dependencies removed from package.json
- ✅ Sequelize config files removed

---

## 🎯 Migration Strategy

### Phase 1: Foundation (Prerequisites)
1. Verify Supabase migrations are complete and match all tables
2. Create TypeScript type definitions for all tables
3. Create data access layer modules for each entity
4. Create helper utilities for common Supabase query patterns

### Phase 2: Core Library Migration
1. Migrate `lib/auth-service.ts` (highest impact, used everywhere)
2. Migrate `lib/lead-scoring-engine.ts`
3. Migrate `lib/notification-engine.ts`
4. Migrate `lib/database-sync.ts` (can be deprecated if using migrations)

### Phase 3: API Routes Migration
Migrate API routes in dependency order:
1. Auth routes (foundation)
2. Organization/User management
3. Leads (core feature)
4. Deals, Tasks, Activities
5. Analytics and reporting
6. Notifications

### Phase 4: Cleanup
1. Remove Sequelize from scripts
2. Remove Sequelize dependencies
3. Remove Sequelize config files
4. Update documentation

---

## 📁 Files Requiring Migration

### 🔴 Critical Library Files (Must Migrate First)

#### 1. `lib/auth-service.ts` ⚠️ **HIGHEST PRIORITY**
- **Lines:** ~1700
- **Sequelize Usage:**
  - Imports: `User`, `Organization`, `UserOrganization`, `UserSession`, `UserConfig`, `OrganizationConfig`, `OrganizationRole`, `UserInvitation`, `EmailVerification`, `PasswordResetToken`
  - Uses: `Op`, `findOne`, `findAll`, `create`, `update`, `destroy`, `findByPk`, `transaction`
  - Used by: ALL auth API routes
- **Migration Complexity:** Very High
- **Estimated Effort:** 4-6 hours

#### 2. `lib/lead-scoring-engine.ts`
- **Lines:** ~450
- **Sequelize Usage:**
  - Imports: `Lead`, `LeadScore`, `ScoringRule`, `Activity`
  - Uses: `findByPk`, `findAll`, `findOne`, `upsert`, `include`
- **Migration Complexity:** High
- **Estimated Effort:** 2-3 hours

#### 3. `lib/notification-engine.ts`
- **Lines:** ~550
- **Sequelize Usage:**
  - Imports: `Notification`, `AutomationRule`, `User`, `Lead`, `Deal`, `Activity`
  - Uses: `create`, `bulkCreate`, `findAll`, `update`, `Op`
- **Migration Complexity:** Medium
- **Estimated Effort:** 2 hours

#### 4. `lib/database-sync.ts`
- **Lines:** ~150
- **Sequelize Usage:** `sequelize.sync()`, `bulkCreate`
- **Migration Complexity:** Low (Can be deprecated)
- **Estimated Effort:** 1 hour or remove if using migrations

### 🟠 API Routes (30+ files)

#### Authentication Routes (14 files)
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/auth/send-otp/route.ts`
- `app/api/auth/invite/route.ts`
- `app/api/auth/accept-invitation/route.ts`
- `app/api/auth/debug-otp/route.ts`
- `app/api/auth/test-otp/route.ts`
- `app/api/auth/password-reset/route.ts` (if exists)
- `app/api/auth/verify-email/route.ts` (if exists)
- And 4 more in `app/api/auth/`

#### Lead Routes (8 files)
- `app/api/leads/route.ts` ⚠️ **HIGH PRIORITY**
  - Uses: `Lead.findAndCountAll`, `Lead.findOne`, `Lead.create`, `LeadConfig`, `User`, `LeadScore`, `Activity`
  - Complex includes with multiple joins
  - Uses `Op` operators extensively
- `app/api/leads/[id]/route.ts`
- `app/api/leads/import/route.ts`
- `app/api/leads/duplicates/route.ts`
- `app/api/leads/scoring/route.ts`
- `app/api/leads/scoring/rules/route.ts`
- `app/api/leads/config/route.ts`
- `app/api/leads/merge/route.ts` ⚠️ **Uses transactions**

#### Deal Routes (2 files)
- `app/api/deals/route.ts`
- `app/api/deals/[id]/route.ts`

#### Task Routes (2 files)
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`

#### Activity Routes (2 files)
- `app/api/activities/route.ts`
- `app/api/activities/[id]/route.ts`

#### Organization Routes (6 files)
- `app/api/organizations/[id]/members/route.ts`
- `app/api/organizations/[id]/workspaces/route.ts`
- `app/api/organizations/[id]/workspaces/[workspaceId]/route.ts`
- And 3 more in `app/api/organizations/`

#### Analytics Routes (5 files)
- `app/api/analytics/dashboard/route.ts` ⚠️ **Complex aggregations**
- `app/api/analytics/team-performance/route.ts`
- `app/api/analytics/tasks-summary/route.ts`
- `app/api/analytics/reports/route.ts`
- `app/api/analytics/lead-sources/route.ts`

#### Notification Routes (4 files)
- `app/api/notifications/route.ts`
- `app/api/notifications/[id]/route.ts`
- And 2 more

#### Other Routes
- `app/api/pipeline/route.ts`
- `app/api/test/route.ts`
- `app/api/test/models/route.ts`
- `app/api/test/create-user/route.ts`

### 🟡 Scripts (22+ files)

All scripts in `scripts/` directory that use Sequelize:
- `scripts/sync-database.js`
- `scripts/test-models.js`
- `scripts/setup-leads-system.js`
- `scripts/setup-lead-scoring-tables.js`
- `scripts/setup-deals-table.js`
- `scripts/setup-activities-table.js`
- `scripts/setup-notifications-tables.js`
- `scripts/seed-config-data.js`
- `scripts/seed-config-data-sql.js`
- `scripts/reset-database-completely.js`
- `scripts/migrate-to-config-system.js`
- `scripts/migrate-to-config-system-sql.js`
- And 10+ more

**Note:** Many scripts may be deprecated if using Supabase migrations.

### 🟢 Configuration Files to Remove

- `config/config.json` - Sequelize config
- `.sequelizerc` - Sequelize CLI config
- `config/database.js` (already deleted per git status)

---

## 🔄 Migration Patterns

### Pattern 1: Simple Find Operations

**Sequelize:**
```typescript
const user = await User.findOne({
  where: { email: email }
});
```

**Supabase:**
```typescript
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();
if (error) throw error;
```

### Pattern 2: Find with Includes (Joins)

**Sequelize:**
```typescript
const lead = await Lead.findByPk(leadId, {
  include: [
    {
      model: LeadConfig,
      as: "status",
      attributes: ["entityValue", "description"],
    },
    {
      model: User,
      as: "assignedUser",
      attributes: ["firstName", "lastName", "email"],
    }
  ]
});
```

**Supabase:**
```typescript
const { data: lead, error } = await supabase
  .from('leads')
  .select(`
    *,
    status:lead_config!leads_status_id_fkey(entity_value, description),
    assigned_user:users!leads_assigned_to_fkey(first_name, last_name, email)
  `)
  .eq('lead_id', leadId)
  .single();
```

### Pattern 3: Find and Count All (Pagination)

**Sequelize:**
```typescript
const { count, rows } = await Lead.findAndCountAll({
  where: whereClause,
  limit: limit,
  offset: offset,
});
```

**Supabase:**
```typescript
// Get count
const { count, error: countError } = await supabase
  .from('leads')
  .select('*', { count: 'exact', head: true })
  .match(whereClause);

// Get data
const { data: rows, error } = await supabase
  .from('leads')
  .select('*')
  .match(whereClause)
  .range(offset, offset + limit - 1);
```

### Pattern 4: Operators

**Sequelize:**
```typescript
import { Op } from "sequelize";

whereClause[Op.or] = [
  { firstName: { [Op.iLike]: `%${search}%` } },
  { lastName: { [Op.iLike]: `%${search}%` } }
];
whereClause.createdAt = { [Op.gte]: dateFrom };
```

**Supabase:**
```typescript
let query = supabase.from('leads').select('*');

// OR conditions (multiple .or() calls)
query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

// Greater than or equal
query = query.gte('created_at', dateFrom);
```

### Pattern 5: Transactions

**Sequelize:**
```typescript
const t = await sequelize.transaction();
try {
  await Model1.create(data1, { transaction: t });
  await Model2.update(data2, { where: {...}, transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
}
```

**Supabase:**
```typescript
// Option 1: Use RPC function for complex transactions
// Option 2: Batch operations (Supabase handles atomicity for single table)
// Option 3: Create a PostgreSQL function

// For simple cases, Supabase operations are atomic per request
const { data, error } = await supabase.rpc('merge_leads', {
  primary_lead_id: primaryLeadId,
  duplicate_ids: duplicateLeadIds
});
```

### Pattern 6: Create/Update

**Sequelize:**
```typescript
const lead = await Lead.create({
  firstName: body.firstName,
  lastName: body.lastName,
  // ...
});
```

**Supabase:**
```typescript
const { data: lead, error } = await supabase
  .from('leads')
  .insert({
    first_name: body.firstName,
    last_name: body.lastName,
    // ...
  })
  .select()
  .single();
```

### Pattern 7: Upsert

**Sequelize:**
```typescript
await LeadScore.upsert({
  leadId: result.leadId,
  totalScore: result.totalScore,
  // ...
});
```

**Supabase:**
```typescript
const { data, error } = await supabase
  .from('lead_scores')
  .upsert({
    lead_id: result.leadId,
    total_score: result.totalScore,
    // ...
  }, {
    onConflict: 'lead_id'
  })
  .select();
```

### Pattern 8: Bulk Operations

**Sequelize:**
```typescript
await Notification.bulkCreate(
  notifications.map(n => ({ ...n, sentAt: new Date() }))
);
```

**Supabase:**
```typescript
const { data, error } = await supabase
  .from('notifications')
  .insert(
    notifications.map(n => ({ ...n, sent_at: new Date() }))
  );
```

---

## 🛠️ Implementation Steps

### Step 1: Create Type Definitions
Create `lib/types/database.ts` with TypeScript interfaces for all tables:
```typescript
export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  // ... all fields
}

export interface Lead {
  lead_id: string;
  organization_id: string;
  first_name: string;
  // ... all fields
}
// ... for all tables
```

### Step 2: Create Data Access Layer
Expand `lib/data/` directory structure:
```
lib/data/
  ├── users.ts
  ├── organizations.ts
  ├── leads.ts (already exists, expand)
  ├── deals.ts
  ├── tasks.ts
  ├── activities.ts
  ├── notifications.ts
  ├── lead-scores.ts
  ├── scoring-rules.ts
  └── index.ts
```

Each file should export functions like:
- `getUserById(id: string)`
- `getUserByEmail(email: string)`
- `createUser(data: Partial<User>)`
- `updateUser(id: string, data: Partial<User>)`
- `deleteUser(id: string)`

### Step 3: Create Query Helpers
Create `lib/utils/supabase-queries.ts`:
```typescript
// Helpers for common patterns
export function buildWhereClause(query: any, filters: Record<string, any>)
export function buildPaginationQuery(query: any, page: number, limit: number)
export function buildIncludeQuery(baseTable: string, includes: string[])
```

### Step 4: Migrate Auth Service (Priority)
This is the foundation - all auth routes depend on it. Follow this order:
1. Replace User queries
2. Replace Organization queries
3. Replace UserOrganization queries
4. Replace UserSession queries
5. Replace authentication-related queries
6. Handle transactions (convert to RPC if needed)

### Step 5: Migrate API Routes
Follow dependency order:
1. Auth routes (after auth-service is migrated)
2. Organization routes
3. Lead routes (core feature)
4. Deal, Task, Activity routes
5. Analytics (may need custom RPC functions for aggregations)
6. Notifications

### Step 6: Update Library Files
1. `lib/lead-scoring-engine.ts`
2. `lib/notification-engine.ts`
3. `lib/database-sync.ts` (deprecate or remove)

### Step 7: Clean Up Scripts
Decide which scripts are still needed:
- Keep: Data migration scripts (if needed)
- Remove: Table setup scripts (Supabase migrations handle this)
- Update: Seed scripts to use Supabase client

### Step 8: Remove Sequelize Dependencies
1. Remove from `package.json`:
   - `sequelize`
   - `sequelize-cli` (if exists)
   - `@types/sequelize` (if exists)
2. Remove config files:
   - `config/config.json`
   - `.sequelizerc`
3. Clean lock files (run `npm install` or `yarn install`)

### Step 9: Update Documentation
- Update `PROJECT_OVERVIEW.md`
- Update `ENVIRONMENT_VARIABLES.md`
- Update `README.md`
- Remove Sequelize references from docs

---

## ⚠️ Critical Considerations

### 1. Transactions
Supabase doesn't support multi-table transactions in the same way Sequelize does. Options:
- Use PostgreSQL functions (RPC) for complex transactions
- Rely on Supabase's per-request atomicity
- Batch operations where possible

### 2. Complex Joins
Supabase's select syntax for joins is different. Need to:
- Map Sequelize `include` to Supabase `select` with foreign key syntax
- Test all join queries thoroughly
- Consider denormalization if performance suffers

### 3. Column Naming
Sequelize uses camelCase model attributes → snake_case database columns.
Supabase uses snake_case directly. Ensure:
- All queries use snake_case column names
- Type definitions use snake_case
- Or use Supabase column mapping (not recommended)

### 4. Aggregations
Analytics routes use complex aggregations. May need to:
- Create PostgreSQL views
- Create RPC functions
- Use Supabase's aggregation functions

### 5. Metadata/JSONB Fields
Sequelize handles JSONB differently. Ensure:
- JSONB fields are properly stringified/parsed
- Metadata queries work correctly

### 6. Auto-increment vs UUID
Check if any tables use auto-increment IDs that need UUID conversion.

---

## 📊 Migration Checklist

### Phase 1: Foundation ✅
- [ ] Verify all Supabase migrations exist and match schema
- [ ] Create TypeScript type definitions for all tables
- [ ] Create data access layer structure
- [ ] Create query helper utilities

### Phase 2: Core Libraries
- [ ] Migrate `lib/auth-service.ts`
- [ ] Migrate `lib/lead-scoring-engine.ts`
- [ ] Migrate `lib/notification-engine.ts`
- [ ] Deprecate or migrate `lib/database-sync.ts`

### Phase 3: API Routes
- [ ] Migrate all auth routes (14 files)
- [ ] Migrate organization routes (6 files)
- [ ] Migrate lead routes (8 files)
- [ ] Migrate deal routes (2 files)
- [ ] Migrate task routes (2 files)
- [ ] Migrate activity routes (2 files)
- [ ] Migrate analytics routes (5 files)
- [ ] Migrate notification routes (4 files)
- [ ] Migrate pipeline routes (1 file)
- [ ] Migrate test routes (4 files)

### Phase 4: Scripts & Cleanup
- [ ] Audit scripts - determine which to keep/remove
- [ ] Migrate necessary scripts to Supabase
- [ ] Remove Sequelize from package.json
- [ ] Remove Sequelize config files
- [ ] Update all documentation

### Phase 5: Testing
- [ ] Unit tests for data access layer
- [ ] Integration tests for API routes
- [ ] End-to-end testing of critical flows
- [ ] Performance testing (compare query times)
- [ ] Test all authentication flows
- [ ] Test all CRUD operations
- [ ] Test complex queries (analytics, joins)

---

## 🔍 Testing Strategy

### Unit Tests
Create tests for data access layer functions:
```typescript
describe('getLeadById', () => {
  it('should fetch lead with correct ID', async () => {
    // Test implementation
  });
});
```

### Integration Tests
Test API routes with Supabase:
- Mock Supabase client if needed
- Test with real Supabase instance in test environment

### Manual Testing Checklist
- [ ] User registration/login
- [ ] Organization creation/management
- [ ] Lead CRUD operations
- [ ] Lead import
- [ ] Lead scoring
- [ ] Deal management
- [ ] Task management
- [ ] Activity logging
- [ ] Notifications
- [ ] Analytics dashboards
- [ ] Multi-organization switching
- [ ] Role-based permissions

---

## 📝 Notes

1. **Breaking Changes:** This is a major migration. Ensure:
   - All team members are aware
   - Deploy to staging first
   - Have rollback plan ready

2. **Performance:** Monitor query performance. Supabase may have different performance characteristics.

3. **Error Handling:** Supabase errors are different from Sequelize. Update error handling throughout.

4. **Type Safety:** Use TypeScript types strictly to catch migration issues early.

5. **Gradual Migration:** Consider migrating one module at a time if possible, though this creates temporary dual dependencies.

---

## 🎯 Success Criteria

Migration is complete when:
- ✅ No Sequelize imports in codebase
- ✅ All API routes working with Supabase
- ✅ All tests passing
- ✅ No Sequelize dependencies in package.json
- ✅ All Sequelize config files removed
- ✅ Documentation updated
- ✅ Application running successfully in production

---

## 📚 Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Query Building](https://supabase.com/docs/reference/javascript/select)
- [PostgreSQL Functions in Supabase](https://supabase.com/docs/guides/database/functions)

---

**Created:** 2025-01-XX
**Last Updated:** 2025-01-XX
**Estimated Total Effort:** 40-60 hours
**Priority:** High

