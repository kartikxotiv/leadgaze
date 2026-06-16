/*
 * -------------------------------------------------------
 * Migration: Expand Service Cloud Email Thread Matching
 * Date: 2026-06-15
 * Description: Links ticket emails using message-id fallbacks in addition
 *              to provider thread keys, so inbound replies to converted
 *              outbound messages appear in ticket conversations.
 * -------------------------------------------------------
 */

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
    p_thread_key,
    p_internet_message_id,
    p_provider_message_id,
    p_gmail_message_id,
    p_in_reply_to
  ]) AS value
  WHERE NULLIF(trim(value), '') IS NOT NULL;
$$ LANGUAGE sql IMMUTABLE;

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
        AND position(p_ticket_thread_key in p_email_references) > 0
      )
    );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION service_cloud.link_core_email_to_ticket_threads()
RETURNS TRIGGER AS $$
DECLARE
  v_event_at TIMESTAMPTZ;
BEGIN
  IF COALESCE(NEW.is_deleted, FALSE) = TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.thread_key IS NULL
    AND NEW.in_reply_to IS NULL
    AND NEW.email_references IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_at := COALESCE(NEW.received_at, NEW.sent_at, NEW.created_at, now());

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

DROP TRIGGER IF EXISTS trg_sc_link_core_email_to_ticket_threads ON core.emails;
CREATE TRIGGER trg_sc_link_core_email_to_ticket_threads
  AFTER INSERT OR UPDATE OF thread_key, in_reply_to, email_references, is_deleted ON core.emails
  FOR EACH ROW
  EXECUTE PROCEDURE service_cloud.link_core_email_to_ticket_threads();

CREATE OR REPLACE FUNCTION service_cloud.backfill_ticket_email_thread()
RETURNS TRIGGER AS $$
BEGIN
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

  UPDATE service_cloud.tickets t
  SET
    last_customer_response_at = COALESCE(customer.latest_at, t.last_customer_response_at),
    last_agent_response_at = COALESCE(agent.latest_at, t.last_agent_response_at),
    updated_at = now()
  FROM (
    SELECT MAX(COALESCE(e.received_at, e.sent_at, e.created_at)) AS latest_at
    FROM core.emails e
    WHERE e.workspace_id = NEW.workspace_id
      AND service_cloud.core_email_matches_thread(
        e.thread_key,
        e.in_reply_to,
        e.email_references,
        NEW.thread_key
      )
      AND e.direction = 'inbound'
      AND e.is_deleted = FALSE
  ) customer,
  (
    SELECT MAX(COALESCE(e.sent_at, e.received_at, e.created_at)) AS latest_at
    FROM core.emails e
    WHERE e.workspace_id = NEW.workspace_id
      AND service_cloud.core_email_matches_thread(
        e.thread_key,
        e.in_reply_to,
        e.email_references,
        NEW.thread_key
      )
      AND e.direction = 'outbound'
      AND e.is_deleted = FALSE
  ) agent
  WHERE t.id = NEW.ticket_id
    AND t.workspace_id = NEW.workspace_id
    AND t.is_deleted = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION service_cloud.register_ticket_email_thread_from_link()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_key TEXT;
  v_email_account_id BIGINT;
BEGIN
  FOR v_thread_key, v_email_account_id IN
    SELECT keys.thread_key, e.email_account_id
    FROM core.emails e
    CROSS JOIN service_cloud.core_email_thread_keys(
      e.thread_key,
      e.internet_message_id,
      e.provider_message_id,
      e.gmail_message_id,
      e.in_reply_to
    ) keys
    WHERE e.id = NEW.email_id
      AND e.workspace_id = NEW.workspace_id
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
      v_thread_key,
      v_email_account_id,
      NEW.created_by
    )
    ON CONFLICT (workspace_id, thread_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    e.provider_message_id,
    e.gmail_message_id,
    e.in_reply_to
  ) keys
  ORDER BY te.workspace_id, keys.thread_key, te.created_at
) seeded
ON CONFLICT (workspace_id, thread_key) DO NOTHING;

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

GRANT EXECUTE ON FUNCTION service_cloud.core_email_thread_keys(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION service_cloud.core_email_matches_thread(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
