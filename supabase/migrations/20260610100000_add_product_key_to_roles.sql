/*
 * -------------------------------------------------------
 * Migration: Add product_key to workspace_roles
 * Date: 2026-06-10
 * Description: Scopes roles to specific products (sales, hrms, inventory,
 *   service_cloud, funds) so each module has its own role hierarchy.
 * -------------------------------------------------------
 */

-- 1. Add product_key column to workspace_roles
ALTER TABLE public.workspace_roles
  ADD COLUMN IF NOT EXISTS product_key VARCHAR(50) NOT NULL DEFAULT 'sales';

COMMENT ON COLUMN public.workspace_roles.product_key IS
  'Product/module this role belongs to (sales, hrms, inventory, service_cloud, funds)';

-- 2. Drop old unique constraint and add product-scoped one
ALTER TABLE public.workspace_roles
  DROP CONSTRAINT IF EXISTS workspace_roles_unique;

ALTER TABLE public.workspace_roles
  ADD CONSTRAINT workspace_roles_product_unique
  UNIQUE (workspace_id, product_key, role_key);

-- 3. Add index for product_key filtering
CREATE INDEX IF NOT EXISTS idx_workspace_roles_product_key
  ON public.workspace_roles(product_key);

-- 4. Backfill: existing roles stay as 'sales' (the DEFAULT already applied).
--    System roles (admin/manager/user/viewer) that were seeded before this
--    migration keep product_key = 'sales', which is correct for existing
--    Sales-only workspaces. New products will create their own system roles.

-- 5. Update workspace creation trigger / controller note:
--    The application-layer workspace creation controller at
--    apps/web/app/api/workspaces/controller.ts must be updated to
--    include product_key when inserting roles.
