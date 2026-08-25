# Pricing and Subscription v1 Decision Record

**Status:** Accepted for implementation  
**Date:** 2026-08-12  
**Scope:** Step 1 of the pricing and subscription implementation plan

This document closes the product and architecture questions that must be
settled before the pricing database migration is created. Later implementation
steps must follow these decisions unless this record is explicitly revised.

## Confirmed Decisions

| Topic                                        | v1 decision                          | Implementation rule                                                                                                                  |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Existing paid workspaces                     | Assign the `launch` plan             | An active paid seat is the migration signal.                                                                                         |
| Internal, partner, or promotional workspaces | Assign the `growth` plan             | An active module entitlement is the migration signal when the workspace has no paid seat.                                            |
| Workspaces without existing access           | Assign `free_forever`                | Every workspace receives an explicit plan; runtime fallback plans are forbidden.                                                     |
| Trial scope                                  | One workspace-wide 14-day trial      | All selected modules start and expire together. A workspace can use the trial only once.                                             |
| Trial plan                                   | `growth`                             | Trial modules receive Growth entitlements for the trial period.                                                                      |
| Bundle billing                               | Backend-calculated invoice items     | Bundle and mixed-plan prices are calculated and snapshotted by Leadgaze; Razorpay only collects the final invoice amount.            |
| Catalog administration                       | Seeded migrations for v1             | A super-admin pricing editor is outside the v1 scope.                                                                                |
| Payment provider rollout                     | Razorpay collection only             | Leadgaze owns packages, seats, discounts, periods, renewal, and expiry. Razorpay creates invoice/payment links and collects payment. |
| Billing Owner                                | The account in `workspaces.owner_id` | Billing mutations require an authenticated workspace owner. A separate Billing Owner role is outside v1 scope.                       |
| Billing-cycle key                            | `yearly`                             | The database and API retain the existing enum value. The UI may label it “Annual.”                                                   |
| Service product key                          | `service_cloud`                      | Contracts use the stable key already stored in `subscription_products`.                                                              |

## Billing Data Ownership

Provider catalog identifiers and workspace billing identifiers must not share a
table because they have different owners and lifecycles.

| Data                            | Owner                       | Step 2 table                    |
| ------------------------------- | --------------------------- | ------------------------------- |
| Backend plan and price          | Module-plan price or bundle | `module_plan_prices`, `bundles` |
| Invoice and immutable amount    | Workspace billing invoice   | `backend_billing_invoices`      |
| Scheduled paid/free seat change | Workspace and module        | `backend_seat_changes`          |
| Processed provider event ID     | Razorpay webhook            | Existing `payment_events`       |

Razorpay plan, package, price, and subscription IDs are not used. Provider IDs
on backend invoices are collection references only. Backend billing tables
include `workspace_id`, idempotency constraints, RLS, and audit timestamps.

## Permission Contract

The current RBAC model stores module and feature keys separately. The dotted
permission names below are shorthand for those two fields.

| Permission             | Stored RBAC pair           | Intended access            | Protects                                                                                  |
| ---------------------- | -------------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `subscription.view`    | `subscription` + `view`    | Accepted workspace members | Plan, trial, usage, and pending-change visibility                                         |
| `subscription.manage`  | `subscription` + `manage`  | Workspace administrators   | Module-user assignment and operational subscription management                            |
| `subscription.billing` | `subscription` + `billing` | Workspace owner only       | Checkout, plan/billing-cycle changes, module purchase/removal, cancellation, and invoices |

Billing endpoints must perform both the RBAC check and an explicit
`workspaces.owner_id` check. The ownership check remains authoritative if a
custom role is accidentally granted the billing feature.

Step 2 will add or normalize these feature rows and their default role grants.
Step 5 will enforce the permission helpers at every subscription API boundary.

## API Contract

The executable Zod schemas and inferred TypeScript types are defined in
`apps/web/lib/subscriptions/contracts.ts`.

| Endpoint                                 | Validated input                                          | Response data                                                                   | Permission             |
| ---------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| `GET /api/pricing`                       | No input                                                 | Active modules, plans, prices, bundles, feature highlights, and yearly discount | Public                 |
| `GET /api/subscriptions/plans`           | `workspaceId`                                            | Workspace status, trial, module plans, amounts, users, and pending changes      | `subscription.view`    |
| `POST /api/subscriptions/trial/start`    | `workspaceId`, unique `selectedModules`                  | Trial dates, Growth plan, and selected modules                                  | `subscription.billing` |
| `GET /api/subscriptions/usage`           | `workspaceId`, `moduleKey`                               | Feature limits, current usage, and warning states                               | `subscription.view`    |
| `POST /api/subscriptions/upgrade`        | `workspaceId`, `moduleKey`, `newPlanKey`, `billingCycle` | Immediately applied plan change                                                 | `subscription.billing` |
| `POST /api/subscriptions/downgrade`      | `workspaceId`, `moduleKey`, `newPlanKey`                 | Pending plan change and effective date                                          | `subscription.billing` |
| `GET /api/subscriptions/module-users`    | `workspaceId`, `moduleKey`                               | Assigned module users                                                           | `subscription.manage`  |
| `POST /api/subscriptions/module-users`   | `workspaceId`, `moduleKey`, `userId`                     | Active module-user assignment                                                   | `subscription.manage`  |
| `DELETE /api/subscriptions/module-users` | `workspaceId`, `moduleKey`, `userId`                     | Removed module-user assignment                                                  | `subscription.manage`  |

All new controllers must validate request bodies, route parameters, and query
parameters with the exported schemas. They must return the shared success or
error envelope and delegate business logic to services or transactional RPCs.

## Compatibility and Safety Rules

- All schema changes are additive during the v1 rollout.
- Existing seat and entitlement tables remain intact until a separate removal
  plan is approved.
- Existing provider identifiers remain historical data; new billing activity
  uses backend invoices and Razorpay collection links only.
- The server and database are the enforcement boundary; frontend gates provide
  user guidance only.
- Payment webhooks are idempotent through the existing `payment_events` log.
- Every tenant-owned billing query validates `workspace_id` and membership.
- API timestamps are UTC ISO 8601 strings.
- Currencies are uppercase ISO 4217 codes.
- Money is stored as database decimals and serialized as JSON numbers at the API
  boundary.

## Completion Gate

- [x] Existing-workspace plan assignment is decided.
- [x] Trial scope and duration are decided.
- [x] Bundle pricing mechanics are decided.
- [x] Admin configuration UI scope is decided.
- [x] Payment-provider scope is decided.
- [x] Provider catalog and workspace billing data are separated.
- [x] API request and response contracts are defined.
- [x] Subscription permissions and Billing Owner enforcement are defined.
