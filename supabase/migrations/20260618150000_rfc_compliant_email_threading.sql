/*
 * -------------------------------------------------------
 * Migration: RFC-Compliant Email Threading for Tickets
 * Date: 2026-06-18
 * Description:
 *   Rewrites the ticket email threading system to use
 *   RFC 5322 headers (Message-ID, In-Reply-To, References)
 *   as the primary matching mechanism, with provider thread
 *   keys (e.g. Gmail thread ID) as a secondary helper.
 *
 *   This makes threading work correctly across:
 *     - Gmail (thread_key + RFC headers)
 *     - Outlook (Conversation-Id + RFC headers)
 *     - Generic IMAP (RFC headers only)
 *     - Cross-provider (RFC headers only)
 * -------------------------------------------------------
 */


-- =========================================================
-- 0. Drop old 5-parameter version of core_email_thread_keys
-- =========================================================
-- The previous implementation accepted 5 params (thread_key,
-- internet_message_id, provider_message_id, gmail_message_id,
-- in_reply_to). PostgreSQL treats different param counts as
-- different functions, so we must explicitly drop the old one.

DROP FUNCTION IF EXISTS service_cloud.core_email_thread_keys(TEXT, TEXT, TEXT, TEXT, TEXT);


-- =========================================================
-- 1. core_email_thread_keys: extract ALL thread identifiers
-- =========================================================
-- Given an email's headers, return every identifier that should
-- be registered in ticket_email_threads for matching purposes:
--   - Provider thread_key (Gmail hex ID, Outlook conversation ID, etc.)
--   - internet_message_id (the email's own Message-ID)
--   - Each token from email_references (space-separated Message-IDs)

CREATE OR REPLACE FUNCTION service_cloud.core_email_thread_keys(
  p_thread_key TEXT,
  p_internet_message_id TEXT,
  p_email_references TEXT
)
RETURNS TABLE(thread_key TEXT) AS $$
  SELECT DISTINCT value
  FROM (
    SELECT NULLIF(trim(v), '') AS value
    FROM unnest(ARRAY[
      p_thread_key,
      p_internet_message_id
    ]) AS v
    UNION ALL
    SELECT NULLIF(trim(token), '') AS value
    FROM unnest(string_to_array(COALESCE(p_email_references, ''), ' ')) AS token
  ) combined
  WHERE value IS NOT NULL;
$$ LANGUAGE sql IMMUTABLE;


-- =========================================================
-- 2. core_email_matches_thread: RFC-aware matching
-- =========================================================
-- Determines whether an incoming email belongs to a ticket
-- thread identified by p_ticket_thread_key.
--
-- Matching priority:
--   1. In-Reply-To  = registered thread identifier
--   2. thread_key   = registered thread identifier
--   3. Any token in email_references = registered thread identifier
--
-- All comparisons use exact token matching (space-padded)
-- to prevent substring false positives.

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
        AND position(
          ' ' || p_ticket_thread_key || ' '
          IN ' ' || p_email_references || ' '
        ) > 0
      )
    );
$$ LANGUAGE sql IMMUTABLE;


-- =========================================================
-- 3. link_core_email_to_ticket_threads: incoming email trigger
-- =========================================================
-- Fires when a new email is inserted/updated in core.emails.
-- Checks ALL registered thread identifiers for the workspace
-- (provider thread keys, message IDs, references) and links
-- the email to any matching tickets.
--
-- Also updates ticket response timestamps.

CREATE OR REPLACE FUNCTION service_cloud.link_core_email_to_ticket_threads()
RETURNS TRIGGER AS $$
DECLARE
  v_event_at TIMESTAMPTZ;
BEGIN
  IF COALESCE(NEW.is_deleted, FALSE) = TRUE THEN
    RETURN NEW;
  END IF;

  -- Early exit: nothing to match against
  IF NEW.thread_key IS NULL
    AND NEW.in_reply_to IS NULL
    AND NEW.email_references IS NULL
    AND NEW.internet_message_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_at := COALESCE(NEW.received_at, NEW.sent_at, NEW.created_at, now());

  -- Auto-link email to matching tickets
  INSERT INTO service_cloud.ticket_emails (
    workspace_id,
    ticket_id,
    email_id,
    account_id,
    email_role,
    is_public,
    created_by
  )
  SELECT
    tet.workspace_id,
    tet.ticket_id,
    NEW.id,
    NEW.created_by,
    service_cloud.core_email_ticket_role(NEW.direction),
    TRUE,
    COALESCE(NEW.created_by, tet.created_by)
  FROM service_cloud.ticket_email_threads tet
  JOIN service_cloud.tickets t
    ON t.id = tet.ticket_id
   AND t.workspace_id = tet.workspace_id
   AND t.is_deleted = FALSE
  WHERE tet.workspace_id = NEW.workspace_id
    AND service_cloud.core_email_matches_thread(
      NEW.thread_key,
      NEW.in_reply_to,
      NEW.email_references,
      tet.thread_key
    )
  ON CONFLICT (ticket_id, email_id) DO NOTHING;

  -- Update ticket response timestamps
  IF NEW.direction = 'inbound' THEN
    UPDATE service_cloud.tickets t
    SET
      last_customer_response_at = GREATEST(
        COALESCE(t.last_customer_response_at, v_event_at),
        v_event_at
      ),
      updated_at = now()
    FROM service_cloud.ticket_email_threads tet
    WHERE tet.ticket_id = t.id
      AND tet.workspace_id = t.workspace_id
      AND tet.workspace_id = NEW.workspace_id
      AND service_cloud.core_email_matches_thread(
        NEW.thread_key,
        NEW.in_reply_to,
        NEW.email_references,
        tet.thread_key
      )
      AND t.is_deleted = FALSE;
  ELSIF NEW.direction = 'outbound' THEN
    UPDATE service_cloud.tickets t
    SET
      last_agent_response_at = GREATEST(
        COALESCE(t.last_agent_response_at, v_event_at),
        v_event_at
      ),
      updated_at = now()
    FROM service_cloud.ticket_email_threads tet
    WHERE tet.ticket_id = t.id
      AND tet.workspace_id = t.workspace_id
      AND tet.workspace_id = NEW.workspace_id
      AND service_cloud.core_email_matches_thread(
        NEW.thread_key,
        NEW.in_reply_to,
        NEW.email_references,
        tet.thread_key
      )
      AND t.is_deleted = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to include internet_message_id in the UPDATE watch list
DROP TRIGGER IF EXISTS trg_sc_link_core_email_to_ticket_threads ON core.emails;
CREATE TRIGGER trg_sc_link_core_email_to_ticket_threads
  AFTER INSERT OR UPDATE OF thread_key, in_reply_to, email_references, internet_message_id, is_deleted
  ON core.emails
  FOR EACH ROW
  EXECUTE PROCEDURE service_cloud.link_core_email_to_ticket_threads();


-- =========================================================
-- 4. backfill_ticket_email_thread: thread key registration trigger
-- =========================================================
-- Fires when a new entry is inserted into ticket_email_threads.
-- Scans workspace emails to find any that match the newly registered
-- thread key, and auto-links them to the ticket.
--
-- This ensures that when a ticket is created from an email, any
-- existing emails in the workspace that are part of the same
-- conversation (via In-Reply-To, References, or thread_key) are
-- automatically included.

CREATE OR REPLACE FUNCTION service_cloud.backfill_ticket_email_thread()
RETURNS TRIGGER AS $$
BEGIN
  -- Link existing emails that match this thread key
  INSERT INTO service_cloud.ticket_emails (
    workspace_id,
    ticket_id,
    email_id,
    account_id,
    email_role,
    is_public,
    created_by
  )
  SELECT
    NEW.workspace_id,
    NEW.ticket_id,
    e.id,
    e.created_by,
    service_cloud.core_email_ticket_role(e.direction),
    TRUE,
    COALESCE(NEW.created_by, e.created_by)
  FROM core.emails e
  WHERE e.workspace_id = NEW.workspace_id
    AND service_cloud.core_email_matches_thread(
      e.thread_key,
      e.in_reply_to,
      e.email_references,
      NEW.thread_key
    )
    AND e.is_deleted = FALSE
  ON CONFLICT (ticket_id, email_id) DO NOTHING;

  -- Refresh ticket response timestamps
  UPDATE service_cloud.tickets t
  SET
    last_customer_response_at = COALESCE(customer.latest_at, t.last_customer_response_at),
    last_agent_response_at = COALESCE(agent.latest_at, t.last_agent_response_at),
    updated_at = now()
  FROM (
    SELECT MAX(COALESCE(e.received_at, e.sent_at, e.created_at)) AS latest_at
    FROM core.emails e
    JOIN service_cloud.ticket_emails te
      ON te.email_id = e.id
     AND te.ticket_id = NEW.ticket_id
     AND te.workspace_id = NEW.workspace_id
    WHERE e.workspace_id = NEW.workspace_id
      AND e.direction = 'inbound'
      AND e.is_deleted = FALSE
  ) customer,
  (
    SELECT MAX(COALESCE(e.sent_at, e.received_at, e.created_at)) AS latest_at
    FROM core.emails e
    JOIN service_cloud.ticket_emails te
      ON te.email_id = e.id
     AND te.ticket_id = NEW.ticket_id
     AND te.workspace_id = NEW.workspace_id
    WHERE e.workspace_id = NEW.workspace_id
      AND e.direction = 'outbound'
      AND e.is_deleted = FALSE
  ) agent
  WHERE t.id = NEW.ticket_id
    AND t.workspace_id = NEW.workspace_id
    AND t.is_deleted = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================
-- 5. register_ticket_email_thread_from_link: ticket_emails trigger
-- =========================================================
-- Fires when a new entry is inserted into ticket_emails.
-- Registers ALL of the email's thread identifiers (provider key,
-- message ID, references) into ticket_email_threads.

CREATE OR REPLACE FUNCTION service_cloud.register_ticket_email_thread_from_link()
RETURNS TRIGGER AS $$
DECLARE
  v_email_thread_key TEXT;
  v_internet_message_id TEXT;
  v_email_references TEXT;
  v_email_account_id BIGINT;
  v_key TEXT;
BEGIN
  SELECT e.thread_key, e.internet_message_id, e.email_references, e.email_account_id
  INTO v_email_thread_key, v_internet_message_id, v_email_references, v_email_account_id
  FROM core.emails e
  WHERE e.id = NEW.email_id
    AND e.workspace_id = NEW.workspace_id;

  -- Register all thread identifiers
  FOR v_key IN
    SELECT keys.thread_key
    FROM service_cloud.core_email_thread_keys(
      v_email_thread_key,
      v_internet_message_id,
      v_email_references
    ) keys
  LOOP
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
      v_key,
      v_email_account_id,
      NEW.created_by
    )
    ON CONFLICT (workspace_id, thread_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================
-- 6. Backfill: register RFC identifiers for existing tickets
-- =========================================================
-- For all existing ticket_emails, ensure their internet_message_id
-- and references are registered in ticket_email_threads, not just
-- their provider thread_key.
--
-- This is essential so that future replies (with In-Reply-To
-- pointing to a registered message ID) are correctly matched.

INSERT INTO service_cloud.ticket_email_threads (
  workspace_id,
  ticket_id,
  thread_key,
  email_account_id,
  created_by
)
SELECT
  seeded.workspace_id,
  seeded.ticket_id,
  seeded.thread_key,
  seeded.email_account_id,
  seeded.created_by
FROM (
  SELECT DISTINCT ON (te.workspace_id, keys.thread_key)
    te.workspace_id,
    te.ticket_id,
    keys.thread_key,
    e.email_account_id,
    te.created_by
  FROM service_cloud.ticket_emails te
  JOIN core.emails e ON e.id = te.email_id
  CROSS JOIN service_cloud.core_email_thread_keys(
    e.thread_key,
    e.internet_message_id,
    e.email_references
  ) keys
  ORDER BY te.workspace_id, keys.thread_key, te.created_at
) seeded
ON CONFLICT (workspace_id, thread_key) DO NOTHING;


-- =========================================================
-- 7. Backfill: link orphaned emails that now match via RFC headers
-- =========================================================
-- After registering the new identifiers, some existing workspace
-- emails may now match a ticket thread that they weren't linked to
-- before (because only thread_key was registered previously).

INSERT INTO service_cloud.ticket_emails (
  workspace_id,
  ticket_id,
  email_id,
  account_id,
  email_role,
  is_public,
  created_by
)
SELECT
  tet.workspace_id,
  tet.ticket_id,
  e.id,
  e.created_by,
  service_cloud.core_email_ticket_role(e.direction),
  TRUE,
  COALESCE(tet.created_by, e.created_by)
FROM service_cloud.ticket_email_threads tet
JOIN core.emails e
  ON e.workspace_id = tet.workspace_id
 AND service_cloud.core_email_matches_thread(
   e.thread_key,
   e.in_reply_to,
   e.email_references,
   tet.thread_key
 )
 AND e.is_deleted = FALSE
JOIN service_cloud.tickets t
  ON t.id = tet.ticket_id
 AND t.workspace_id = tet.workspace_id
 AND t.is_deleted = FALSE
ON CONFLICT (ticket_id, email_id) DO NOTHING;


-- =========================================================
-- 8. Permissions
-- =========================================================

GRANT EXECUTE ON FUNCTION service_cloud.core_email_thread_keys(TEXT, TEXT, TEXT)
  TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION service_cloud.core_email_matches_thread(TEXT, TEXT, TEXT, TEXT)
  TO authenticated, anon, service_role;
