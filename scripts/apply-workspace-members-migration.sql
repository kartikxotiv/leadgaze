-- Script to apply workspace_members migration manually
-- Run this in your Supabase SQL editor or via psql

-- Add email column
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add workspace_id column
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Make user_id nullable (since invites can be sent before user exists)
DO $$
BEGIN
  ALTER TABLE public.workspace_members 
  ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Column might already be nullable, ignore error
    NULL;
END $$;

-- Add constraint: either user_id or email must be present
-- Drop constraint if it exists first
ALTER TABLE public.workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_user_or_email_check;

ALTER TABLE public.workspace_members 
ADD CONSTRAINT workspace_members_user_or_email_check 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);

-- Create index on workspace_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'workspace_members' 
  AND column_name IN ('email', 'workspace_id', 'user_id')
ORDER BY column_name;

