/*
 * -------------------------------------------------------
 * Migration: Fix Ticket Email Over-Linking
 * Date: 2026-06-18
 * Description:
 *   1. Fixes core_email_matches_thread() to use exact token matching
 *      for email_references instead of substring (position()) matching.
 *   2. Removes stale ticket_email_threads entries that were registered
 *      from message IDs rather than actual provider thread keys.
 *   3. Purges ticket_emails rows that were incorrectly auto-linked
 *      due to the substring matching bug.
 * -------------------------------------------------------
 */

-- =========================================================
-- 1. Fix core_email_matches_thread: exact token matching
-- =========================================================
-- email_references is a space-separated list of message-ids.
-- The old implementation used position() which is a substring
-- match and produced false positives (e.g. "abc@host" matching
-- inside "xyzabc@host.mail.gmail.com").
-- The new implementation pads references with spaces and checks
-- for " <id> " as a delimited token.

CREATE OR REPLACE FUNCTION service_cloud.core_email_matches_thread(
  p_email_thread_key TEXT,
  p_in_reply_to TEXT,
  p_email_references TEXT,
  p_ticket_thread_key TEXT
)
RETURNS BOOLEAN AS $$
  SELECT p_ticket_thread_key IS NOT NULL
    AND (
      p_email_thread_key = p_ticket_thread_key
      OR p_in_reply_to = p_ticket_thread_key
      OR (
        p_email_references IS NOT NULL
        AND position(' ' || p_ticket_thread_key || ' ' IN ' ' || p_email_references || ' ') > 0
      )
    );
$$ LANGUAGE sql IMMUTABLE;

-- =========================================================
-- 2. Clean up stale thread key registrations
-- =========================================================
-- thread_key entries that look like email message-ids (contain @)
-- are almost certainly message IDs, not provider thread keys.
-- Gmail thread keys are hex strings without @.
-- Remove these to prevent future over-linking.

DELETE FROM service_cloud.ticket_email_threads
WHERE thread_key LIKE '%@%';

-- =========================================================
-- 3. Purge incorrectly auto-linked ticket_emails
-- =========================================================
-- Remove ticket_emails entries that were auto-linked by the trigger
-- but are NOT the original email that created the ticket (those have
-- email_role = 'initial_request' or 'agent_reply' set explicitly by
-- the email-to-ticket controller).
--
-- We keep:
--   - Entries with email_role = 'initial_request' or 'agent_reply'
--     (explicitly linked by the user)
--   - Entries whose email's thread_key genuinely matches the thread
--
-- We remove:
--   - Entries auto-linked by the trigger where the email's thread_key
--     does NOT match any legitimate thread key for that ticket AND
--     the entry was auto-created (email_role NOT IN those explicit roles)

DELETE FROM service_cloud.ticket_emails te
WHERE te.email_role NOT IN ('initial_request', 'agent_reply')
  AND NOT EXISTS (
    SELECT 1
    FROM service_cloud.ticket_email_threads tet
    JOIN core.emails e ON e.id = te.email_id
    WHERE tet.ticket_id = te.ticket_id
      AND tet.workspace_id = te.workspace_id
      AND e.thread_key IS NOT NULL
      AND tet.thread_key IS NOT NULL
      AND tet.thread_key NOT LIKE '%@%'
      AND (
        e.thread_key = tet.thread_key
        OR e.in_reply_to = tet.thread_key
      )
  );

-- =========================================================
-- 4. Fix core_email_thread_keys: only return real thread key
-- =========================================================
-- The old implementation also returned message IDs
-- (internet_message_id, provider_message_id, gmail_message_id,
-- in_reply_to) as "thread keys". These are per-email identifiers
-- and should NOT be registered in ticket_email_threads.

CREATE OR REPLACE FUNCTION service_cloud.core_email_thread_keys(
  p_thread_key TEXT,
  p_internet_message_id TEXT,
  p_provider_message_id TEXT,
  p_gmail_message_id TEXT,
  p_in_reply_to TEXT
)
RETURNS TABLE(thread_key TEXT) AS $$
  SELECT DISTINCT NULLIF(trim(value), '') AS thread_key
  FROM unnest(ARRAY[
    p_thread_key
  ]) AS value
  WHERE NULLIF(trim(value), '') IS NOT NULL;
$$ LANGUAGE sql IMMUTABLE;

-- =========================================================
-- 5. Fix register_ticket_email_thread_from_link trigger
-- =========================================================
-- Simplified to only register the email's actual thread_key,
-- not message IDs.

CREATE OR REPLACE FUNCTION service_cloud.register_ticket_email_thread_from_link()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_key TEXT;
  v_email_account_id BIGINT;
BEGIN
  SELECT e.thread_key, e.email_account_id
  INTO v_thread_key, v_email_account_id
  FROM core.emails e
  WHERE e.id = NEW.email_id
    AND e.workspace_id = NEW.workspace_id;

  IF v_thread_key IS NOT NULL THEN
    INSERT INTO service_cloud.ticket_email_threads (
      workspace_id,
      ticket_id,
      thread_key,
      email_account_id,
      created_by
    )
    VALUES (
      NEW.workspace_id,
      NEW.ticket_id,
      v_thread_key,
      v_email_account_id,
      NEW.created_by
    )
    ON CONFLICT (workspace_id, thread_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
