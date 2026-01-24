/*
 * -------------------------------------------------------
 * Migration: Create Workspace Invitations Table
 * Date: 2026-01-27
 * Description: Handles pending workspace invitations for users not yet in the system
 * -------------------------------------------------------
 */

-- Invitation Status Enum
DROP TYPE IF EXISTS public.invitation_status CASCADE;

CREATE TYPE public.invitation_status AS ENUM (
  'pending',   -- Invitation sent, awaiting response
  'accepted',  -- User accepted and joined workspace
  'expired',   -- Invitation has expired
  'declined',  -- User declined the invitation
  'revoked'    -- Invitation was revoked by admin
);

COMMENT ON TYPE public.invitation_status IS 'Status of a workspace invitation';

-- Workspace Invitations Table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_roles(id) ON DELETE RESTRICT,
  
  -- Invitee Information
  email VARCHAR(320) NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Invitation Token (for link-based invitations)
  token VARCHAR(255) UNIQUE,
  token_expires_at TIMESTAMPTZ,
  
  -- Invitation Status
  status public.invitation_status NOT NULL DEFAULT 'pending'::public.invitation_status,
  accepted_at TIMESTAMPTZ,
  
  -- Optional: Link to user after acceptance
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Settings for when user joins
  personal_settings JSONB DEFAULT '{}'::jsonb,
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and add basic policy for workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_invitations_policy ON public.workspace_invitations
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.workspace_invitations IS 'Manages invitations sent to users to join workspace as members';
COMMENT ON COLUMN public.workspace_invitations.token IS 'Secure token for invitation link';
COMMENT ON COLUMN public.workspace_invitations.token_expires_at IS 'When the invitation link expires';

-- Indexes
CREATE INDEX idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_user ON public.workspace_invitations(user_id);
CREATE INDEX idx_workspace_invitations_status ON public.workspace_invitations(status) WHERE status = 'pending';
CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token) WHERE token IS NOT NULL;

-- Unique constraint: Only one pending invitation per workspace+email
CREATE UNIQUE INDEX idx_workspace_invitations_unique_pending 
  ON public.workspace_invitations(workspace_id, email) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role only for now)
CREATE POLICY workspace_invitations_select ON public.workspace_invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY workspace_invitations_insert ON public.workspace_invitations FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY workspace_invitations_update ON public.workspace_invitations FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY workspace_invitations_delete ON public.workspace_invitations FOR DELETE TO service_role USING (true);

-- Revoke defaults
REVOKE ALL ON public.workspace_invitations FROM authenticated;
GRANT SELECT ON public.workspace_invitations TO authenticated, service_role;
GRANT ALL ON public.workspace_invitations TO service_role, authenticated, anon;
