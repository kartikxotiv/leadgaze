/*
 * -------------------------------------------------------
 * Migration: Refactor Workspace Hierarchies
 * Date: 2026-03-31
 * Description: Drops workspace_hierarchies table and hierarchy_id from workspace_roles
 * -------------------------------------------------------
 */

-- Drop the hierarchy_id column from workspace_roles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'workspace_roles'
        AND COLUMN_NAME = 'hierarchy_id'
        AND TABLE_SCHEMA = 'public'
    ) THEN
        ALTER TABLE public.workspace_roles DROP COLUMN hierarchy_id;
    END IF;
END $$;

-- Drop the workspace_hierarchies table entirely
DROP TABLE IF EXISTS public.workspace_hierarchies CASCADE;


-- Drop `is_public` visibility feature from CRM modules since data access is now strictly handled via hierarchy_level

ALTER TABLE public.crm_leads DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.crm_accounts DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.crm_contacts DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.crm_opportunities DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.crm_meetings DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.crm_activities DROP COLUMN IF EXISTS is_public;
