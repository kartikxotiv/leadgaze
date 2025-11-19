DO $$
BEGIN
  CREATE TYPE public.workspace_member_status AS ENUM ('pending','accepted','rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  status public.workspace_member_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;