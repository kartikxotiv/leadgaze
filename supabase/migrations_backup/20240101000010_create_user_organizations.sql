-- Create user_organizations table
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.organization_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint on user_id and organization_id
ALTER TABLE public.user_organizations
ADD CONSTRAINT user_organizations_user_id_organization_id_key UNIQUE (user_id, organization_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- To rollback, use:
-- DROP TABLE IF EXISTS public.user_organizations CASCADE;
