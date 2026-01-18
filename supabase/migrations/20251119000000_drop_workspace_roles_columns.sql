-- Drop columns from workspace_roles table
ALTER TABLE public.workspace_roles
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS hierarchy_level,
  DROP COLUMN IF EXISTS workspace_id;

