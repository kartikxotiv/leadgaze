-- Add sync fields to email_accounts
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS history_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_sync_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS imap_port INTEGER,
ADD COLUMN IF NOT EXISTS imap_secure BOOLEAN DEFAULT TRUE;


-- Add index for performance during sync
CREATE INDEX IF NOT EXISTS idx_email_accounts_sync ON email_accounts(is_active, is_sync_enabled);


-- Restore unique constraint on gmail_message_id to support upsert operations
-- Postgres unique constraints allow multiple NULL values, so this won't break drafts/scheduled emails.
ALTER TABLE public.emails ADD CONSTRAINT emails_gmail_message_id_key UNIQUE (gmail_message_id);


-- Update emails_status_check constraint to include 'received'
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_status_check;

ALTER TABLE emails ADD CONSTRAINT emails_status_check 
CHECK (status IN ('draft', 'scheduled', 'sent', 'failed', 'received'));
