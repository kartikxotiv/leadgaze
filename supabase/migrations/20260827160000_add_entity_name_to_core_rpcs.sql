-- ============================================================
-- 0. Clean up existing functions to avoid signature conflicts
-- ============================================================
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure as func_signature
    FROM pg_proc
    WHERE proname IN ('get_core_tasks', 'get_core_reminders', 'get_core_documents', 'get_core_notes', 'get_core_meetings')
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================
-- 1. Helper function to get entity name
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_entity_name(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_name TEXT := '';
BEGIN
  IF p_entity_type IN ('lead', 'sales_lead') THEN
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), company_name, 'Lead') INTO v_name FROM public.crm_leads WHERE id = p_entity_id;
  ELSIF p_entity_type IN ('contact', 'sales_contact') THEN
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), 'Contact') INTO v_name FROM public.crm_contacts WHERE id = p_entity_id;
  ELSIF p_entity_type IN ('account', 'sales_account') THEN
    SELECT COALESCE(account_name, 'Account') INTO v_name FROM public.crm_accounts WHERE id = p_entity_id;
  ELSIF p_entity_type IN ('opportunity', 'sales_opportunity') THEN
    SELECT COALESCE(opportunity_name, 'Opportunity') INTO v_name FROM public.crm_opportunities WHERE id = p_entity_id;
  END IF;
  RETURN v_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Fix get_core_meetings
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_meetings(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL,
  p_timeframe TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_created_by_ids UUID[] DEFAULT NULL,
  p_created_at_from TIMESTAMPTZ DEFAULT NULL,
  p_created_at_to TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_to TIMESTAMPTZ DEFAULT NULL,
  p_is_workspace_owner BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT NULL,
  p_limit INT DEFAULT NULL,
  p_meeting_type TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_host_user_id UUID DEFAULT NULL,
  p_view TEXT DEFAULT 'my',
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_include_participant_meetings BOOLEAN DEFAULT FALSE,
  p_participant_user_id UUID DEFAULT NULL,
  p_participant_email TEXT DEFAULT NULL,
  p_module TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
  v_user_to_check UUID := COALESCE(p_participant_user_id, p_user_id);
BEGIN
  CREATE TEMP TABLE temp_rel_entities_m(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities_m VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities_m (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities_m (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities_m (entity_type, entity_id)
      SELECT 'account', c.account_id FROM public.crm_contacts c WHERE c.id = p_entity_id AND c.account_id IS NOT NULL;
    END IF;
  END IF;

  WITH matching_meetings AS (
    SELECT DISTINCT m.id, m.workspace_id, m.title, m.description, m.scheduled_start, m.scheduled_end,
           m.location, m.meeting_url AS meeting_link, m.status, m.created_by, m.created_at, m.updated_at,
           m.host_user_id, m.meeting_type, m.provider,
           rel.entity_type, rel.entity_id
    FROM core.meetings m
    LEFT JOIN core.meeting_relations rel ON rel.meeting_id = m.id AND rel.workspace_id = p_workspace_id
    WHERE m.workspace_id = p_workspace_id
      AND m.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_m e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      -- AUTHORIZATION LOGIC
      AND (
        p_is_workspace_owner 
        OR (p_view = 'team' AND p_is_admin)
        OR v_user_to_check IS NULL
        OR m.created_by = v_user_to_check 
        OR m.host_user_id = v_user_to_check
        OR (p_include_participant_meetings = true AND EXISTS (
          SELECT 1 FROM core.meeting_participants mp 
          WHERE mp.meeting_id = m.id 
          AND (mp.internal_user_id = v_user_to_check OR (p_participant_email IS NOT NULL AND mp.external_email = p_participant_email))
        ))
      )
      -- NEW FILTERS
      AND (p_meeting_type IS NULL OR p_meeting_type = '' OR m.meeting_type = p_meeting_type)
      AND (p_provider IS NULL OR p_provider = '' OR m.provider = p_provider)
      AND (p_host_user_id IS NULL OR m.host_user_id = p_host_user_id)
      AND (p_statuses IS NULL OR array_length(p_statuses, 1) IS NULL OR m.status = ANY(p_statuses))
      AND (p_created_by_ids IS NULL OR array_length(p_created_by_ids, 1) IS NULL OR m.created_by = ANY(p_created_by_ids))
      AND (
        p_search_term IS NULL OR p_search_term = ''
        OR m.title ILIKE '%' || p_search_term || '%'
        OR m.description ILIKE '%' || p_search_term || '%'
      )
      AND (p_created_at_from IS NULL OR m.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR m.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR m.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR m.updated_at <= p_updated_at_to)
      AND (
        p_timeframe IS NULL OR p_timeframe = ''
        OR (p_timeframe = 'upcoming' AND m.scheduled_start >= NOW())
        OR (p_timeframe = 'past' AND m.scheduled_start < NOW())
        OR (p_timeframe = 'today' AND m.scheduled_start >= date_trunc('day', NOW()) AND m.scheduled_start < date_trunc('day', NOW()) + INTERVAL '1 day')
      )
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_meetings
  ),
  paginated_meetings AS (
    SELECT mm.*
    FROM matching_meetings mm
    ORDER BY mm.scheduled_start DESC NULLS LAST
    LIMIT CASE WHEN p_limit IS NOT NULL AND p_limit > 0 THEN p_limit ELSE NULL END
    OFFSET CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL AND p_page > 0 THEN (p_page - 1) * p_limit ELSE 0 END
  )
  SELECT 
    (SELECT total_count FROM counted),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', pm.id,
      'workspace_id', pm.workspace_id,
      'title', pm.title,
      'description', pm.description,
      'scheduled_start', pm.scheduled_start,
      'scheduled_end', pm.scheduled_end,
      'location', pm.location,
      'meeting_link', pm.meeting_link,
      'status', pm.status,
      'meeting_type', pm.meeting_type,
      'provider', pm.provider,
      'host_user_id', pm.host_user_id,
      'created_by', pm.created_by,
      'created_at', pm.created_at,
      'updated_at', pm.updated_at,
      'entity_type', REPLACE(COALESCE(pm.entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(pm.entity_id, p_entity_id),
      'entity_name', public.get_entity_name(REPLACE(COALESCE(pm.entity_type, p_entity_type, 'lead'), 'sales_', ''), COALESCE(pm.entity_id, p_entity_id)),
      'created_by_user', (SELECT jsonb_build_object('name', acc.name, 'email', acc.email) FROM public.accounts acc WHERE acc.id = pm.created_by),
      'participants', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', mp.id,
          'meeting_id', mp.meeting_id,
          'internal_user_id', mp.internal_user_id,
          'external_email', mp.external_email,
          'participant_type', mp.participant_type,
          'status', mp.response_status,
          'user_name', acc.name,
          'user_email', acc.email
        ))
        FROM core.meeting_participants mp
        LEFT JOIN public.accounts acc ON acc.id = mp.internal_user_id
        WHERE mp.meeting_id = pm.id
      ), '[]'::jsonb),
      'relations', COALESCE((
        SELECT jsonb_agg(row_to_json(mr))
        FROM core.meeting_relations mr
        WHERE mr.meeting_id = pm.id
      ), '[]'::jsonb)
    ) ORDER BY pm.scheduled_start DESC NULLS LAST), '[]'::jsonb)
  INTO v_total, v_data
  FROM paginated_meetings pm;

  RETURN jsonb_build_object(
    'data', COALESCE(v_data, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', COALESCE(p_page, 1),
    'limit', COALESCE(p_limit, COALESCE(v_total, 0)),
    'has_more', CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL THEN (p_page * p_limit) < COALESCE(v_total, 0) ELSE FALSE END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_core_meetings TO authenticated, anon, service_role;

-- ============================================================
-- 3. Fix get_core_email_activity
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_email_activity(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INT,
  p_offset INT,
  p_user_id UUID,
  p_search TEXT DEFAULT NULL,
  p_direction TEXT DEFAULT NULL,
  p_account_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_entity_email TEXT;
  v_data JSONB;
BEGIN
  -- 1. Resolve Entity Email Address
  IF p_entity_type IN ('lead', 'sales_lead') THEN
    SELECT email INTO v_entity_email FROM public.crm_leads WHERE id = p_entity_id;
  ELSIF p_entity_type IN ('contact', 'sales_contact') THEN
    SELECT email INTO v_entity_email FROM public.crm_contacts WHERE id = p_entity_id;
  END IF;

  IF v_entity_email IS NOT NULL THEN
    v_entity_email := LOWER(TRIM(v_entity_email));
  END IF;

  -- 2. Fetch and aggregate emails efficiently
  WITH accessible_emails AS (
    SELECT id, LOWER(email) as email FROM core.email_accounts 
    WHERE workspace_id = p_workspace_id AND is_active = true
      AND (access_scope = 'workspace' OR owner_user_id = p_user_id)
  ),
  direct_emails AS (
    SELECT e.id, e.thread_id, e.thread_key, e.in_reply_to, e.internet_message_id, e.provider_message_id
    FROM core.emails e
    WHERE e.workspace_id = p_workspace_id
      AND e.is_deleted = false
      AND (
        e.id IN (SELECT email_id FROM core.email_relations WHERE entity_type = p_entity_type AND entity_id = p_entity_id)
        OR (v_entity_email IS NOT NULL AND (LOWER(e.from_email) = v_entity_email OR v_entity_email = ANY(SELECT LOWER(t) FROM jsonb_array_elements_text(e.to_emails) t) OR LOWER(e.to_email) = v_entity_email))
      )
  ),
  matching_emails AS (
    SELECT e.*
    FROM core.emails e
    WHERE e.workspace_id = p_workspace_id
      AND e.is_deleted = false
      AND (
        e.id IN (SELECT id FROM direct_emails)
        OR (e.thread_id IS NOT NULL AND e.thread_id IN (SELECT thread_id FROM direct_emails WHERE thread_id IS NOT NULL))
        OR (e.thread_key IS NOT NULL AND e.thread_key IN (SELECT thread_key FROM direct_emails WHERE thread_key IS NOT NULL))
        OR (e.in_reply_to IS NOT NULL AND e.in_reply_to IN (SELECT internet_message_id FROM direct_emails WHERE internet_message_id IS NOT NULL))
      )
      -- Optional filters
      AND (p_search IS NULL OR p_search = '' OR e.subject ILIKE '%' || p_search || '%' OR e.text_body ILIKE '%' || p_search || '%')
      AND (
        p_direction IS NULL OR p_direction = 'all'
        OR (p_direction = 'inbound' AND LOWER(e.to_email) IN (SELECT email FROM accessible_emails))
        OR (p_direction = 'outbound' AND LOWER(e.from_email) IN (SELECT email FROM accessible_emails))
      )
      AND (p_account_email IS NULL OR p_account_email = '' OR e.email_account_id IN (SELECT id FROM core.email_accounts WHERE LOWER(email) = LOWER(p_account_email)))
      -- Privacy filter (must involve an accessible account)
      AND (
         e.email_account_id IN (SELECT id FROM accessible_emails)
         OR LOWER(e.from_email) IN (SELECT email FROM accessible_emails)
         OR LOWER(e.to_email) IN (SELECT email FROM accessible_emails)
         OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(e.to_emails) t 
            WHERE LOWER(t) IN (SELECT email FROM accessible_emails)
         )
      )
      -- Lead email specific filter (prevent dumping the whole inbox if lead is a connected account)
      AND (
        e.id IN (SELECT id FROM direct_emails) -- directly linked overrides this check
        OR v_entity_email IS NULL
        OR (
          -- Lead is a participant
          (LOWER(e.from_email) = v_entity_email OR v_entity_email = ANY(SELECT LOWER(t) FROM jsonb_array_elements_text(e.to_emails) t) OR LOWER(e.to_email) = v_entity_email)
          -- AND Workspace is a participant (excluding the lead)
          AND (
             (LOWER(e.from_email) IN (SELECT email FROM accessible_emails WHERE email != v_entity_email))
             OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(e.to_emails) t 
                WHERE LOWER(t) IN (SELECT email FROM accessible_emails WHERE email != v_entity_email)
             )
             OR (LOWER(e.to_email) IN (SELECT email FROM accessible_emails WHERE email != v_entity_email))
          )
        )
      )
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_emails
  ),
  paginated AS (
    SELECT m.*, 
      (SELECT jsonb_agg(row_to_json(r)) FROM core.email_relations r WHERE r.email_id = m.id) as email_relations 
    FROM matching_emails m
    ORDER BY m.received_at DESC NULLS LAST, m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'count', COALESCE((SELECT total_count FROM counted), 0),
    'data', COALESCE((SELECT jsonb_agg(row_to_json(paginated)) FROM paginated), '[]'::jsonb)
  ) INTO v_data;

  RETURN v_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_core_email_activity TO authenticated, service_role, anon;

-- ============================================================
-- 4. Fix get_core_reminders (Using core.reminders)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_reminders(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_created_by_ids UUID[] DEFAULT NULL,
  p_created_at_from TIMESTAMPTZ DEFAULT NULL,
  p_created_at_to TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_to TIMESTAMPTZ DEFAULT NULL,
  p_is_workspace_owner BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT NULL,
  p_limit INT DEFAULT NULL,
  p_module TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
BEGIN
  CREATE TEMP TABLE temp_rel_entities_r(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities_r VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities_r (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities_r (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities_r (entity_type, entity_id)
      SELECT 'account', c.account_id FROM public.crm_contacts c WHERE c.id = p_entity_id AND c.account_id IS NOT NULL;
    END IF;
  END IF;

  WITH matching_reminders AS (
    SELECT DISTINCT r.id, r.workspace_id, r.title, r.description, r.due_at, r.completed_at,
           r.status, r.priority, r.created_by, r.assigned_to, r.created_at, r.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.reminders r
    LEFT JOIN core.reminder_relations rel ON rel.reminder_id = r.id AND rel.workspace_id = p_workspace_id
    WHERE r.workspace_id = p_workspace_id
      AND r.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_r e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_priority IS NULL OR r.priority = p_priority)
      AND (p_search_term IS NULL OR r.title ILIKE '%' || p_search_term || '%' OR r.description ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR r.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR r.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR r.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR r.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR r.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR r.created_by = p_user_id OR r.assigned_to = p_user_id)
  )
  SELECT COUNT(*) INTO v_total FROM matching_reminders;

  WITH matching_reminders AS (
    SELECT DISTINCT r.id, r.workspace_id, r.title, r.description, r.due_at, r.completed_at,
           r.status, r.priority, r.created_by, r.assigned_to, r.created_at, r.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.reminders r
    LEFT JOIN core.reminder_relations rel ON rel.reminder_id = r.id AND rel.workspace_id = p_workspace_id
    WHERE r.workspace_id = p_workspace_id
      AND r.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_r e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_priority IS NULL OR r.priority = p_priority)
      AND (p_search_term IS NULL OR r.title ILIKE '%' || p_search_term || '%' OR r.description ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR r.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR r.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR r.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR r.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR r.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR r.created_by = p_user_id OR r.assigned_to = p_user_id)
    ORDER BY r.created_at DESC
    LIMIT COALESCE(p_limit, 1000)
    OFFSET COALESCE((p_page - 1) * p_limit, 0)
  )
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'workspace_id', r.workspace_id,
      'title', r.title,
      'description', r.description,
      'due_at', r.due_at,
      'completed_at', r.completed_at,
      'status', r.status,
      'priority', r.priority,
      'created_by', r.created_by,
      'assigned_to', r.assigned_to,
      'created_at', r.created_at,
      'updated_at', r.updated_at,
      'entity_type', REPLACE(COALESCE(r.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(r.rel_entity_id, p_entity_id),
      'entity_name', public.get_entity_name(REPLACE(COALESCE(r.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''), COALESCE(r.rel_entity_id, p_entity_id)),
      'created_by_user', (
        SELECT jsonb_build_object('name', a.name, 'email', a.email)
        FROM public.accounts a
        WHERE a.id = r.created_by
      ),
      'assigned_to_user', (
        SELECT jsonb_build_object('name', a.name, 'email', a.email)
        FROM public.accounts a
        WHERE a.id = r.assigned_to
      )
    )), '[]'::jsonb)
  INTO v_data
  FROM matching_reminders r;

  RETURN jsonb_build_object(
    'data', v_data,
    'total', v_total,
    'page', p_page,
    'limit', p_limit,
    'has_more', (COALESCE(p_page, 1) * COALESCE(p_limit, 1000)) < v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Fix get_core_documents (Using core.documents)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_documents(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_created_by_ids UUID[] DEFAULT NULL,
  p_created_at_from TIMESTAMPTZ DEFAULT NULL,
  p_created_at_to TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_to TIMESTAMPTZ DEFAULT NULL,
  p_is_workspace_owner BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT NULL,
  p_limit INT DEFAULT NULL,
  p_module TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
BEGIN
  CREATE TEMP TABLE temp_rel_entities_d(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities_d VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities_d (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities_d (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities_d (entity_type, entity_id)
      SELECT 'account', c.account_id FROM public.crm_contacts c WHERE c.id = p_entity_id AND c.account_id IS NOT NULL;
    END IF;
  END IF;

  WITH matching_documents AS (
    SELECT DISTINCT d.id, d.workspace_id, d.name, d.file_path, d.file_type, d.file_size as size_bytes, 
           d.created_by, d.created_at, d.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.documents d
    LEFT JOIN core.document_relations rel ON rel.document_id = d.id AND rel.workspace_id = p_workspace_id
    WHERE d.workspace_id = p_workspace_id
      AND d.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_d e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_type IS NULL OR d.file_type ILIKE '%' || p_type || '%')
      AND (p_search_term IS NULL OR d.name ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR d.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR d.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR d.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR d.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR d.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR d.created_by = p_user_id)
  )
  SELECT COUNT(*) INTO v_total FROM matching_documents;

  WITH matching_documents AS (
    SELECT DISTINCT d.id, d.workspace_id, d.name, d.file_path, d.file_type, d.file_size as size_bytes, 
           d.created_by, d.created_at, d.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.documents d
    LEFT JOIN core.document_relations rel ON rel.document_id = d.id AND rel.workspace_id = p_workspace_id
    WHERE d.workspace_id = p_workspace_id
      AND d.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_d e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_type IS NULL OR d.file_type ILIKE '%' || p_type || '%')
      AND (p_search_term IS NULL OR d.name ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR d.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR d.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR d.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR d.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR d.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR d.created_by = p_user_id)
    ORDER BY d.created_at DESC
    LIMIT COALESCE(p_limit, 1000)
    OFFSET COALESCE((p_page - 1) * p_limit, 0)
  )
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'workspace_id', d.workspace_id,
      'name', d.name,
      'file_path', d.file_path,
      'file_type', d.file_type,
      'size_bytes', d.size_bytes,
      'created_by', d.created_by,
      'created_at', d.created_at,
      'updated_at', d.updated_at,
      'entity_type', REPLACE(COALESCE(d.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(d.rel_entity_id, p_entity_id),
      'entity_name', public.get_entity_name(REPLACE(COALESCE(d.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''), COALESCE(d.rel_entity_id, p_entity_id)),
      'created_by_user', (
        SELECT jsonb_build_object('name', a.name, 'email', a.email)
        FROM public.accounts a
        WHERE a.id = d.created_by
      )
    )), '[]'::jsonb)
  INTO v_data
  FROM matching_documents d;

  RETURN jsonb_build_object(
    'data', v_data,
    'total', v_total,
    'page', p_page,
    'limit', p_limit,
    'has_more', (COALESCE(p_page, 1) * COALESCE(p_limit, 1000)) < v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. Fix get_core_notes (Using core.notes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_notes(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_created_by_ids UUID[] DEFAULT NULL,
  p_created_at_from TIMESTAMPTZ DEFAULT NULL,
  p_created_at_to TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_to TIMESTAMPTZ DEFAULT NULL,
  p_is_workspace_owner BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT NULL,
  p_limit INT DEFAULT NULL,
  p_module TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
BEGIN
  CREATE TEMP TABLE temp_rel_entities_n(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities_n VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities_n (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities_n (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities_n (entity_type, entity_id)
      SELECT 'account', c.account_id FROM public.crm_contacts c WHERE c.id = p_entity_id AND c.account_id IS NOT NULL;
    END IF;
  END IF;

  WITH matching_notes AS (
    SELECT DISTINCT n.id, n.workspace_id, n.note as note, n.created_by, n.created_at, n.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.notes n
    LEFT JOIN core.note_relations rel ON rel.note_id = n.id AND rel.workspace_id = p_workspace_id
    WHERE n.workspace_id = p_workspace_id
      AND n.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_n e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_search_term IS NULL OR n.note ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR n.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR n.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR n.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR n.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR n.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR n.created_by = p_user_id)
  )
  SELECT COUNT(*) INTO v_total FROM matching_notes;

  WITH matching_notes AS (
    SELECT DISTINCT n.id, n.workspace_id, n.note as note, n.created_by, n.created_at, n.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.notes n
    LEFT JOIN core.note_relations rel ON rel.note_id = n.id AND rel.workspace_id = p_workspace_id
    WHERE n.workspace_id = p_workspace_id
      AND n.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_n e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_search_term IS NULL OR n.note ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR n.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR n.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR n.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR n.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR n.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR n.created_by = p_user_id)
    ORDER BY n.created_at DESC
    LIMIT COALESCE(p_limit, 1000)
    OFFSET COALESCE((p_page - 1) * p_limit, 0)
  )
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', n.id,
      'workspace_id', n.workspace_id,
      'note', n.note,
      'created_by', n.created_by,
      'created_at', n.created_at,
      'updated_at', n.updated_at,
      'entity_type', REPLACE(COALESCE(n.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(n.rel_entity_id, p_entity_id),
      'entity_name', public.get_entity_name(REPLACE(COALESCE(n.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''), COALESCE(n.rel_entity_id, p_entity_id)),
      'created_by_user', (
        SELECT jsonb_build_object('name', a.name, 'email', a.email)
        FROM public.accounts a
        WHERE a.id = n.created_by
      )
    )), '[]'::jsonb)
  INTO v_data
  FROM matching_notes n;

  RETURN jsonb_build_object(
    'data', v_data,
    'total', v_total,
    'page', p_page,
    'limit', p_limit,
    'has_more', (COALESCE(p_page, 1) * COALESCE(p_limit, 1000)) < v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. Fix get_core_tasks (Using core.tasks)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_core_tasks(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.get_core_tasks(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT);
CREATE OR REPLACE FUNCTION public.get_core_tasks(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_created_by_ids UUID[] DEFAULT NULL,
  p_created_at_from TIMESTAMPTZ DEFAULT NULL,
  p_created_at_to TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_to TIMESTAMPTZ DEFAULT NULL,
  p_is_workspace_owner BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT NULL,
  p_limit INT DEFAULT NULL,
  p_module TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
BEGIN
  CREATE TEMP TABLE temp_rel_entities_t(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities_t VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities_t (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities_t (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities_t (entity_type, entity_id)
      SELECT 'account', c.account_id FROM public.crm_contacts c WHERE c.id = p_entity_id AND c.account_id IS NOT NULL;
    END IF;
  END IF;

  WITH matching_tasks AS (
    SELECT DISTINCT t.id, t.workspace_id, t.title, t.description, t.due_date as due_at, t.completed_at,
           (CASE WHEN t.is_completed THEN 'completed' ELSE 'open' END) as status, t.priority, t.created_by, t.created_at, t.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.tasks t
    LEFT JOIN core.task_relations rel ON rel.task_id = t.id AND rel.workspace_id = p_workspace_id
    WHERE t.workspace_id = p_workspace_id
      AND t.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_t e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_status IS NULL OR (CASE WHEN t.is_completed THEN 'completed' ELSE 'open' END) = p_status)
      AND (p_priority IS NULL OR t.priority = p_priority)
      AND (p_search_term IS NULL OR t.title ILIKE '%' || p_search_term || '%' OR t.description ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR t.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR t.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR t.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR t.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR t.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR t.created_by = p_user_id)
  )
  SELECT COUNT(*) INTO v_total FROM matching_tasks;

  WITH matching_tasks AS (
    SELECT DISTINCT t.id, t.workspace_id, t.title, t.description, t.due_date as due_at, t.completed_at,
           (CASE WHEN t.is_completed THEN 'completed' ELSE 'open' END) as status, t.priority, t.created_by, t.created_at, t.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.tasks t
    LEFT JOIN core.task_relations rel ON rel.task_id = t.id AND rel.workspace_id = p_workspace_id
    WHERE t.workspace_id = p_workspace_id
      AND t.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_t e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (
        p_module IS NULL 
        OR (p_module = 'sales' AND (rel.entity_type IN ('lead', 'contact', 'account', 'opportunity', 'sales_lead', 'sales_contact', 'sales_account', 'sales_opportunity')))
        OR (p_module = 'service' AND rel.entity_type IN ('ticket', 'service_ticket'))
      )
      AND (p_status IS NULL OR (CASE WHEN t.is_completed THEN 'completed' ELSE 'open' END) = p_status)
      AND (p_priority IS NULL OR t.priority = p_priority)
      AND (p_search_term IS NULL OR t.title ILIKE '%' || p_search_term || '%' OR t.description ILIKE '%' || p_search_term || '%')
      AND (p_created_by_ids IS NULL OR t.created_by = ANY(p_created_by_ids))
      AND (p_created_at_from IS NULL OR t.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR t.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR t.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR t.updated_at <= p_updated_at_to)
      AND (p_is_workspace_owner OR p_user_id IS NULL OR t.created_by = p_user_id)
    ORDER BY t.created_at DESC
    LIMIT COALESCE(p_limit, 1000)
    OFFSET COALESCE((p_page - 1) * p_limit, 0)
  )
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'workspace_id', t.workspace_id,
      'title', t.title,
      'description', t.description,
      'due_at', t.due_at,
      'completed_at', t.completed_at,
      'status', t.status,
      'priority', t.priority,
      'created_by', t.created_by,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'entity_type', REPLACE(COALESCE(t.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(t.rel_entity_id, p_entity_id),
      'entity_name', public.get_entity_name(REPLACE(COALESCE(t.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''), COALESCE(t.rel_entity_id, p_entity_id)),
      'created_by_user', (
        SELECT jsonb_build_object('name', a.name, 'email', a.email)
        FROM public.accounts a
        WHERE a.id = t.created_by
      )
    )), '[]'::jsonb)
  INTO v_data
  FROM matching_tasks t;

  RETURN jsonb_build_object(
    'data', v_data,
    'total', v_total,
    'page', p_page,
    'limit', p_limit,
    'has_more', (COALESCE(p_page, 1) * COALESCE(p_limit, 1000)) < v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_core_reminders TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_core_documents TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_core_notes TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_core_tasks TO authenticated, anon, service_role;
