-- Add foreign key constraint on last_visited_organization_id referencing organizations.organization_id
-- Only if organizations table exists and constraint doesn't already exist
DO $$
BEGIN
  -- Check if organizations table exists and constraint doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'last_visited_organization_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_last_visited_organization_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_last_visited_organization_id_fkey
      FOREIGN KEY (last_visited_organization_id) REFERENCES public.organizations (organization_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- For rollback, remove the foreign key constraint:
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_last_visited_organization_id_fkey;
