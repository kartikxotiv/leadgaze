/*
 * -------------------------------------------------------
 * Migration: Add Service Cloud Ticket Collaboration and Threading
 * Date: 2026-06-04
 * Description: Adds date-only due dates, multi-assignee support, and
 *              ticket-to-email-thread mapping for Service Cloud tickets.
 * -------------------------------------------------------
 */

ALTER TABLE service_cloud.tickets
  ADD COLUMN IF NOT EXISTS due_date DATE;

UPDATE service_cloud.tickets
SET due_date = due_at::DATE
WHERE due_date IS NULL
  AND due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sc_tickets_due_date
  ON service_cloud.tickets(workspace_id, due_date)
  WHERE due_date IS NOT NULL
    AND is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS service_cloud.ticket_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  assignment_role VARCHAR(50) NOT NULL DEFAULT 'collaborator',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_ticket_assignees_unique UNIQUE (ticket_id, account_id),
  CONSTRAINT sc_ticket_assignees_role_check CHECK (
    assignment_role IN ('owner', 'collaborator', 'watcher')
  )
);

COMMENT ON TABLE service_cloud.ticket_assignees IS 'Many-to-many assignment records for tickets that need multiple agents.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_assignees_workspace
  ON service_cloud.ticket_assignees(workspace_id);

CREATE INDEX IF NOT EXISTS idx_sc_ticket_assignees_ticket
  ON service_cloud.ticket_assignees(ticket_id);

CREATE INDEX IF NOT EXISTS idx_sc_ticket_assignees_account
  ON service_cloud.ticket_assignees(account_id, workspace_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_ticket_assignees_primary
  ON service_cloud.ticket_assignees(ticket_id)
  WHERE is_primary = TRUE;

INSERT INTO service_cloud.ticket_assignees (
  workspace_id,
  ticket_id,
  account_id,
  assignment_role,
  is_primary,
  created_by
)
SELECT
  workspace_id,
  id,
  assigned_agent_id,
  'owner',
  TRUE,
  updated_by
FROM service_cloud.tickets
WHERE assigned_agent_id IS NOT NULL
ON CONFLICT (ticket_id, account_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS service_cloud.ticket_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  thread_key TEXT NOT NULL,
  email_account_id BIGINT REFERENCES core.email_accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_ticket_email_threads_unique UNIQUE (ticket_id, thread_key),
  CONSTRAINT sc_ticket_email_threads_workspace_thread_unique UNIQUE (workspace_id, thread_key)
);

COMMENT ON TABLE service_cloud.ticket_email_threads IS 'Maps Service Cloud tickets to reusable core email thread keys.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_email_threads_workspace_thread
  ON service_cloud.ticket_email_threads(workspace_id, thread_key);

CREATE INDEX IF NOT EXISTS idx_sc_ticket_email_threads_ticket
  ON service_cloud.ticket_email_threads(ticket_id);

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
  SELECT DISTINCT ON (te.workspace_id, e.thread_key)
    te.workspace_id,
    te.ticket_id,
    e.thread_key,
    e.email_account_id,
    te.created_by
  FROM service_cloud.ticket_emails te
  JOIN core.emails e ON e.id = te.email_id
  WHERE e.thread_key IS NOT NULL
  ORDER BY te.workspace_id, e.thread_key, te.created_at
) seeded
ON CONFLICT (workspace_id, thread_key) DO NOTHING;

CREATE OR REPLACE FUNCTION service_cloud.core_email_ticket_role(p_direction TEXT)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF p_direction = 'outbound' THEN
    RETURN 'agent_reply';
  END IF;

  IF p_direction = 'inbound' THEN
    RETURN 'customer_reply';
  END IF;

  RETURN 'conversation';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION service_cloud.link_core_email_to_ticket_threads()
RETURNS TRIGGER AS $$
DECLARE
  v_event_at TIMESTAMPTZ;
BEGIN
  IF NEW.thread_key IS NULL OR COALESCE(NEW.is_deleted, FALSE) = TRUE THEN
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
    AND tet.thread_key = NEW.thread_key
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
      AND tet.thread_key = NEW.thread_key
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
      AND tet.thread_key = NEW.thread_key
      AND t.is_deleted = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sc_link_core_email_to_ticket_threads ON core.emails;
CREATE TRIGGER trg_sc_link_core_email_to_ticket_threads
  AFTER INSERT OR UPDATE OF thread_key, is_deleted ON core.emails
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
    AND e.thread_key = NEW.thread_key
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
      AND e.thread_key = NEW.thread_key
      AND e.direction = 'inbound'
      AND e.is_deleted = FALSE
  ) customer,
  (
    SELECT MAX(COALESCE(e.sent_at, e.received_at, e.created_at)) AS latest_at
    FROM core.emails e
    WHERE e.workspace_id = NEW.workspace_id
      AND e.thread_key = NEW.thread_key
      AND e.direction = 'outbound'
      AND e.is_deleted = FALSE
  ) agent
  WHERE t.id = NEW.ticket_id
    AND t.workspace_id = NEW.workspace_id
    AND t.is_deleted = FALSE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sc_backfill_ticket_email_thread ON service_cloud.ticket_email_threads;
CREATE TRIGGER trg_sc_backfill_ticket_email_thread
  AFTER INSERT ON service_cloud.ticket_email_threads
  FOR EACH ROW
  EXECUTE PROCEDURE service_cloud.backfill_ticket_email_thread();

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

DROP TRIGGER IF EXISTS trg_sc_register_ticket_email_thread_from_link ON service_cloud.ticket_emails;
CREATE TRIGGER trg_sc_register_ticket_email_thread_from_link
  AFTER INSERT ON service_cloud.ticket_emails
  FOR EACH ROW
  EXECUTE PROCEDURE service_cloud.register_ticket_email_thread_from_link();

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
 AND e.thread_key = tet.thread_key
 AND e.is_deleted = FALSE
JOIN service_cloud.tickets t
  ON t.id = tet.ticket_id
 AND t.workspace_id = tet.workspace_id
 AND t.is_deleted = FALSE
ON CONFLICT (ticket_id, email_id) DO NOTHING;

UPDATE service_cloud.tickets t
SET
  last_customer_response_at = COALESCE(customer.latest_at, t.last_customer_response_at),
  last_agent_response_at = COALESCE(agent.latest_at, t.last_agent_response_at),
  updated_at = now()
FROM (
  SELECT
    tet.workspace_id,
    tet.ticket_id,
    MAX(COALESCE(e.received_at, e.sent_at, e.created_at)) AS latest_at
  FROM service_cloud.ticket_email_threads tet
  JOIN core.emails e
    ON e.workspace_id = tet.workspace_id
   AND e.thread_key = tet.thread_key
   AND e.direction = 'inbound'
   AND e.is_deleted = FALSE
  GROUP BY tet.workspace_id, tet.ticket_id
) customer
FULL OUTER JOIN (
  SELECT
    tet.workspace_id,
    tet.ticket_id,
    MAX(COALESCE(e.sent_at, e.received_at, e.created_at)) AS latest_at
  FROM service_cloud.ticket_email_threads tet
  JOIN core.emails e
    ON e.workspace_id = tet.workspace_id
   AND e.thread_key = tet.thread_key
   AND e.direction = 'outbound'
   AND e.is_deleted = FALSE
  GROUP BY tet.workspace_id, tet.ticket_id
) agent
  ON agent.workspace_id = customer.workspace_id
 AND agent.ticket_id = customer.ticket_id
WHERE t.workspace_id = COALESCE(customer.workspace_id, agent.workspace_id)
  AND t.id = COALESCE(customer.ticket_id, agent.ticket_id)
  AND t.is_deleted = FALSE;

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
      'ticket_assignees',
      'ticket_email_threads'
    ]::TEXT[])
  LOOP
    EXECUTE format('ALTER TABLE service_cloud.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON service_cloud.%I', v_table || '_policy', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON service_cloud.%I FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true)',
      v_table || '_policy',
      v_table
    );
    EXECUTE format('GRANT ALL ON service_cloud.%I TO service_role, authenticated, anon', v_table);
  END LOOP;
END $$;
