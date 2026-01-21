-- Make created_by column nullable in workspace_roles table
ALTER TABLE public.workspace_roles ALTER COLUMN created_by DROP NOT NULL;
