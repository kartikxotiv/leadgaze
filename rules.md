# PROJECT ENGINEERING RULES & DEVELOPMENT GUIDELINES

## Purpose

This document defines the mandatory engineering standards, coding rules, architecture constraints, database practices, frontend practices, API conventions, and development workflows for the entire project.

These rules are STRICT and must always be followed while implementing any feature.

The purpose of these rules is to ensure:

- Long-term maintainability
- AI-friendly development
- Consistent architecture
- High performance
- Robust scalability
- Predictable code structure
- Low technical debt
- Clean developer experience
- Future-proof implementation

This document acts as the engineering constitution for the project.

---

# CORE DEVELOPMENT PRINCIPLES

## Rule 1 — Strictly Follow Project Structure

The existing project structure, architecture, naming conventions, and separation of concerns MUST always be followed.

DO NOT:

- randomly create folders
- randomly create utilities
- duplicate patterns
- create inconsistent abstractions
- bypass architecture boundaries

Always align with the existing monorepo architecture.

---

## Rule 2 — Reuse Existing Code First

Before implementing ANY new feature:

- analyze the existing codebase
- search for existing utilities
- search for existing hooks
- search for existing services
- search for existing components
- search for existing schemas
- search for existing validations
- search for existing API patterns

If functionality already exists:

- reuse it
- extend it carefully
- avoid duplicate implementations

Never reinvent existing project functionality.

---

## Rule 3 — Performance First Engineering

All code must be:

- optimized
- scalable
- memory efficient
- query efficient
- reusable
- maintainable

Avoid:

- unnecessary re-renders
- duplicate queries
- unnecessary loops
- deeply nested logic
- heavy computations in render cycles
- unoptimized database queries

Always think long-term scalability.

---

## Rule 4 — Strong Type Safety

Strict TypeScript must always be followed.

NEVER:

```ts
any;
```

unless absolutely unavoidable.

If unavoidable:

- add explanation comment
- isolate usage
- create TODO for future fix

Always:

- define proper interfaces
- define proper DTOs
- define reusable types
- infer types safely
- use Zod schemas where possible

---

## Rule 5 — database.types.ts Is Source Of Truth

Always use:

```ts
database.types.ts;
```

for database schema typing.

Frontend and backend must remain aligned with database schema types.

DO NOT:

- redefine DB types manually
- create duplicate schema interfaces
- hardcode table structures

All database models should derive from generated database types.

---

# PROJECT STRUCTURE RULES

## Recommended Folder Structure

```text
apps/
  web/

packages/
  features/
    accounts/
    auth/
  i18n/
  next/
  shared/
  supabase/
  ui/
tooling/
  eslint/
  prettier/
  scripts/
  typescript/
```

---

# FILE SIZE RULES

## Rule 1 — page.ts / index.ts Limits

The following files MUST NOT exceed:

```text
300 lines
```

Examples:

- page.tsx
- index.ts
- route.ts
- layout.tsx

If file grows beyond limit:

- split components
- extract hooks
- extract services
- extract helpers
- extract UI sections

---

## Rule 2 — controller.ts Limits

Controller files MUST NOT exceed:

```text
500 lines
```

If controller becomes too large:

- split by domain
- split by workflow
- extract services
- extract validators
- extract repositories

---

## Rule 3 — Component Complexity

React components should:

- remain focused
- remain reusable
- avoid business logic
- avoid large inline functions

Complex logic belongs in:

- hooks
- services
- utilities

---

# API DEVELOPMENT RULES

## Rule 1 — Proper Route Structure

Every API must use:

```text
route.ts
controller.ts
```

Example:

```text
api/leads/
  route.ts
  controller.ts
```

---

## Rule 2 — Controller Separation

Controller files should ONLY contain logic for routes defined in the same folder.

DO NOT:

- mix unrelated route controllers
- create giant shared controllers
- place unrelated APIs together

If needed:

- create separate route folders
- create separate controller files

---

## Rule 3 — RPC Functions Preferred For Heavy DB Work

If API performs:

- multiple joins
- multiple queries
- aggregations
- transactional operations
- reporting queries
- complex filters

Then PostgreSQL RPC functions are recommended.

This improves:

- performance
- query optimization
- response times
- transaction consistency
- database-side execution

---

## Rule 4 — Thin Controllers

Controllers should:

- validate request
- call services
- return response

Controllers should NOT:

- contain heavy business logic
- contain database query chains
- contain validation logic inline

Business logic belongs in services.

---

## Rule 5 — Proper API Validation

All APIs must use:

- Zod validation
- request schema validation
- response typing
- proper error handling

Never trust incoming request data.

---

# DATABASE ENGINEERING RULES

## Rule 1 — RLS Policies Mandatory

Every table MUST contain RLS policies.

Example:

```sql
CREATE POLICY "admin_all_notifications"
ON public.notifications
FOR ALL
USING (true)
WITH CHECK (true);
```

No table should exist without RLS.

---

## Rule 2 — Grant Permissions Mandatory

After creating table:

Always grant access.

Example:

```sql
GRANT ALL ON public.workspace_team_members
TO service_role, authenticated, anon;
```

---

## Rule 3 — Proper Indexing Required

Indexes MUST be added wherever required.

Always analyze:

- filtering columns
- joins
- tenant_id
- status
- created_at
- foreign keys
- search columns

Use:

- composite indexes
- partial indexes
- unique indexes

where appropriate.

---

## Rule 4 — Migration Quality

Migration files must:

- be clean
- be deterministic
- avoid unsafe drops
- avoid destructive changes
- include indexes
- include RLS
- include grants
- include constraints

---

## Rule 5 — Database Naming Conventions

Use:

```text
snake_case
plural table names
singular column names
```

Examples:

```text
leads
contacts
opportunities
```

---

## Rule 6 — Avoid JSON Abuse

Prefer normalized tables.

Use JSONB ONLY for:

- metadata
- extensibility
- plugin support
- custom fields

Never use JSON as replacement for relational modeling.

---

# FRONTEND ENGINEERING RULES

## Rule 1 — No Direct Fetch Calls

DO NOT:

```ts
fetch();
```

inside components.

DO NOT:

- call APIs inside useEffect
- manually manage API loading everywhere

---

## Rule 2 — Use TanStack Query

All API communication should use:

- TanStack Query
- centralized query hooks
- centralized mutations

Benefits:

- caching
- retries
- invalidation
- deduplication
- optimistic updates
- loading states

---

## Rule 3 — Use Centralized Axios Client

Always use:

```ts
axios - client;
```

Do NOT:

- create random axios instances
- create fetch wrappers everywhere
- duplicate API clients

---

## Rule 4 — No Hardcoded Colors

Never use:

```tsx
#FFFFFF
#000000
rgb(...)
```

inside components.

All colors must:

- use Tailwind classes
- come from theme config
- remain design-system driven

---

## Rule 5 — Theme Consistency

All frontend implementation must:

- follow existing theme
- follow spacing system
- follow typography system
- follow component structure
- follow UI patterns

Do NOT introduce inconsistent UI styles.

---

## Rule 6 — Form Standards

All forms must use:

- react-hook-form
- zod validation
- reusable form components
- centralized error handling

Never create uncontrolled validation systems.

---

# REACT ENGINEERING RULES

## Rule 1 — Avoid Heavy useEffect Usage

Avoid using:

```ts
useEffect;
```

for:

- API fetching
- derived state
- synchronization logic

Prefer:

- TanStack Query
- memoization
- computed state
- server components

---

## Rule 2 — Keep Components Declarative

Components should:

- remain UI-focused
- avoid imperative flows
- avoid business orchestration

Business orchestration belongs in:

- services
- hooks
- workflows

---

## Rule 3 — Shared Components First

Before creating new component:

- check existing UI library
- check reusable components
- check design system

Avoid duplicate UI patterns.

---

# CODE CLEANLINESS RULES

## Rule 1 — No Console Logs

Do NOT leave:

```ts
console.log();
```

inside project.

If absolutely necessary:

Add TODO comment above it.

Example:

```ts
// TODO: Required temporarily for payment debugging.
console.log(response);
```

---

## Rule 2 — Avoid Commented Out Code

Do NOT leave dead/commented code.

If temporary preservation is necessary:

Add TODO comment.

Example:

```ts
// TODO: Preserve temporarily until migration v2 rollout completes.
```

---

## Rule 3 — Clean Imports

Avoid:

- unused imports
- duplicate imports
- wildcard chaos

Always organize imports properly.

---

## Rule 4 — Naming Consistency

Use meaningful names.

Avoid:

```ts
x;
data2;
temp;
abc;
```

Prefer:

```ts
leadAssignment;
contactUpdatePayload;
opportunityPipelineSummary;
```

---

# VALIDATION RULES

## Backend Validation

All APIs/services must validate:

- request body
- params
- query strings
- database payloads

using:

- Zod
- typed schemas

---

## Frontend Validation

Forms must:

- validate before submission
- show proper error messages
- maintain typed form state

---

# TRANSACTION RULES

## Critical Workflows Must Use Transactions

Examples:

- lead assignment
- opportunity stage updates
- workspace member invitations
- email sync updates
- subscription activation

Use database transactions for consistency.

---

# SECURITY RULES

## Rule 1 — Tenant Isolation Mandatory

Every query must respect:

```text
tenant_id
```

Never expose cross-tenant data.

---

## Rule 2 — Validate Permissions

Always validate:

- authentication
- tenant membership
- feature access
- role access

before business execution.

---

## Rule 3 — Never Trust Client Input

Always validate and sanitize:

- user input
- query params
- uploaded data
- external payloads

---

# AI-ASSISTED DEVELOPMENT RULES

## Rule 1 — AI-Friendly Architecture

Code should remain:

- predictable
- explicit
- convention-based
- modular
- understandable

Avoid:

- magic abstractions
- hidden side effects
- overly clever patterns
- excessive meta programming

---

## Rule 2 — Consistency Over Cleverness

Prefer:

- predictable code
- maintainable code
- explicit logic

over fancy abstractions.

---

## Rule 3 — Maintain Clear Boundaries

Always maintain:

- service boundaries
- package boundaries
- UI boundaries
- database boundaries

Never mix responsibilities.

---

# GIT & DEVELOPMENT WORKFLOW RULES

## Rule 1 — Small Focused Changes

Commits should:

- remain focused
- remain atomic
- avoid giant unrelated changes

---

## Rule 2 — No Breaking Existing Features

Before implementing new feature:

- verify existing functionality
- ensure backward compatibility
- avoid regressions

---

## Rule 3 — Preserve Reusability

Every implementation should consider:

- future package reuse
- future SaaS expansion
- future integrations
- future scalability

---

# FINAL ENGINEERING PRINCIPLE

The project should always prioritize:

- simplicity
- scalability
- maintainability
- consistency
- performance
- developer experience
- AI-assisted development friendliness

The goal is to build a:

- reusable
- enterprise-ready
- modular
- scalable
- clean
- future-proof

platform without introducing unnecessary complexity.