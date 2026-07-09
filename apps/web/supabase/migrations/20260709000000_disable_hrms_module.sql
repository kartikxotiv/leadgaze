-- Disable HRMS product so it won't be offered or assigned by default
UPDATE public.subscription_products
SET is_active = false
WHERE product_key = 'hrms';

-- Disable HRMS modules
UPDATE public.crm_modules
SET is_active = false
WHERE module_key = 'hrms' OR module_key LIKE 'hrms_%';

-- Delete existing seats for HRMS
DELETE FROM public.workspace_module_seats
WHERE product_id IN (
  SELECT id FROM public.subscription_products WHERE product_key = 'hrms'
);

-- Delete HRMS specific workspace members
DELETE FROM public.workspace_members
WHERE product_key = 'hrms';

-- Delete HRMS specific workspace roles
DELETE FROM public.workspace_roles
WHERE product_key = 'hrms';
