-- Add cancel_reason column to core.meetings table
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
