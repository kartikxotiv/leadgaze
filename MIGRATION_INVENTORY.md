# Migration Inventory: Sequelize to Supabase

## Detailed File-by-File Migration List

This document provides a comprehensive inventory of all files that need to be migrated from Sequelize to Supabase.

---

## 🔴 Critical Library Files

### 1. `lib/auth-service.ts`
**Status:** ❌ Needs Migration  
**Priority:** 🔴 CRITICAL  
**Lines:** ~1700  
**Sequelize Usage:**
- Imports: `User`, `Organization`, `UserOrganization`, `UserSession`, `UserConfig`, `OrganizationConfig`, `OrganizationRole`, `UserInvitation`, `EmailVerification`, `PasswordResetToken`, `sequelize`
- Methods: `findOne`, `findAll`, `create`, `update`, `destroy`, `findByPk`, `count`, `bulkCreate`, `transaction`
- Operators: `Op.eq`, `Op.or`, `Op.and`, `Op.ne`, `Op.in`
- Used by: ALL authentication API routes

**Migration Notes:**
- Most complex file to migrate
- Contains transaction logic
- Handles JWT token generation with organization data
- Needs careful testing of all authentication flows

---

### 2. `lib/lead-scoring-engine.ts`
**Status:** ❌ Needs Migration  
**Priority:** 🔴 HIGH  
**Lines:** ~450  
**Sequelize Usage:**
- Imports: `Lead`, `LeadScore`, `ScoringRule`, `Activity`, `Op`
- Methods: `findByPk`, `findAll`, `findOne`, `upsert`, `include`
- Used by: `app/api/leads/scoring/route.ts`, lead creation/update

**Migration Notes:**
- Complex join with activities
- Uses `upsert` for lead scores
- Needs proper handling of related data

---

### 3. `lib/notification-engine.ts`
**Status:** ❌ Needs Migration  
**Priority:** 🟠 MEDIUM  
**Lines:** ~550  
**Sequelize Usage:**
- Imports: `Notification`, `AutomationRule`, `User`, `Lead`, `Deal`, `Activity`, `Op`
- Methods: `create`, `bulkCreate`, `findAll`, `update`
- Used by: Notification API routes, various event handlers

**Migration Notes:**
- Bulk operations needed
- Complex automation rule evaluation
- May need RPC functions for automation triggers

---

### 4. `lib/database-sync.ts`
**Status:** ❌ Needs Migration  
**Priority:** 🟡 LOW (Can be deprecated)  
**Lines:** ~150  
**Sequelize Usage:**
- Imports: `sequelize`, multiple models
- Methods: `sequelize.sync()`, `bulkCreate`
- Used by: Potentially deprecated scripts

**Migration Notes:**
- Can be removed if using Supabase migrations exclusively
- Or convert seed data to Supabase client

---

## 🟠 API Routes - Authentication (14 files)

### `app/api/auth/register/route.ts`
**Sequelize Models:** `User`, `Organization`, `UserOrganization`, `UserConfig`, `OrganizationConfig`  
**Methods:** `findOne`, `create`, `transaction`

### `app/api/auth/login/route.ts`
**Sequelize Models:** `User`, `UserSession`, `UserOrganization`, `Organization`  
**Methods:** `findOne`, `create`, `findAll`

### `app/api/auth/verify-otp/route.ts`
**Sequelize Models:** `EmailOTP`, `User`, `UserSession`  
**Methods:** `findOne`, `update`, `destroy`, `create`

### `app/api/auth/send-otp/route.ts`
**Sequelize Models:** `EmailOTP`, `User`  
**Methods:** `findOne`, `create`, `destroy`

### `app/api/auth/invite/route.ts`
**Sequelize Models:** `User`, `UserInvitation`, `Organization`, `UserOrganization`  
**Methods:** `findOne`, `create`, `findAll`, `Op.or`

### `app/api/auth/accept-invitation/route.ts`
**Sequelize Models:** `UserInvitation`, `User`, `UserOrganization`, `OrganizationRole`  
**Methods:** `findOne`, `update`, `create`, `transaction`

### `app/api/auth/debug-otp/route.ts`
**Sequelize Models:** `EmailOTP`  
**Methods:** `findAll`, `destroy`

### `app/api/auth/test-otp/route.ts`
**Sequelize Models:** `EmailOTP`  
**Methods:** `findAll`

### Additional Auth Routes:
- `app/api/auth/password-reset/route.ts` (if exists)
- `app/api/auth/verify-email/route.ts` (if exists)
- `app/api/auth/refresh-token/route.ts` (if exists)
- `app/api/auth/logout/route.ts` (if exists)
- 2 more files in `app/api/auth/`

---

## 🟠 API Routes - Leads (8 files)

### `app/api/leads/route.ts` ⚠️ COMPLEX
**Sequelize Models:** `Lead`, `LeadConfig`, `User`, `LeadScore`, `Activity`, `Op`  
**Methods:** 
- `LeadConfig.findOne`, `Lead.findAndCountAll`
- Complex includes with multiple joins
- `Op.contains` for JSONB queries
- `Op.iLike` for search
- `Op.or` for multiple conditions

**Migration Notes:**
- Most complex lead route
- Needs careful handling of joins
- JSONB metadata filtering
- Pagination with count

### `app/api/leads/[id]/route.ts`
**Sequelize Models:** `Lead`, `LeadConfig`, `User`, `Activity`  
**Methods:** `findByPk`, `findOne`, `update`, `destroy`, `include`, `create`

### `app/api/leads/import/route.ts`
**Sequelize Models:** `Lead`, `LeadConfig`, `User`, `Op`  
**Methods:** `findAll`, `findOne`, `create`
**Notes:** Bulk import with duplicate detection

### `app/api/leads/duplicates/route.ts`
**Sequelize Models:** `Lead`, `LeadConfig`, `Op`  
**Methods:** `findAll`, complex `where` clauses

### `app/api/leads/scoring/route.ts`
**Sequelize Models:** `LeadScore`, `Lead`, `ScoringRule`  
**Methods:** `findOne`, `create`, `findAll`
**Notes:** Uses `LeadScoringEngine`

### `app/api/leads/scoring/rules/route.ts`
**Sequelize Models:** `ScoringRule`  
**Methods:** `findAll`, `findOne`, `create`, `update`, `destroy`

### `app/api/leads/config/route.ts`
**Sequelize Models:** `LeadConfig`  
**Methods:** `findAll`, `findOne`, `create`, `update`, `destroy`

### `app/api/leads/merge/route.ts` ⚠️ USES TRANSACTIONS
**Sequelize Models:** `sequelize`, `Lead`, `Deal`, `Activity`, `Task`  
**Methods:** `findOne`, `findAll`, `update`, `destroy`, `transaction`, `findByPk`  
**Notes:** Complex transaction logic across multiple tables

---

## 🟠 API Routes - Deals (2 files)

### `app/api/deals/route.ts`
**Sequelize Models:** `Deal`, `Lead`, `User`, `Op`  
**Methods:** `findAndCountAll`, `create`, `include`  
**Notes:** JSONB metadata filtering with `Op.contains`

### `app/api/deals/[id]/route.ts`
**Sequelize Models:** `Deal`, `Lead`, `User`  
**Methods:** `findByPk`, `update`, `destroy`, `include`

---

## 🟠 API Routes - Tasks (2 files)

### `app/api/tasks/route.ts`
**Sequelize Models:** `Task`, `User`, `Lead`, `Deal`, `Op`  
**Methods:** `findAndCountAll`, `create`, `include`  
**Notes:** Complex filtering, workspace filtering in memory

### `app/api/tasks/[id]/route.ts`
**Sequelize Models:** `Task`, `User`  
**Methods:** `findByPk`, `update`, `destroy`, `include`

---

## 🟠 API Routes - Activities (2 files)

### `app/api/activities/route.ts`
**Sequelize Models:** `Activity`, `Lead`, `User`, `Op`  
**Methods:** `findAll`, `create`, complex `where` clauses

### `app/api/activities/[id]/route.ts`
**Sequelize Models:** `Activity`, `Lead`, `User`  
**Methods:** `findByPk`, `update`, `destroy`, `include`

---

## 🟠 API Routes - Organizations (6 files)

### `app/api/organizations/[id]/members/route.ts`
**Sequelize Models:** `User`, `UserOrganization`, `OrganizationRole`  
**Methods:** `findAll`, `findOne`, `create`, `update`, `destroy`, `include`

### `app/api/organizations/[id]/workspaces/route.ts`
**Sequelize Models:** `OrganizationWorkspace`, `User`, `Organization`  
**Methods:** `findAll`, `create`, `include`

### `app/api/organizations/[id]/workspaces/[workspaceId]/route.ts`
**Sequelize Models:** `OrganizationWorkspace`, `User`  
**Methods:** `findOne`, `update`, `destroy`, `include`

### Additional Organization Routes:
- 3 more files in `app/api/organizations/`

---

## 🟠 API Routes - Analytics (5 files)

### `app/api/analytics/dashboard/route.ts` ⚠️ COMPLEX AGGREGATIONS
**Sequelize Models:** `Lead`, `Deal`, `Activity`, `Task`, `LeadConfig`, `User`, `Op`  
**Methods:** `count`, `findAll`, `findOne`, `sum`, `groupBy`  
**Notes:** Complex aggregations, date filtering, multiple joins

**Migration Notes:**
- May need PostgreSQL views or RPC functions
- Aggregations are complex
- Performance-critical

### `app/api/analytics/team-performance/route.ts`
**Sequelize Models:** `Lead`, `Deal`, `Activity`, `User`, `UserOrganization`  
**Methods:** Complex aggregations, `findAll`, `include`

### `app/api/analytics/tasks-summary/route.ts`
**Sequelize Models:** `Task`, `User`, `UserOrganization`, `Lead`, `Deal`  
**Methods:** `findAll`, `count`, aggregations

### `app/api/analytics/reports/route.ts`
**Sequelize Models:** `User`, `Lead`, `Deal`, `Task`, `PipelineStage`, `LeadConfig`  
**Methods:** Complex queries, aggregations

### `app/api/analytics/lead-sources/route.ts`
**Sequelize Models:** `Lead`, `LeadConfig`  
**Methods:** `findAll`, aggregations with `groupBy`

---

## 🟠 API Routes - Notifications (4 files)

### `app/api/notifications/route.ts`
**Sequelize Models:** `Notification`  
**Methods:** `findAll`, `create`, `count`

### `app/api/notifications/[id]/route.ts`
**Sequelize Models:** `Notification`  
**Methods:** `findByPk`, `update`, `destroy`

### Additional Notification Routes:
- 2 more files in `app/api/notifications/`

---

## 🟠 API Routes - Other (5 files)

### `app/api/pipeline/route.ts`
**Sequelize Models:** Likely `PipelineStage`, `Deal`  
**Methods:** TBD (need to check)

### `app/api/test/route.ts`
**Sequelize Models:** `User`  
**Methods:** `findAll` (testing only)

### `app/api/test/models/route.ts`
**Sequelize Models:** Multiple models  
**Methods:** `count` (testing only)

### `app/api/test/create-user/route.ts`
**Sequelize Models:** `User`  
**Methods:** `create` (testing only)

### `app/api/test-activities/route.ts` (if exists)
**Sequelize Models:** `Activity`  
**Methods:** Testing only

---

## 🟡 Scripts Directory (22+ files)

All scripts using Sequelize that need migration or removal:

### Setup/Migration Scripts
- `scripts/sync-database.js` - ⚠️ Can be deprecated (Supabase migrations handle this)
- `scripts/test-models.js` - ⚠️ Can be removed or converted to Supabase
- `scripts/setup-leads-system.js` - ⚠️ Can be removed (migrations handle this)
- `scripts/setup-lead-scoring-tables.js` - ⚠️ Can be removed
- `scripts/setup-deals-table.js` - ⚠️ Can be removed
- `scripts/setup-activities-table.js` - ⚠️ Can be removed
- `scripts/setup-notifications-tables.js` - ⚠️ Can be removed
- `scripts/setup-database.js` - ⚠️ Can be removed
- `scripts/migrate-to-config-system.js` - May need conversion
- `scripts/migrate-to-config-system-sql.js` - May need conversion

### Data Management Scripts
- `scripts/seed-config-data.js` - Convert to Supabase client
- `scripts/seed-config-data-sql.js` - Already SQL, may just need Supabase connection
- `scripts/reset-database-completely.js` - Convert to Supabase or remove

### Fix/Sync Scripts
- `scripts/fix-user-sessions-schema.js` - ⚠️ Can be removed (migrations handle this)
- `scripts/fix-user-organizations-schema.js` - ⚠️ Can be removed
- `scripts/fix-organization-config-schema.js` - ⚠️ Can be removed
- `scripts/fix-leads-schema.js` - ⚠️ Can be removed
- `scripts/sync-crm-tables.js` - ⚠️ Can be removed
- `scripts/sync-deals-table.js` - ⚠️ Can be removed
- `scripts/create-email-otp-table.js` - ⚠️ Can be removed
- `scripts/clear-auth-tables.js` - Convert to Supabase or keep as utility
- `scripts/init-database.js` - ⚠️ Can be removed

### Other Scripts
- `scripts/test-with-curl.sh` - No migration needed (shell script)
- SQL files - Can remain as-is or be converted to Supabase migrations

---

## 🟢 Configuration Files to Remove

### `config/config.json`
**Status:** ❌ Remove  
**Content:** Sequelize database configuration  
**Action:** Delete file

### `.sequelizerc`
**Status:** ❌ Remove  
**Content:** Sequelize CLI configuration  
**Action:** Delete file

### `config/database.js`
**Status:** ✅ Already deleted (per git status)

---

## 📦 Package Dependencies to Remove

### From `package.json`:
- `sequelize` - Remove
- `sequelize-cli` - Remove (if exists)
- `@types/sequelize` - Remove (if exists)
- `pg` - May keep if needed for direct PostgreSQL access, or remove

### Lock Files:
- `package-lock.json` - Will be updated on `npm install`
- `yarn.lock` - Will be updated on `yarn install`
- `pnpm-lock.yaml` - Will be updated on `pnpm install`

---

## 📝 Documentation Files to Update

### `PROJECT_OVERVIEW.md`
- Update tech stack: Remove Sequelize, confirm Supabase
- Update database section

### `ENVIRONMENT_VARIABLES.md`
- Remove Sequelize-related env vars
- Ensure Supabase env vars are documented

### `README.md`
- Update setup instructions
- Remove Sequelize-related commands
- Update database connection info

### `README_MIGRATIONS.md`
- Update migration commands (remove Sequelize CLI)
- Add Supabase migration commands

### Any other docs referencing Sequelize

---

## 📊 Summary Statistics

- **Library Files:** 4 files
- **API Routes:** ~45 files
- **Scripts:** ~22 files
- **Config Files:** 2 files
- **Total Files to Migrate/Remove:** ~73 files

---

## 🎯 Migration Priority Order

1. **Phase 1 - Foundation**
   - Create types and data access layer
   - Create helper utilities

2. **Phase 2 - Core Libraries** (BLOCKING)
   - `lib/auth-service.ts` (BLOCKS all auth routes)
   - `lib/lead-scoring-engine.ts`
   - `lib/notification-engine.ts`

3. **Phase 3 - Auth Routes** (depends on Phase 2)
   - All 14 auth route files

4. **Phase 4 - Core Features**
   - Lead routes (8 files)
   - Organization routes (6 files)
   - Deal routes (2 files)
   - Task routes (2 files)
   - Activity routes (2 files)

5. **Phase 5 - Supporting Features**
   - Analytics routes (5 files)
   - Notification routes (4 files)
   - Pipeline routes (1 file)
   - Test routes (5 files)

6. **Phase 6 - Cleanup**
   - Scripts (decide keep/remove/convert)
   - Remove Sequelize dependencies
   - Remove config files
   - Update documentation

---

**Last Updated:** 2025-01-XX

