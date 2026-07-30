-- Migration to make gmail_message_id nullable in emails table
-- and remove the unique constraint to support drafts and scheduled emails.

ALTER TABLE public.emails ALTER COLUMN gmail_message_id DROP NOT NULL;

-- Find and drop the unique constraint if it exists.
-- The constraint name is likely emails_gmail_message_id_key based on default naming.
-- We use a DO block to safely drop it if it exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'emails_gmail_message_id_key'
    ) THEN
        ALTER TABLE public.emails DROP CONSTRAINT emails_gmail_message_id_key;
    END IF;
END $$;
