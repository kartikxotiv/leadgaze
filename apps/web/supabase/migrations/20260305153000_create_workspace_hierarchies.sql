/*
 * -------------------------------------------------------
 * Migration: Create Workspace Hierarchies Table
 * Date: 2026-03-05
 * Description: Creates the hierarchy levels for workspaces and links them to roles
 * -------------------------------------------------------
 */
-- Create workspace_hierarchies table
CREATE TABLE IF NOT EXISTS public.workspace_hierarchies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT workspace_hierarchies_unique UNIQUE (workspace_id, name)
);
-- Enable RLS
ALTER TABLE public.workspace_hierarchies ENABLE ROW LEVEL SECURITY;
-- RLS Policies
CREATE POLICY workspace_hierarchies_read ON public.workspace_hierarchies
    FOR SELECT TO authenticated
    USING (
        true
    );
CREATE POLICY workspace_hierarchies_write ON public.workspace_hierarchies
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- Permissions
GRANT ALL ON public.workspace_hierarchies TO authenticated, service_role;
GRANT ALL ON public.workspace_hierarchies TO service_role;
-- Add hierarchy_id to workspace_roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'workspace_roles'
        AND COLUMN_NAME = 'hierarchy_id'
        AND TABLE_SCHEMA = 'public'
    ) THEN
        ALTER TABLE public.workspace_roles
        ADD COLUMN hierarchy_id UUID REFERENCES public.workspace_hierarchies(id) ON DELETE SET NULL;
    END IF;
END $$;
-- Update existing roles with a default hierarchy if needed (optional, depends on app logic)
-- For now, we leave it null as the API will handle seeding and linking for new workspaces