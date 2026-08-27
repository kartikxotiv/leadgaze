-- ============================================================
-- 1. get_core_meetings RPC Function (Optimized and fixed)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_core_meetings(UUID, TEXT, UUID, TEXT[], TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS public.get_core_meetings(UUID, TEXT, UUID, TEXT[], TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT);

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
  -- NEW PARAMETERS TO SUPPORT API
  p_meeting_type TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_host_user_id UUID DEFAULT NULL,
  p_view TEXT DEFAULT 'my',
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_include_participant_meetings BOOLEAN DEFAULT FALSE,
  p_participant_user_id UUID DEFAULT NULL,
  p_participant_email TEXT DEFAULT NULL
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
      -- END NEW FILTERS
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

GRANT EXECUTE ON FUNCTION public.get_core_meetings(UUID, TEXT, UUID, TEXT[], TEXT, TEXT, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, UUID, INT, INT, TEXT, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, UUID, TEXT) TO authenticated, anon, service_role;
