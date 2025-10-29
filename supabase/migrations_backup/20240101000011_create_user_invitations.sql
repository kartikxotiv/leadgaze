-- Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES public.organization_roles (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  invited_by UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES public.users_config (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  invitation_token VARCHAR(500) NOT NULL UNIQUE,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (recommended)
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- To rollback (manual):
-- DROP TABLE IF EXISTS public.user_invitations CASCADE;
