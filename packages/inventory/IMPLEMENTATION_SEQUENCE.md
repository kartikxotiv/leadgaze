# Inventory Implementation Sequence

This document defines the recommended build order for the `@kit/inventory` module so we can implement it in a clean sequence, avoid dependency conflicts, and track what is done versus what is still pending.

It is intentionally module-first, because inventory has many linked workflows and several modules depend on earlier master data being stable.

## Current Status

- [x] Inventory feature scope documented in `Features.md`
- [x] Initial database migrations created under `src/migrations`
- [ ] Package folder structure fully scaffolded to match `fund-raise`
- [ ] App routes and API routes installed
- [ ] Generated database types refreshed after migrations are applied

## Build Order Summary

1. Foundation and package scaffolding
2. Inventory RBAC and navigation wiring
3. Master data: units, categories, brands
4. Warehouses
5. Products and product media
6. Vendors and vendor contacts
7. Customers and customer contacts
8. Purchase flow: requisitions, purchase orders, goods receipts
9. Stock engine: stock levels, stock movements, batches, serials
10. Sales inventory integration: sales orders and reservations
11. Stock transfers
12. Inventory audits and reconciliation
13. Dashboard, reports, alerts, and final polish

## Dependency Map

- `workspaces`, `accounts`, `workspace_roles`, `role_permissions`, `crm_modules`, and `crm_module_features` are shared platform dependencies.
- `units`, `product_categories`, and `brands` should exist before full product management.
- `products` depend on `units`, and usually benefit from `categories` and `brands`.
- `warehouses` should exist before stock movements, receipts, transfers, reservations, and audits.
- `vendors` should exist before purchase requisitions and purchase orders.
- `customers` should exist before sales orders and customer-facing stock reservations.
- `purchase_orders` should exist before `goods_receipts`.
- `goods_receipts` feed `stock_batches`, `serial_numbers`, `stock_levels`, and `stock_movements`.
- `sales_orders` and `stock_reservations` depend on `products`, `warehouses`, `customers`, and available stock.
- `stock_transfers` depend on warehouses, products, and stock availability.
- `stock_audits` depend on products, warehouses, and stock records.
- Dashboard and reports should come after the core transactions are stable.

## Module Sequence

### 1. Foundation and Package Scaffolding

Status: Pending

Why first:
- Everything else depends on shared package structure and common utilities.

What to build:
- `src/apis`
- `src/pages`
- `src/services`
- `src/utils`
- `src/migrations`
- `src/index.ts`
- package-level exports in `index.ts`
- optional `INSTALLATION.md`
- optional route installer script if we want parity with `fund-raise`

Definition of done:
- `inventory` package mirrors `fund-raise` folder structure
- barrel exports are clean
- shared API client and response helpers exist
- no placeholder-only package exports remain

### 2. Inventory RBAC and Navigation Wiring

Status: Partially done

Already done:
- inventory modules and features were added in the RBAC migration

What remains:
- permission utility in package
- navigation/sidebar helpers
- app sidebar integration
- route-level permission checks

Definition of done:
- inventory navigation only appears for roles with access
- API controllers check workspace membership and feature access
- frontend respects feature-level visibility

### 3. Master Data: Units, Categories, Brands

Status: Migration done, code pending

Tables:
- `inventory.units`
- `inventory.product_categories`
- `inventory.brands`

Why early:
- These are base entities for products and reporting filters.

Suggested implementation order:
1. Units
2. Categories
3. Brands

Definition of done:
- CRUD APIs
- service layer
- query hooks
- list and create/edit UI
- permission checks

### 4. Warehouses

Status: Migration done, code pending

Tables:
- `inventory.warehouses`

Why now:
- Stock, purchase receiving, transfers, and audits all depend on warehouses.

Definition of done:
- warehouse CRUD
- warehouse manager support
- default warehouse handling
- warehouse list page and forms

### 5. Products and Product Media

Status: Migration done, code pending

Tables:
- `inventory.products`
- `inventory.product_media`

Depends on:
- units
- categories
- brands

Why before stock:
- Inventory transactions need a stable product master first.

Definition of done:
- product CRUD
- archive/clone flow
- pricing fields
- stock control fields
- barcode/QR fields
- media upload metadata handling

### 6. Vendors and Vendor Contacts

Status: Migration done, code pending

Tables:
- `inventory.vendors`
- `inventory.vendor_contacts`

Why before purchasing:
- Purchase orders and receiving workflows depend on supplier data.

Definition of done:
- vendor CRUD
- vendor contacts CRUD
- vendor selection support in purchasing forms

### 7. Customers and Customer Contacts

Status: Migration done, code pending

Tables:
- `inventory.customers`
- `inventory.customer_contacts`

Why before sales:
- Sales orders, dispatch, and customer-specific reservations should depend on a dedicated customer master rather than CRM-only entities.

Definition of done:
- customer CRUD
- customer contacts CRUD
- customer selector support in sales forms

### 8. Purchase Flow

Status: Migration done, code pending

Tables:
- `inventory.purchase_requisitions`
- `inventory.purchase_requisition_items`
- `inventory.purchase_orders`
- `inventory.purchase_order_items`
- `inventory.goods_receipts`
- `inventory.goods_receipt_items`

Depends on:
- vendors
- products
- units
- warehouses

Recommended implementation order:
1. Purchase requisitions
2. Purchase orders
3. Goods receipts

Definition of done:
- requisition to PO conversion flow
- PO approval flow
- partial/full receipt support
- receipt UI updates stock-related records correctly

### 9. Stock Engine

Status: Migration done, code pending

Tables:
- `inventory.stock_levels`
- `inventory.stock_movements`
- `inventory.stock_batches`
- `inventory.serial_numbers`

Depends on:
- products
- warehouses
- goods receipts

Why this is critical:
- This becomes the operational source for on-hand, reserved, incoming, outgoing, and traceability data.

Implementation notes:
- `stock_movements` should be treated like the immutable ledger
- `stock_levels` should be treated like the fast current snapshot
- batches and serials should be optional based on product flags

Definition of done:
- receiving stock creates movement and updates stock levels
- manual adjustments create movement and update stock levels
- batch and serial tracking works when enabled

### 10. Sales Inventory Integration

Status: Migration done, code pending

Tables:
- `inventory.sales_orders`
- `inventory.sales_order_items`
- `inventory.stock_reservations`

Depends on:
- products
- warehouses
- stock availability
- customer master: `inventory.customers`, `inventory.customer_contacts`
- optional external source references if sales orders originate from another module

Why after stock engine:
- reservation and fulfillment logic must sit on top of stable stock calculations.

Definition of done:
- sales order CRUD
- reserve/release stock flow
- fulfillment and dispatch states
- customer linkage works safely per workspace
- optional source-reference linkage remains generic, not CRM-coupled

### 11. Stock Transfers

Status: Migration done, code pending

Tables:
- `inventory.stock_transfers`
- `inventory.stock_transfer_items`

Depends on:
- warehouses
- products
- stock engine

Definition of done:
- transfer request
- approval flow
- dispatch and receive flow
- stock moves out of source and into destination correctly

### 12. Inventory Audits and Reconciliation

Status: Migration done, code pending

Tables:
- `inventory.stock_audits`
- `inventory.stock_audit_items`

Depends on:
- products
- warehouses
- stock levels

Definition of done:
- audit creation
- physical count entry
- variance calculation
- reconciliation flow that creates stock adjustments safely

### 13. Dashboard, Reports, Alerts, and Polish

Status: Pending

Depends on:
- stable transaction flows
- stock engine
- purchase flow
- sales flow
- audit flow

What belongs here:
- inventory dashboard widgets
- report pages
- low stock / out-of-stock / expiry alerts
- top-selling and movement summaries
- exports
- UI polishing and performance review

Definition of done:
- dashboard reflects real inventory data
- reports are backed by efficient queries or RPCs where needed
- alerts are derived from stock and expiry rules

## Suggested Delivery Milestones

### Milestone 1

- package scaffolding
- RBAC utility
- units
- categories
- brands
- warehouses

### Milestone 2

- products
- product media
- vendors
- vendor contacts
- customers
- customer contacts

### Milestone 3

- purchase requisitions
- purchase orders
- goods receipts

### Milestone 4

- stock levels
- stock movements
- batches
- serial numbers

### Milestone 5

- sales orders
- reservations
- transfers

### Milestone 6

- audits
- dashboard
- reports
- alerts

## Tracking Checklist

### Foundation

- [ ] Package folders scaffolded
- [ ] `package.json` exports aligned with actual files
- [ ] shared utilities added
- [ ] installation notes added

### Access and Navigation

- [x] RBAC migration created
- [ ] frontend permission helpers added
- [ ] navigation config added
- [ ] API permission checks added

### Master Data

- [x] tables created
- [ ] APIs created
- [ ] services created
- [ ] pages created

### Purchasing

- [x] tables created
- [ ] requisition flow coded
- [ ] purchase order flow coded
- [ ] goods receipt flow coded

### Stock

- [x] tables created
- [ ] movement engine coded
- [ ] stock level sync coded
- [ ] batch flow coded
- [ ] serial flow coded

### Sales Integration

- [x] tables created
- [ ] customer flow coded
- [ ] sales order flow coded
- [ ] reservations coded
- [ ] dispatch flow coded

### Transfers and Audits

- [x] tables created
- [ ] transfer flow coded
- [ ] audit flow coded
- [ ] reconciliation flow coded

### Reporting

- [ ] dashboard coded
- [ ] reports coded
- [ ] alerts coded
- [ ] exports coded

## Recommended Rule While Building

For each module, follow this sequence:

1. Apply migration and refresh DB types
2. Create service layer
3. Create controller layer
4. Create route wiring
5. Create query/mutation hooks
6. Create UI pages and forms
7. Add permission checks
8. Test end-to-end before moving to the next module

This keeps the package aligned with `rules.md`, avoids orphaned UI, and makes progress measurable.
