-- Create user_organizations table
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.organization_roles (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unique constraint for user + organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_organizations_user_id_organization_id_key'
  ) THEN
    ALTER TABLE public.user_organizations
      ADD CONSTRAINT user_organizations_user_id_organization_id_key UNIQUE (user_id, organization_id);
  END IF;
END $$;

-- Add check constraint for status
ALTER TABLE public.user_organizations
  ADD CONSTRAINT user_organizations_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

-- Enable Row Level Security
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
