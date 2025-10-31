# Quick Migration Checklist

Use this checklist for each API route file you migrate.

## Pre-Migration
- [ ] Open the file to migrate
- [ ] Identify all Sequelize models used
- [ ] Identify all `Op` operators used

## Step 1: Update Imports
```typescript
// REMOVE:
import { Model1, Model2 } from "@/models";
import { Op } from "sequelize";

// ADD:
import { getXxx, createXxx, updateXxx } from "@/lib/data/xxx";
```

## Step 2: Find & Replace Operations

### Single Record
- [ ] `Model.findByPk(id)` → `getXxxById(id)`
- [ ] `Model.findOne({ where: {...} })` → `getXxxByField(...)`

### Multiple Records
- [ ] `Model.findAll({ where: {...} })` → `getXxx(...)` or `getXxxPaginated(...)`
- [ ] `Model.findAndCountAll()` → `getXxxPaginated(...)`

### Create/Update/Delete
- [ ] `Model.create({...})` → `createXxx({...})`
- [ ] `Model.update({...}, { where: {...} })` → `updateXxx(id, {...})`
- [ ] `Model.destroy({ where: {...} })` → `deleteXxx(id)`

## Step 3: Field Name Conversions

Common conversions to check:
- [ ] `firstName` → `first_name`
- [ ] `lastName` → `last_name`
- [ ] `organizationId` → `organization_id`
- [ ] `userId` → `user_id`
- [ ] `leadId` → `lead_id`
- [ ] `createdAt` → `created_at`
- [ ] `updatedAt` → `updated_at`
- [ ] All other camelCase → snake_case

## Step 4: Query Operators

Replace `Op` operators:
- [ ] `Op.eq` → `.eq()` (default, no Op needed)
- [ ] `Op.in` → `.in(...)`
- [ ] `Op.iLike` → `.ilike(...)`
- [ ] `Op.contains` → `.contains(...)`
- [ ] `Op.or` → Use filter object or `.or(...)`
- [ ] `Op.gt`, `Op.gte`, `Op.lt`, `Op.lte` → `.gt()`, `.gte()`, `.lt()`, `.lte()`

## Step 5: Includes/Joins

- [ ] Replace `include: [...]` with `getXxxWithRelations()` or `getXxxPaginated()`
- [ ] Check if relations are already included in data access functions

## Step 6: Pagination

- [ ] `findAndCountAll()` → `getXxxPaginated(orgId, page, limit, filters?, search?)`
- [ ] Update response format: `{ data: result.data, pagination: result }`

## Step 7: Error Handling

- [ ] Check for `null` returns (Supabase doesn't throw for not found)
- [ ] Update error handling if needed

## Step 8: Verify

- [ ] Run linter: `npm run lint` or check IDE
- [ ] Verify all imports resolve
- [ ] Check no Sequelize references remain
- [ ] Test endpoint if possible

## Common Patterns

### Pattern 1: Simple GET by ID
```typescript
// Before
const item = await Model.findByPk(id);

// After  
const item = await getXxxById(id);
```

### Pattern 2: GET with Filters
```typescript
// Before
const items = await Model.findAll({
  where: { orgId, status },
  order: [["createdAt", "DESC"]]
});

// After
const items = await getXxx(orgId); // if simple
// OR
const result = await getXxxPaginated(orgId, 1, 100, { status });
```

### Pattern 3: Create with Validation
```typescript
// Before
const config = await Config.findByPk(body.configId);
if (!config) return error;

const item = await Model.create({
  fieldName: body.fieldName,
  configId: body.configId
});

// After
const config = await getConfigById(body.configId);
if (!config || !config.is_active) return error;

const item = await createXxx({
  field_name: body.fieldName, // Note: snake_case
  config_id: body.configId
});
```

## Quick Field Reference

| CamelCase | Snake_case |
|-----------|------------|
| userId | user_id |
| organizationId | organization_id |
| leadId | lead_id |
| firstName | first_name |
| lastName | last_name |
| createdAt | created_at |
| updatedAt | updated_at |
| isActive | is_active |
| AnyOtherCamel | any_other_camel |

## Common Data Access Functions

### Leads
- `getLeadById(id)`
- `getLeadsPaginated(orgId, page, limit, filters?, search?)`
- `createLead(data)`
- `updateLead(id, updates)`
- `findLeadByEmail(email, orgId)`

### Users  
- `getUserById(id)`
- `getUserByEmail(email)`
- `createUser(data)`
- `updateUser(id, updates)`

### Organizations
- `getOrganizationById(id)`
- `getOrganizationBySlug(slug)`
- `createOrganization(data)`

### Activities
- `createActivity(data)`
- `getActivitiesByRelated(type, id)`

See `MIGRATION_PATTERN_GUIDE.md` for full details and examples.

