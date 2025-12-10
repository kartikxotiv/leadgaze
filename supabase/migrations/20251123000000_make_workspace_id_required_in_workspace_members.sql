
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.workspace_members
  WHERE workspace_id IS NULL AND is_deleted = false;

  IF null_count > 0 THEN
    RAISE NOTICE 'Found % workspace_members with NULL workspace_id. These should be fixed manually.', null_count;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id IS NULL AND is_deleted = false
  ) THEN
    ALTER TABLE public.workspace_members 
    ALTER COLUMN workspace_id SET NOT NULL;
    
    RAISE NOTICE 'Successfully made workspace_id NOT NULL';
  ELSE
    RAISE NOTICE 'Cannot make workspace_id NOT NULL: Found active workspace_members with NULL workspace_id. Please fix data first.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error making workspace_id NOT NULL: %. Column might already be NOT NULL.', SQLERRM;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_user_workspace_unique 
ON public.workspace_members(user_id, workspace_id) 
WHERE user_id IS NOT NULL AND is_deleted = false AND status = 'accepted';

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_email_workspace_unique 
ON public.workspace_members(email, workspace_id) 
WHERE email IS NOT NULL AND is_deleted = false AND status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user_status 
ON public.workspace_members(workspace_id, user_id, status) 
WHERE is_deleted = false;

COMMENT ON COLUMN public.workspace_members.workspace_id IS 'The workspace this member belongs to. Required for all active workspace members.';

