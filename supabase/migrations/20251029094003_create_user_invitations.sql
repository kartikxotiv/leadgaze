-- Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES public.organization_roles (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  invited_by UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status_id UUID NOT NULL REFERENCES public.organization_config (id),
  invitation_token VARCHAR(500) NOT NULL UNIQUE,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations (email);

-- Create index on invitation_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations (invitation_token);

-- Enable Row Level Security
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
