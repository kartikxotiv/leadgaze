
DELETE FROM public.user_organizations uo1
WHERE EXISTS (
  SELECT 1
  FROM public.user_organizations uo2
  WHERE uo2.user_id = uo1.user_id
    AND uo2.organization_id = uo1.organization_id
    AND (
      uo2.created_at > uo1.created_at
      OR (
        uo2.created_at = uo1.created_at
        AND uo2.id > uo1.id
      )
    )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_organizations_user_id_organization_id_key'
  ) THEN
    ALTER TABLE public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_organization_id_key
    UNIQUE (user_id, organization_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org 
ON public.user_organizations(user_id, organization_id);

COMMENT ON CONSTRAINT user_organizations_user_id_organization_id_key 
ON public.user_organizations IS 
'Ensures each user can only be a member of an organization once. Prevents duplicate entries.';

