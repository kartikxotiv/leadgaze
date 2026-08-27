-- ============================================================
-- 1. get_core_tasks RPC Function (Optimized)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_tasks(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
) RETURNS JSONB AS $$
DECLARE
  v_is_completed BOOLEAN := (p_status = 'completed');
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
    SELECT DISTINCT t.id, t.workspace_id, t.title, t.description, t.due_date, t.priority,
           t.is_completed, t.completed_at, t.completed_by, t.created_by, t.created_at, t.updated_at,
           rel.entity_type as rel_entity_type, rel.entity_id as rel_entity_id
    FROM core.tasks t
    LEFT JOIN core.task_relations rel ON rel.task_id = t.id AND rel.workspace_id = p_workspace_id
    WHERE t.workspace_id = p_workspace_id
      AND t.is_deleted = FALSE
      AND t.is_completed = v_is_completed
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_t e
          WHERE (rel.entity_type = e.entity_type OR rel.entity_type = 'sales_' || e.entity_type)
            AND rel.entity_id = e.entity_id
        )
      )
  )
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'workspace_id', t.workspace_id,
      'title', t.title,
      'description', t.description,
      'due_date', t.due_date,
      'priority', t.priority,
      'is_completed', t.is_completed,
      'completed_at', t.completed_at,
      'completed_by', t.completed_by,
      'created_by', t.created_by,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'relations', COALESCE((
        SELECT jsonb_agg(row_to_json(tr))
        FROM core.task_relations tr
        WHERE tr.task_id = t.id
      ), '[]'::jsonb),
      'task_relations', COALESCE((
        SELECT jsonb_agg(row_to_json(tr))
        FROM core.task_relations tr
        WHERE tr.task_id = t.id
      ), '[]'::jsonb)
    ) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_data
  FROM matching_tasks t;

  RETURN v_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_core_tasks TO authenticated, anon, service_role;

-- ============================================================
-- 2. get_core_calls RPC Function (Optimized)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_core_calls(
  p_workspace_id UUID,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_data JSONB;
BEGIN
  CREATE TEMP TABLE temp_rel_entities_c(entity_type TEXT, entity_id UUID) ON COMMIT DROP;

  IF p_entity_type IS NOT NULL AND p_entity_id IS NOT NULL THEN
    INSERT INTO temp_rel_entities_c VALUES (p_entity_type, p_entity_id);
    IF p_entity_type = 'opportunity' THEN
      INSERT INTO temp_rel_entities_c (entity_type, entity_id)
      SELECT 'account', o.account_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.account_id IS NOT NULL;
      INSERT INTO temp_rel_entities_c (entity_type, entity_id)
      SELECT 'contact', o.primary_contact_id FROM public.crm_opportunities o WHERE o.id = p_entity_id AND o.primary_contact_id IS NOT NULL;
    ELSIF p_entity_type = 'contact' THEN
      INSERT INTO temp_rel_entities_c (entity_type, entity_id)
      SELECT 'account', c.account_id FROM public.crm_contacts c WHERE c.id = p_entity_id AND c.account_id IS NOT NULL;
    END IF;
  END IF;

  WITH matching_calls AS (
    SELECT DISTINCT c.id, c.workspace_id, c.subject, c.comments, c.call_type,
           c.status, c.contact_name, c.date_time, c.created_by, c.created_at, c.updated_at,
           c.entity_type as rel_entity_type, c.entity_id as rel_entity_id
    FROM public.crm_call_logs c
    WHERE c.workspace_id = p_workspace_id
      AND c.is_deleted = FALSE
      AND (
        (p_entity_type IS NULL OR p_entity_id IS NULL)
        OR EXISTS (
          SELECT 1 FROM temp_rel_entities_c e
          WHERE (c.entity_type = e.entity_type OR c.entity_type = 'sales_' || e.entity_type)
            AND c.entity_id = e.entity_id
        )
      )
  )
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'workspace_id', c.workspace_id,
      'subject', c.subject,
      'comments', c.comments,
      'call_type', c.call_type,
      'status', c.status,
      'contact_name', c.contact_name,
      'date_time', c.date_time,
      'created_by', c.created_by,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'entity_type', c.rel_entity_type,
      'entity_id', c.rel_entity_id
    ) ORDER BY c.date_time DESC), '[]'::jsonb)
  INTO v_data
  FROM matching_calls c;

  RETURN v_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_core_calls TO authenticated, anon, service_role;
