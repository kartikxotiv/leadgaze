-- ============================================================
-- Fix get_core_tasks by removing assigned_to references
-- ============================================================

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
  p_limit INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_data JSONB;
  v_total INT;
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
    SELECT DISTINCT t.id
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

GRANT EXECUTE ON FUNCTION public.get_core_tasks TO authenticated, anon, service_role;
