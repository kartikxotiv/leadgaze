-- Migration to support multiple email accounts per workspace with ownership and sharing
-- Replaces the single-account-per-workspace model with:
-- 1. explicit account ownership
-- 2. default access scope (private/workspace)
-- 3. optional per-user grants for future selective sharing

BEGIN;

DO $$
BEGIN
  CREATE TYPE public.email_account_access_scope AS ENUM ('private', 'workspace');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'accepted'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_member(uuid)
TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION public.current_user_is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.workspace_roles wr
      ON wr.id = wm.role_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'accepted'
      AND wr.role_key = 'admin'
      AND wr.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_admin(uuid)
TO authenticated, service_role, anon;

ALTER TABLE public.email_accounts
  DROP CONSTRAINT IF EXISTS email_accounts_workspace_id_unique;

ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS access_scope public.email_account_access_scope NOT NULL DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_accounts_owner_user_id_fkey'
  ) THEN
    ALTER TABLE public.email_accounts
      ADD CONSTRAINT email_accounts_owner_user_id_fkey
      FOREIGN KEY (owner_user_id)
      REFERENCES public.accounts(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

UPDATE public.email_accounts ea
SET owner_user_id = ea.created_by
WHERE ea.owner_user_id IS NULL
  AND ea.created_by IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = ea.workspace_id
      AND wm.user_id = ea.created_by
      AND wm.status = 'accepted'
  );

UPDATE public.email_accounts ea
SET owner_user_id = (
  SELECT wm.user_id
  FROM public.workspace_members wm
  JOIN public.workspace_roles wr
    ON wr.id = wm.role_id
  WHERE wm.workspace_id = ea.workspace_id
    AND wm.status = 'accepted'
  ORDER BY
    CASE WHEN wr.role_key = 'admin' THEN 0 ELSE 1 END,
    CASE WHEN wm.is_primary_contact THEN 0 ELSE 1 END,
    wm.created_at ASC
  LIMIT 1
)
WHERE ea.owner_user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.email_accounts
    WHERE owner_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to backfill owner_user_id for all email_accounts rows';
  END IF;
END
$$;

ALTER TABLE public.email_accounts
  ALTER COLUMN owner_user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_accounts_id_workspace_id_key'
  ) THEN
    ALTER TABLE public.email_accounts
      ADD CONSTRAINT email_accounts_id_workspace_id_key
      UNIQUE (id, workspace_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_accounts_workspace_id_email_key'
  ) THEN
    ALTER TABLE public.email_accounts
      ADD CONSTRAINT email_accounts_workspace_id_email_key
      UNIQUE (workspace_id, email);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_email_accounts_owner_user_id
  ON public.email_accounts(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_email_accounts_access_scope
  ON public.email_accounts(workspace_id, access_scope);

CREATE TABLE IF NOT EXISTS public.email_account_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id bigint NOT NULL,
  workspace_id uuid NOT NULL,
  grantee_user_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  can_send boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_account_access_grants_email_account_workspace_fkey
    FOREIGN KEY (email_account_id, workspace_id)
    REFERENCES public.email_accounts(id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT email_account_access_grants_unique
    UNIQUE (email_account_id, grantee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_account_access_grants_workspace_user
  ON public.email_account_access_grants(workspace_id, grantee_user_id);

CREATE OR REPLACE FUNCTION public.current_user_can_send_from_email_account(p_email_account_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_accounts ea
    WHERE ea.id = p_email_account_id
      AND public.current_user_is_workspace_member(ea.workspace_id)
      AND (
        ea.owner_user_id = auth.uid()
        OR ea.access_scope = 'workspace'::public.email_account_access_scope
        OR public.current_user_is_workspace_admin(ea.workspace_id)
        OR EXISTS (
          SELECT 1
          FROM public.email_account_access_grants eag
          WHERE eag.email_account_id = ea.id
            AND eag.workspace_id = ea.workspace_id
            AND eag.grantee_user_id = auth.uid()
            AND eag.can_send = true
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_send_from_email_account(bigint)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_email_account_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_user_id IS DISTINCT FROM auth.uid()
      AND NOT public.current_user_is_workspace_admin(NEW.workspace_id) THEN
      RAISE EXCEPTION 'Only admins can create an email account for another user';
    END IF;

    IF NEW.access_scope <> 'private'::public.email_account_access_scope
      AND NOT public.current_user_is_workspace_admin(NEW.workspace_id) THEN
      RAISE EXCEPTION 'Only admins can create shared email accounts';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'Email accounts cannot be moved between workspaces';
    END IF;

    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
      AND NOT public.current_user_is_workspace_admin(NEW.workspace_id) THEN
      RAISE EXCEPTION 'Only admins can transfer email account ownership';
    END IF;

    IF NEW.access_scope IS DISTINCT FROM OLD.access_scope
      AND NOT public.current_user_is_workspace_admin(NEW.workspace_id) THEN
      RAISE EXCEPTION 'Only admins can change email account sharing';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

GRANT EXECUTE ON FUNCTION public.enforce_email_account_permissions()
TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enforce_email_account_permissions
  ON public.email_accounts;

CREATE TRIGGER trg_enforce_email_account_permissions
BEFORE INSERT OR UPDATE ON public.email_accounts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_email_account_permissions();

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_account_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_accounts_policy ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_select_workspace_members ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_insert_own ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_insert_admin ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_update_own ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_update_admin ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_delete_own ON public.email_accounts;
DROP POLICY IF EXISTS email_accounts_delete_admin ON public.email_accounts;

CREATE POLICY email_accounts_select_workspace_members
ON public.email_accounts
FOR SELECT
TO authenticated
USING (
  public.current_user_is_workspace_member(workspace_id)
);

CREATE POLICY email_accounts_insert_own
ON public.email_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  true
);

CREATE POLICY email_accounts_insert_admin
ON public.email_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  true
);

CREATE POLICY email_accounts_update_own
ON public.email_accounts
FOR UPDATE
TO authenticated
USING (
  true
)
WITH CHECK (
  true
);

CREATE POLICY email_accounts_update_admin
ON public.email_accounts
FOR UPDATE
TO authenticated
USING (
  true
)
WITH CHECK (
  true
);

CREATE POLICY email_accounts_delete_own
ON public.email_accounts
FOR DELETE
TO authenticated
USING (
  true
);

CREATE POLICY email_accounts_delete_admin
ON public.email_accounts
FOR DELETE
TO authenticated
USING (
  true
);

DROP POLICY IF EXISTS email_account_access_grants_select_admin_or_owner ON public.email_account_access_grants;
DROP POLICY IF EXISTS email_account_access_grants_insert_admin ON public.email_account_access_grants;
DROP POLICY IF EXISTS email_account_access_grants_update_admin ON public.email_account_access_grants;
DROP POLICY IF EXISTS email_account_access_grants_delete_admin ON public.email_account_access_grants;

CREATE POLICY email_account_access_grants_select_admin_or_owner
ON public.email_account_access_grants
FOR SELECT
TO authenticated
USING (
  true
);

CREATE POLICY email_account_access_grants_insert_admin
ON public.email_account_access_grants
FOR INSERT
TO authenticated
WITH CHECK (
  true
);

CREATE POLICY email_account_access_grants_update_admin
ON public.email_account_access_grants
FOR UPDATE
TO authenticated
USING (
  true
)
WITH CHECK (
  true
);

CREATE POLICY email_account_access_grants_delete_admin
ON public.email_account_access_grants
FOR DELETE
TO authenticated
USING (
  true
);

COMMENT ON COLUMN public.email_accounts.owner_user_id IS
'User who owns the connected credential. Non-admins can send only through their own account unless the account is shared.';

COMMENT ON COLUMN public.email_accounts.access_scope IS
'Default send access for the account. private = owner/admin only, workspace = all accepted workspace members.';

COMMENT ON TABLE public.email_account_access_grants IS
'Optional per-user grants for email account usage. Supports future selective sharing beyond private/workspace access.';

COMMIT;
