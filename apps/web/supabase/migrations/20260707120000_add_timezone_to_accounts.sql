-- Add timezone column to public.accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;
