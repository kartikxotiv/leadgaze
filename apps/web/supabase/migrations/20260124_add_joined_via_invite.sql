/*
 * -------------------------------------------------------
 * Migration: Add joined_via_invite flag to accounts
 * Date: 2026-01-24
 * Description: Track if a user joined via workspace invite to skip initial workspace creation
 * -------------------------------------------------------
 */

ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS joined_via_invite BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.accounts.joined_via_invite IS 'If true, user joined via workspace invite and initial workspace creation should be skipped';
