-- Migration: Create RPC function for Sales Dashboard Stats
-- Purpose: Fetch all sales dashboard metrics in a single database transaction
-- to reduce API latency and eliminate multiple sequential SELECTs.
-- Hierarchy filtering is handled by the caller (pass p_is_all_visible + p_visible_user_ids).

CREATE OR REPLACE FUNCTION get_sales_dashboard_stats(
  p_workspace_id UUID,
  p_is_all_visible BOOLEAN DEFAULT TRUE,
  p_visible_user_ids UUID[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_leads_total INT;
  v_leads_new INT;
  v_contacts_total INT;
  v_accounts_total INT;
  v_opp_total_amount NUMERIC;
  v_opp_count INT;
  v_pipeline JSON;
  v_reminders JSON;
  v_meetings JSON;
  v_thirty_days_ago TIMESTAMPTZ;
  v_today TIMESTAMPTZ;
BEGIN
  v_thirty_days_ago := NOW() - INTERVAL '30 days';
  v_today := CURRENT_DATE;

  -- ============================================================
  -- 1. Leads total
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COUNT(*)::INT FROM crm_leads
    WHERE workspace_id = p_workspace_id AND is_deleted = false
    INTO v_leads_total;
  ELSE
    SELECT COUNT(*)::INT FROM crm_leads
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_leads_total;
  END IF;

  -- ============================================================
  -- 2. Leads new (last 30 days)
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COUNT(*)::INT FROM crm_leads
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND created_at >= v_thirty_days_ago
    INTO v_leads_new;
  ELSE
    SELECT COUNT(*)::INT FROM crm_leads
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND created_at >= v_thirty_days_ago
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_leads_new;
  END IF;

  -- ============================================================
  -- 3. Contacts total
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COUNT(*)::INT FROM crm_contacts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
    INTO v_contacts_total;
  ELSE
    SELECT COUNT(*)::INT FROM crm_contacts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_contacts_total;
  END IF;

  -- ============================================================
  -- 4. Accounts total
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COUNT(*)::INT FROM crm_accounts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
    INTO v_accounts_total;
  ELSE
    SELECT COUNT(*)::INT FROM crm_accounts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_accounts_total;
  END IF;

  -- ============================================================
  -- 5. Opportunities total amount + count
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COALESCE(SUM(amount), 0), COUNT(*)::INT
    FROM crm_opportunities
    WHERE workspace_id = p_workspace_id AND is_deleted = false
    INTO v_opp_total_amount, v_opp_count;
  ELSE
    SELECT COALESCE(SUM(amount), 0), COUNT(*)::INT
    FROM crm_opportunities
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_opp_total_amount, v_opp_count;
  END IF;

  -- ============================================================
  -- 6. Pipeline counts by status (using entity_statuses + crm_modules)
  -- ============================================================
  SELECT json_build_object(
    'newLeads', COALESCE((
      SELECT COUNT(*)::INT FROM crm_leads cl
      INNER JOIN entity_statuses es ON es.id = cl.status_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
        AND cm.module_key = 'leads' AND es.status_key = 'new'
        AND (p_is_all_visible OR cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
    ), 0),
    'contacted', COALESCE((
      SELECT COUNT(*)::INT FROM crm_leads cl
      INNER JOIN entity_statuses es ON es.id = cl.status_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
        AND cm.module_key = 'leads' AND es.status_key = 'contacted'
        AND (p_is_all_visible OR cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
    ), 0),
    'qualified', COALESCE((
      SELECT COUNT(*)::INT FROM crm_leads cl
      INNER JOIN entity_statuses es ON es.id = cl.status_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
        AND cm.module_key = 'leads' AND es.status_key = 'qualified'
        AND (p_is_all_visible OR cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
    ), 0),
    'proposalSent', COALESCE((
      SELECT COUNT(*)::INT FROM crm_opportunities co
      INNER JOIN entity_statuses es ON es.id = co.stage_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE co.workspace_id = p_workspace_id AND co.is_deleted = false
        AND cm.module_key = 'opportunities' AND es.status_key = 'propose'
        AND (p_is_all_visible OR co.owner_id = ANY(p_visible_user_ids) OR co.created_by = ANY(p_visible_user_ids))
    ), 0),
    'won', COALESCE((
      SELECT COUNT(*)::INT FROM crm_opportunities co
      INNER JOIN entity_statuses es ON es.id = co.stage_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE co.workspace_id = p_workspace_id AND co.is_deleted = false
        AND cm.module_key = 'opportunities' AND es.status_key = 'closed_won'
        AND (p_is_all_visible OR co.owner_id = ANY(p_visible_user_ids) OR co.created_by = ANY(p_visible_user_ids))
    ), 0)
  ) INTO v_pipeline;

  -- ============================================================
  -- 7a. Upcoming reminders (with entity names resolved via subqueries)
  -- ============================================================
  SELECT json_agg(t) INTO v_reminders FROM (
    SELECT
      r.id,
      r.title,
      r.due_date as "dueDate",
      r.entity_type as "entityType",
      r.entity_id as "entityId",
      CASE
        WHEN r.entity_type = 'lead' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_leads WHERE id = r.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_leads WHERE id = r.entity_id), '')), '')
        WHEN r.entity_type = 'contact' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_contacts WHERE id = r.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_contacts WHERE id = r.entity_id), '')), '')
        WHEN r.entity_type = 'account' THEN
          (SELECT account_name FROM crm_accounts WHERE id = r.entity_id)
        WHEN r.entity_type = 'opportunity' THEN
          (SELECT opportunity_name FROM crm_opportunities WHERE id = r.entity_id)
        ELSE NULL
      END as "entityName",
      'reminder' as type
    FROM crm_reminders r
    WHERE r.workspace_id = p_workspace_id
      AND r.is_deleted = false
      AND r.is_completed = false
      AND r.due_date >= v_today
      AND (p_is_all_visible OR r.created_by = p_user_id)
    ORDER BY r.due_date ASC
    LIMIT 10
  ) t;

  -- ============================================================
  -- 7b. Upcoming meetings (with entity names resolved via subqueries)
  -- ============================================================
  SELECT json_agg(t) INTO v_meetings FROM (
    SELECT
      m.id,
      m.title,
      m.start_time as "dueDate",
      m.entity_type as "entityType",
      m.entity_id as "entityId",
      CASE
        WHEN m.entity_type = 'lead' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_leads WHERE id = m.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_leads WHERE id = m.entity_id), '')), '')
        WHEN m.entity_type = 'contact' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_contacts WHERE id = m.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_contacts WHERE id = m.entity_id), '')), '')
        WHEN m.entity_type = 'account' THEN
          (SELECT account_name FROM crm_accounts WHERE id = m.entity_id)
        WHEN m.entity_type = 'opportunity' THEN
          (SELECT opportunity_name FROM crm_opportunities WHERE id = m.entity_id)
        ELSE NULL
      END as "entityName",
      'meeting' as type
    FROM crm_meetings m
    WHERE m.workspace_id = p_workspace_id
      AND m.is_deleted = false
      AND m.start_time >= NOW()
      AND (p_is_all_visible OR m.created_by = p_user_id)
    ORDER BY m.start_time ASC
    LIMIT 10
  ) t;

  -- Return combined result matching the existing API response structure
  RETURN json_build_object(
    'leads', json_build_object(
      'total', v_leads_total,
      'new', v_leads_new,
      'trend', CASE
        WHEN v_leads_total > 0 THEN ROUND((v_leads_new::NUMERIC / v_leads_total) * 100)::INT
        ELSE 0
      END
    ),
    'contacts', json_build_object(
      'total', v_contacts_total
    ),
    'accounts', json_build_object(
      'total', v_accounts_total
    ),
    'opportunities', json_build_object(
      'totalAmount', v_opp_total_amount,
      'count', v_opp_count
    ),
    'pipeline', v_pipeline,
    'reminders', COALESCE(v_reminders, '[]'::json),
    'meetings', COALESCE(v_meetings, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sales_dashboard_stats(UUID, BOOLEAN, UUID[], UUID) TO authenticated,anon,service_role;




ALTER TABLE service_cloud.time_entries
ADD COLUMN IF NOT EXISTS activities TEXT;
