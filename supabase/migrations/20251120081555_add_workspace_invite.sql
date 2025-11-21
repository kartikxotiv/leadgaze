DO $$
BEGIN
  CREATE TYPE public.workspace_invite_status AS ENUM ('pending','accepted','rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
  status public.workspace_invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;