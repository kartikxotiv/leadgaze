/*
 * -------------------------------------------------------
 * Migration: Add product_key to crm_modules and backfill
 * Date: 2026-06-10
 * Description: Adds product_key column to crm_modules table and
 *   populates it based on module naming conventions so that
 *   modules can be filtered by product without relying on
 *   product_module_map bridge table.
 * -------------------------------------------------------
 */

-- 1. Add product_key column to crm_modules
ALTER TABLE public.crm_modules
  ADD COLUMN IF NOT EXISTS product_key VARCHAR(50) DEFAULT 'sales';

COMMENT ON COLUMN public.crm_modules.product_key IS
  'Product/module group this module belongs to (sales, hrms, inventory, service_cloud, funds, common)';

-- 2. Backfill product_key based on module_key naming conventions

-- Common/shared modules (available across all products)
UPDATE public.crm_modules
SET product_key = 'common'
WHERE module_key IN ('roles', 'audit_logs', 'activities', 'team_members', 'settings', 'reports', 'emails');

-- HRMS modules
UPDATE public.crm_modules
SET product_key = 'hrms'
WHERE module_key LIKE 'hrms_%';

-- Inventory modules
UPDATE public.crm_modules
SET product_key = 'inventory'
WHERE module_key LIKE 'inventory%';

-- Service Cloud modules
UPDATE public.crm_modules
SET product_key = 'service_cloud'
WHERE module_key LIKE 'service_cloud%';

-- Fundraising modules
UPDATE public.crm_modules
SET product_key = 'funds'
WHERE module_key LIKE 'fundraising%';

-- Sales-specific modules (leads, contacts, accounts, opportunities stay as sales)
-- Everything else that doesn't match above patterns stays as 'sales' (default)

-- 3. Add index for product_key filtering
CREATE INDEX IF NOT EXISTS idx_crm_modules_product_key
  ON public.crm_modules(product_key);

-- 4. Ensure product_module_map is populated (fallback if previous migration didn't run)
--    Each product gets its own modules PLUS common/shared modules
DO $$
DECLARE
  v_product_id UUID;
  v_module_id UUID;
BEGIN
  -- For each product, map product-specific modules + common modules
  FOR v_product_id, v_module_id IN
    SELECT sp.id, cm.id
    FROM subscription_products sp
    CROSS JOIN crm_modules cm
    WHERE sp.is_active = true
      AND cm.is_active = true
      AND (cm.product_key = sp.product_key OR cm.product_key = 'common')
  LOOP
    INSERT INTO product_module_map (product_id, crm_module_id, access_mode)
    VALUES (v_product_id, v_module_id, 'full')
    ON CONFLICT (product_id, crm_module_id) DO NOTHING;
  END LOOP;
END $$;
