/*
 * -------------------------------------------------------
 * Migration: Add product_key to workspace_members
 * Date: 2026-07-03
 * Description:
 *   Adds module scoping to workspace_members table to support
 *   users having different roles in different modules within
 *   the same workspace.
 *
 *   This allows a single user to have:
 *   - One role in Sales module
 *   - One role in Service module  
 *   - One role in HRMS module
 *   - etc.
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. Add product_key column to workspace_members
-- =====================================================

ALTER TABLE public.workspace_members
ADD COLUMN product_key VARCHAR(80);

-- =====================================================
-- 2. Add foreign key reference to subscription_products
--    (optional, for modules with product-based roles)
-- =====================================================

ALTER TABLE public.workspace_members
ADD COLUMN product_id UUID REFERENCES public.subscription_products(id) ON DELETE SET NULL;

-- =====================================================
-- 3. Update the UNIQUE constraint
--    Old: (workspace_id, user_id)
--    New: (workspace_id, user_id, product_key)
-- =====================================================

-- First, drop the existing constraint
ALTER TABLE public.workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_unique;

-- Add new constraint that enforces one role per user per module per workspace
ALTER TABLE public.workspace_members
ADD CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id, product_key);

-- =====================================================
-- 4. Create index for efficient queries by module
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_product 
ON public.workspace_members(workspace_id, product_key, status)
WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_product 
ON public.workspace_members(user_id, product_key)
WHERE status = 'accepted';

-- =====================================================
-- 5. Create migration index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_product 
ON public.workspace_members(workspace_id, product_key);

-- =====================================================
-- 6. Update RLS policies to support module-scoped access
-- =====================================================

-- Drop existing RLS policies
DROP POLICY IF EXISTS workspace_members_select ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_insert ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_update ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_delete ON public.workspace_members;

-- New RLS policies (simplified to avoid infinite recursion)
-- Module scoping is handled by the product_key column in the data, not the RLS policy
CREATE POLICY workspace_members_select ON public.workspace_members FOR SELECT TO authenticated
USING (true);

-- INSERT: Service role only for initial creation. No authenticated users can insert directly.
CREATE POLICY workspace_members_insert ON public.workspace_members FOR INSERT TO service_role WITH CHECK (true);

-- UPDATE: Service role only
CREATE POLICY workspace_members_update ON public.workspace_members FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- DELETE: Service role only
CREATE POLICY workspace_members_delete ON public.workspace_members FOR DELETE TO service_role USING (true);

-- =====================================================
-- 7. Revoke and grant permissions
-- =====================================================

REVOKE ALL ON public.workspace_members FROM authenticated, service_role;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role, authenticated, anon;

-- =====================================================
-- 8. Add comments
-- =====================================================

COMMENT ON COLUMN public.workspace_members.product_key IS 'The module/product key this membership applies to (e.g., sales, service_cloud, hrms). If NULL, applies to all modules.';
COMMENT ON COLUMN public.workspace_members.product_id IS 'The subscription product ID this membership is tied to (for seat-based access control).';
