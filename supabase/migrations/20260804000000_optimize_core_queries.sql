-- Migration: Optimize Core Queries via RPC Functions with Server-Side Pagination
-- Single roundtrip RPC functions for Reminders, Meetings, Documents, and Notes

-- Drop existing functions (including older signatures without pagination parameters)
DROP FUNCTION IF EXISTS public.get_core_reminders(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.get_core_reminders(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT);

DROP FUNCTION IF EXISTS public.get_core_meetings(UUID, TEXT, UUID, TEXT[], TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.get_core_meetings(UUID, TEXT, UUID, TEXT[], TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT);

DROP FUNCTION IF EXISTS public.get_core_documents(UUID, TEXT, UUID, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.get_core_documents(UUID, TEXT, UUID, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT);

DROP FUNCTION IF EXISTS public.get_core_notes(UUID, TEXT, UUID, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.get_core_notes(UUID, TEXT, UUID, TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT);

-- ============================================================
-- 1. get_core_reminders RPC Function
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
  p_limit INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
BEGIN
  CREATE TEMP TABLE temp_rel_entities(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities (entity_type, entity_id)
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
          SELECT 1 FROM temp_rel_entities e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (p_is_workspace_owner OR p_user_id IS NULL OR r.created_by = p_user_id)
      AND (
        p_status IS NULL 
        OR (p_status = 'completed' AND r.status = 'completed')
        OR (p_status = 'active' AND r.status <> 'completed')
      )
      AND (p_priority IS NULL OR p_priority = 'all' OR r.priority = p_priority)
      AND (p_created_by_ids IS NULL OR array_length(p_created_by_ids, 1) IS NULL OR r.created_by = ANY(p_created_by_ids))
      AND (
        p_search_term IS NULL OR p_search_term = ''
        OR r.title ILIKE '%' || p_search_term || '%'
        OR r.description ILIKE '%' || p_search_term || '%'
      )
      AND (p_created_at_from IS NULL OR r.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR r.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR r.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR r.updated_at <= p_updated_at_to)
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_reminders
  ),
  paginated_reminders AS (
    SELECT mr.*
    FROM matching_reminders mr
    ORDER BY mr.due_at ASC
    LIMIT CASE WHEN p_limit IS NOT NULL AND p_limit > 0 THEN p_limit ELSE NULL END
    OFFSET CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL AND p_page > 0 THEN (p_page - 1) * p_limit ELSE 0 END
  )
  SELECT 
    (SELECT total_count FROM counted),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', pr.id,
      'workspace_id', pr.workspace_id,
      'title', pr.title,
      'description', pr.description,
      'due_date', pr.due_at,
      'completed_at', pr.completed_at,
      'status', pr.status,
      'priority', pr.priority,
      'created_by', pr.created_by,
      'assigned_to', pr.assigned_to,
      'created_at', pr.created_at,
      'updated_at', pr.updated_at,
      'entity_type', REPLACE(COALESCE(pr.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(pr.rel_entity_id, p_entity_id),
      'entity_name', CASE 
        WHEN pr.rel_entity_type IN ('lead', 'sales_lead') THEN (SELECT COALESCE(l.company_name, NULLIF(TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')), ''), 'Lead') FROM public.crm_leads l WHERE l.id = pr.rel_entity_id)
        WHEN pr.rel_entity_type IN ('contact', 'sales_contact') THEN (SELECT COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), 'Contact') FROM public.crm_contacts c WHERE c.id = pr.rel_entity_id)
        WHEN pr.rel_entity_type IN ('account', 'sales_account') THEN (SELECT COALESCE(a.account_name, 'Account') FROM public.crm_accounts a WHERE a.id = pr.rel_entity_id)
        WHEN pr.rel_entity_type IN ('opportunity', 'sales_opportunity') THEN (SELECT COALESCE(o.opportunity_name, 'Opportunity') FROM public.crm_opportunities o WHERE o.id = pr.rel_entity_id)
        ELSE ''
      END,
      'created_by_user', (SELECT jsonb_build_object('name', acc.name, 'email', acc.email) FROM public.accounts acc WHERE acc.id = pr.created_by),
      'assigned_to_user', (SELECT jsonb_build_object('name', acc.name, 'email', acc.email) FROM public.accounts acc WHERE acc.id = pr.assigned_to)
    ) ORDER BY pr.due_at ASC), '[]'::jsonb)
  INTO v_total, v_data
  FROM paginated_reminders pr;

  RETURN jsonb_build_object(
    'data', COALESCE(v_data, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', COALESCE(p_page, 1),
    'limit', COALESCE(p_limit, COALESCE(v_total, 0)),
    'has_more', CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL THEN (p_page * p_limit) < COALESCE(v_total, 0) ELSE FALSE END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_core_reminders TO authenticated, anon, service_role;

-- ============================================================
-- 2. get_core_meetings RPC Function
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
  p_limit INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_total INT := 0;
  v_data JSONB;
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
    SELECT DISTINCT m.id, m.workspace_id, m.title, m.description, m.start_time, m.end_time,
           m.location, m.meeting_link, m.status, m.created_by, m.created_at, m.updated_at,
           m.entity_type, m.entity_id
    FROM public.crm_meetings m
    WHERE m.workspace_id = p_workspace_id
      AND m.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_m e
          WHERE (m.entity_type = e.entity_type OR m.entity_type = 'sales_' || e.entity_type)
            AND m.entity_id = e.entity_id
        )
      )
      AND (p_is_workspace_owner OR p_user_id IS NULL OR m.created_by = p_user_id)
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
        OR (p_timeframe = 'upcoming' AND m.start_time >= NOW())
        OR (p_timeframe = 'past' AND m.start_time < NOW())
        OR (p_timeframe = 'today' AND m.start_time >= date_trunc('day', NOW()) AND m.start_time < date_trunc('day', NOW()) + INTERVAL '1 day')
      )
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_meetings
  ),
  paginated_meetings AS (
    SELECT mm.*
    FROM matching_meetings mm
    ORDER BY mm.start_time DESC
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
      'start_time', pm.start_time,
      'end_time', pm.end_time,
      'location', pm.location,
      'meeting_link', pm.meeting_link,
      'status', pm.status,
      'created_by', pm.created_by,
      'created_at', pm.created_at,
      'updated_at', pm.updated_at,
      'entity_type', REPLACE(COALESCE(pm.entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(pm.entity_id, p_entity_id),
      'entity_name', CASE 
        WHEN pm.entity_type IN ('lead', 'sales_lead') THEN (SELECT COALESCE(l.company_name, NULLIF(TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')), ''), 'Lead') FROM public.crm_leads l WHERE l.id = pm.entity_id)
        WHEN pm.entity_type IN ('contact', 'sales_contact') THEN (SELECT COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), 'Contact') FROM public.crm_contacts c WHERE c.id = pm.entity_id)
        WHEN pm.entity_type IN ('account', 'sales_account') THEN (SELECT COALESCE(a.account_name, 'Account') FROM public.crm_accounts a WHERE a.id = pm.entity_id)
        WHEN pm.entity_type IN ('opportunity', 'sales_opportunity') THEN (SELECT COALESCE(o.opportunity_name, 'Opportunity') FROM public.crm_opportunities o WHERE o.id = pm.entity_id)
        ELSE ''
      END,
      'created_by_user', (SELECT jsonb_build_object('name', acc.name, 'email', acc.email) FROM public.accounts acc WHERE acc.id = pm.created_by),
      'participants', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', mp.id,
          'meeting_id', mp.meeting_id,
          'user_id', mp.user_id,
          'user_name', acc.name,
          'user_email', acc.email
        ))
        FROM public.crm_meeting_participants mp
        LEFT JOIN public.accounts acc ON acc.id = mp.user_id
        WHERE mp.meeting_id = pm.id
      ), '[]'::jsonb)
    ) ORDER BY pm.start_time DESC), '[]'::jsonb)
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
-- 3. get_core_documents RPC Function
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
  p_limit INT DEFAULT NULL
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

  WITH matching_docs AS (
    SELECT DISTINCT d.id, d.workspace_id, d.name, d.description, d.file_path, d.file_url,
           d.file_type, d.file_size, d.category, d.is_deleted, d.deleted_at, d.created_by,
           d.created_at, d.updated_at,
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
      AND (p_is_workspace_owner OR p_user_id IS NULL OR d.created_by = p_user_id)
      AND (p_created_by_ids IS NULL OR array_length(p_created_by_ids, 1) IS NULL OR d.created_by = ANY(p_created_by_ids))
      AND (
        p_search_term IS NULL OR p_search_term = ''
        OR d.name ILIKE '%' || p_search_term || '%'
        OR d.description ILIKE '%' || p_search_term || '%'
      )
      AND (p_created_at_from IS NULL OR d.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR d.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR d.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR d.updated_at <= p_updated_at_to)
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_docs
  ),
  paginated_docs AS (
    SELECT md.*
    FROM matching_docs md
    ORDER BY md.created_at DESC
    LIMIT CASE WHEN p_limit IS NOT NULL AND p_limit > 0 THEN p_limit ELSE NULL END
    OFFSET CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL AND p_page > 0 THEN (p_page - 1) * p_limit ELSE 0 END
  )
  SELECT 
    (SELECT total_count FROM counted),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', pd.id,
      'workspace_id', pd.workspace_id,
      'name', pd.name,
      'description', pd.description,
      'file_path', pd.file_path,
      'file_url', pd.file_url,
      'file_type', pd.file_type,
      'size_bytes', COALESCE(pd.file_size, 0),
      'category', pd.category,
      'is_deleted', pd.is_deleted,
      'deleted_at', pd.deleted_at,
      'created_by', pd.created_by,
      'created_at', pd.created_at,
      'updated_at', pd.updated_at,
      'entity_type', REPLACE(COALESCE(pd.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(pd.rel_entity_id, p_entity_id),
      'entity_name', CASE 
        WHEN pd.rel_entity_type IN ('lead', 'sales_lead') THEN (SELECT COALESCE(l.company_name, NULLIF(TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')), ''), 'Lead') FROM public.crm_leads l WHERE l.id = pd.rel_entity_id)
        WHEN pd.rel_entity_type IN ('contact', 'sales_contact') THEN (SELECT COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), 'Contact') FROM public.crm_contacts c WHERE c.id = pd.rel_entity_id)
        WHEN pd.rel_entity_type IN ('account', 'sales_account') THEN (SELECT COALESCE(a.account_name, 'Account') FROM public.crm_accounts a WHERE a.id = pd.rel_entity_id)
        WHEN pd.rel_entity_type IN ('opportunity', 'sales_opportunity') THEN (SELECT COALESCE(o.opportunity_name, 'Opportunity') FROM public.crm_opportunities o WHERE o.id = pd.rel_entity_id)
        ELSE ''
      END,
      'created_by_user', (SELECT jsonb_build_object('name', acc.name, 'email', acc.email) FROM public.accounts acc WHERE acc.id = pd.created_by)
    ) ORDER BY pd.created_at DESC), '[]'::jsonb)
  INTO v_total, v_data
  FROM paginated_docs pd;

  RETURN jsonb_build_object(
    'data', COALESCE(v_data, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', COALESCE(p_page, 1),
    'limit', COALESCE(p_limit, COALESCE(v_total, 0)),
    'has_more', CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL THEN (p_page * p_limit) < COALESCE(v_total, 0) ELSE FALSE END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_core_documents TO authenticated, anon, service_role;

-- ============================================================
-- 4. get_core_notes RPC Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_notes(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_search_term TEXT DEFAULT NULL,
  p_created_by_ids UUID[] DEFAULT NULL,
  p_created_at_from TIMESTAMPTZ DEFAULT NULL,
  p_created_at_to TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_at_to TIMESTAMPTZ DEFAULT NULL,
  p_is_workspace_owner BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_page INT DEFAULT NULL,
  p_limit INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_is_closed BOOLEAN := (p_status = 'closed');
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
    SELECT DISTINCT n.id, n.workspace_id, n.note, n.is_closed, n.created_by, n.created_at, n.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.notes n
    LEFT JOIN core.note_relations rel ON rel.note_id = n.id AND rel.workspace_id = p_workspace_id
    WHERE n.workspace_id = p_workspace_id
      AND n.is_deleted = FALSE
      AND n.is_closed = v_is_closed
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_n e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
      AND (p_is_workspace_owner OR p_user_id IS NULL OR n.created_by = p_user_id)
      AND (p_created_by_ids IS NULL OR array_length(p_created_by_ids, 1) IS NULL OR n.created_by = ANY(p_created_by_ids))
      AND (
        p_search_term IS NULL OR p_search_term = ''
        OR n.note ILIKE '%' || p_search_term || '%'
      )
      AND (p_created_at_from IS NULL OR n.created_at >= p_created_at_from)
      AND (p_created_at_to IS NULL OR n.created_at <= p_created_at_to)
      AND (p_updated_at_from IS NULL OR n.updated_at >= p_updated_at_from)
      AND (p_updated_at_to IS NULL OR n.updated_at <= p_updated_at_to)
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_notes
  ),
  paginated_notes AS (
    SELECT mn.*
    FROM matching_notes mn
    ORDER BY mn.created_at DESC
    LIMIT CASE WHEN p_limit IS NOT NULL AND p_limit > 0 THEN p_limit ELSE NULL END
    OFFSET CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL AND p_page > 0 THEN (p_page - 1) * p_limit ELSE 0 END
  )
  SELECT 
    (SELECT total_count FROM counted),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', pn.id,
      'workspace_id', pn.workspace_id,
      'note', pn.note,
      'content', pn.note,
      'is_closed', pn.is_closed,
      'created_by', pn.created_by,
      'created_at', pn.created_at,
      'updated_at', pn.updated_at,
      'entity_type', REPLACE(COALESCE(pn.rel_entity_type, p_entity_type, 'lead'), 'sales_', ''),
      'entity_id', COALESCE(pn.rel_entity_id, p_entity_id),
      'entity_name', CASE 
        WHEN pn.rel_entity_type IN ('lead', 'sales_lead') THEN (SELECT COALESCE(l.company_name, NULLIF(TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')), ''), 'Lead') FROM public.crm_leads l WHERE l.id = pn.rel_entity_id)
        WHEN pn.rel_entity_type IN ('contact', 'sales_contact') THEN (SELECT COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), 'Contact') FROM public.crm_contacts c WHERE c.id = pn.rel_entity_id)
        WHEN pn.rel_entity_type IN ('account', 'sales_account') THEN (SELECT COALESCE(a.account_name, 'Account') FROM public.crm_accounts a WHERE a.id = pn.rel_entity_id)
        WHEN pn.rel_entity_type IN ('opportunity', 'sales_opportunity') THEN (SELECT COALESCE(o.opportunity_name, 'Opportunity') FROM public.crm_opportunities o WHERE o.id = pn.rel_entity_id)
        ELSE ''
      END,
      'created_by_user', (SELECT jsonb_build_object('name', acc.name, 'email', acc.email) FROM public.accounts acc WHERE acc.id = pn.created_by)
    ) ORDER BY pn.created_at DESC), '[]'::jsonb)
  INTO v_total, v_data
  FROM paginated_notes pn;

  RETURN jsonb_build_object(
    'data', COALESCE(v_data, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', COALESCE(p_page, 1),
    'limit', COALESCE(p_limit, COALESCE(v_total, 0)),
    'has_more', CASE WHEN p_page IS NOT NULL AND p_limit IS NOT NULL THEN (p_page * p_limit) < COALESCE(v_total, 0) ELSE FALSE END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_core_notes TO authenticated, anon, service_role;
