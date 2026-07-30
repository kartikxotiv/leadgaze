-- Migration: Fix RPC function for Sales Dashboard Stats to use core.reminders and core.meetings
-- Purpose: The application migrated to core.reminders and core.meetings but get_sales_dashboard_stats was still querying crm_reminders and crm_meetings.

CREATE OR REPLACE FUNCTION get_sales_dashboard_stats(
  p_workspace_id UUID,
  p_is_all_visible BOOLEAN DEFAULT TRUE,
  p_visible_user_ids UUID[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
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
    SELECT COUNT(*)::INT FROM crm_leads cl
    WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
      AND (p_date_from IS NULL OR cl.created_at >= p_date_from)
      AND (p_date_to IS NULL OR cl.created_at <= p_date_to)
      AND cl.status_id NOT IN (
        SELECT es.id FROM entity_statuses es
        INNER JOIN crm_modules cm ON cm.id = es.module_id
        WHERE cm.module_key = 'leads' AND es.is_closed = true
      )
    INTO v_leads_total;
  ELSE
    SELECT COUNT(*)::INT FROM crm_leads cl
    WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
      AND (p_date_from IS NULL OR cl.created_at >= p_date_from)
      AND (p_date_to IS NULL OR cl.created_at <= p_date_to)
      AND (cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
      AND cl.status_id NOT IN (
        SELECT es.id FROM entity_statuses es
        INNER JOIN crm_modules cm ON cm.id = es.module_id
        WHERE cm.module_key = 'leads' AND es.is_closed = true
      )
    INTO v_leads_total;
  END IF;

  -- ============================================================
  -- 2. Leads new (last 30 days or based on date filter if provided)
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COUNT(*)::INT FROM crm_leads
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
      AND created_at >= v_thirty_days_ago
    INTO v_leads_new;
  ELSE
    SELECT COUNT(*)::INT FROM crm_leads
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
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
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
    INTO v_contacts_total;
  ELSE
    SELECT COUNT(*)::INT FROM crm_contacts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_contacts_total;
  END IF;

  -- ============================================================
  -- 4. Accounts total
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COUNT(*)::INT FROM crm_accounts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
    INTO v_accounts_total;
  ELSE
    SELECT COUNT(*)::INT FROM crm_accounts
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
      AND (owner_id = ANY(p_visible_user_ids) OR created_by = ANY(p_visible_user_ids))
    INTO v_accounts_total;
  END IF;

  -- ============================================================
  -- 5. Opportunities total amount + count
  -- Use base_amount_usd for currency-agnostic aggregation
  -- ============================================================
  IF p_is_all_visible THEN
    SELECT COALESCE(SUM(COALESCE(base_amount_usd, 0)), 0), COUNT(*)::INT
    FROM crm_opportunities
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
    INTO v_opp_total_amount, v_opp_count;
  ELSE
    SELECT COALESCE(SUM(COALESCE(base_amount_usd, 0)), 0), COUNT(*)::INT
    FROM crm_opportunities
    WHERE workspace_id = p_workspace_id AND is_deleted = false
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
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
        AND (p_date_from IS NULL OR cl.created_at >= p_date_from)
        AND (p_date_to IS NULL OR cl.created_at <= p_date_to)
        AND (p_is_all_visible OR cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
    ), 0),
    'contacted', COALESCE((
      SELECT COUNT(*)::INT FROM crm_leads cl
      INNER JOIN entity_statuses es ON es.id = cl.status_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
        AND cm.module_key = 'leads' AND es.status_key = 'contacted'
        AND (p_date_from IS NULL OR cl.created_at >= p_date_from)
        AND (p_date_to IS NULL OR cl.created_at <= p_date_to)
        AND (p_is_all_visible OR cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
    ), 0),
    'qualified', COALESCE((
      SELECT COUNT(*)::INT FROM crm_leads cl
      INNER JOIN entity_statuses es ON es.id = cl.status_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE cl.workspace_id = p_workspace_id AND cl.is_deleted = false
        AND cm.module_key = 'leads' AND es.status_key = 'qualified'
        AND (p_date_from IS NULL OR cl.created_at >= p_date_from)
        AND (p_date_to IS NULL OR cl.created_at <= p_date_to)
        AND (p_is_all_visible OR cl.owner_id = ANY(p_visible_user_ids) OR cl.created_by = ANY(p_visible_user_ids))
    ), 0),
    'proposalSent', COALESCE((
      SELECT COUNT(*)::INT FROM crm_opportunities co
      INNER JOIN entity_statuses es ON es.id = co.stage_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE co.workspace_id = p_workspace_id AND co.is_deleted = false
        AND cm.module_key = 'opportunities' AND es.status_key = 'propose'
        AND (p_date_from IS NULL OR co.created_at >= p_date_from)
        AND (p_date_to IS NULL OR co.created_at <= p_date_to)
        AND (p_is_all_visible OR co.owner_id = ANY(p_visible_user_ids) OR co.created_by = ANY(p_visible_user_ids))
    ), 0),
    'won', COALESCE((
      SELECT COUNT(*)::INT FROM crm_opportunities co
      INNER JOIN entity_statuses es ON es.id = co.stage_id
      INNER JOIN crm_modules cm ON cm.id = es.module_id
      WHERE co.workspace_id = p_workspace_id AND co.is_deleted = false
        AND cm.module_key = 'opportunities' AND es.status_key = 'closed_won'
        AND (p_date_from IS NULL OR co.created_at >= p_date_from)
        AND (p_date_to IS NULL OR co.created_at <= p_date_to)
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
      r.due_at as "dueDate",
      rr.entity_type as "entityType",
      rr.entity_id as "entityId",
      CASE
        WHEN rr.entity_type = 'sales_lead' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_leads WHERE id = rr.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_leads WHERE id = rr.entity_id), '')), '')
        WHEN rr.entity_type = 'sales_contact' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_contacts WHERE id = rr.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_contacts WHERE id = rr.entity_id), '')), '')
        WHEN rr.entity_type = 'sales_account' THEN
          (SELECT account_name FROM crm_accounts WHERE id = rr.entity_id)
        WHEN rr.entity_type = 'sales_opportunity' THEN
          (SELECT opportunity_name FROM crm_opportunities WHERE id = rr.entity_id)
        ELSE NULL
      END as "entityName",
      'reminder' as type
    FROM core.reminders r
    INNER JOIN core.reminder_relations rr ON rr.reminder_id = r.id
    WHERE r.workspace_id = p_workspace_id
      AND r.is_deleted = false
      AND r.status <> 'completed'
      AND r.due_at >= v_today
      AND (p_is_all_visible OR r.created_by = p_user_id)
    ORDER BY r.due_at ASC
    LIMIT 10
  ) t;

  -- ============================================================
  -- 7b. Upcoming meetings (with entity names resolved via subqueries)
  -- ============================================================
  SELECT json_agg(t) INTO v_meetings FROM (
    SELECT
      m.id,
      m.title,
      m.scheduled_start as "dueDate",
      mr.entity_type as "entityType",
      mr.entity_id as "entityId",
      CASE
        WHEN mr.entity_type = 'sales_lead' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_leads WHERE id = mr.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_leads WHERE id = mr.entity_id), '')), '')
        WHEN mr.entity_type = 'sales_contact' THEN
          NULLIF(TRIM(COALESCE((SELECT first_name FROM crm_contacts WHERE id = mr.entity_id), '') || ' ' ||
               COALESCE((SELECT last_name FROM crm_contacts WHERE id = mr.entity_id), '')), '')
        WHEN mr.entity_type = 'sales_account' THEN
          (SELECT account_name FROM crm_accounts WHERE id = mr.entity_id)
        WHEN mr.entity_type = 'sales_opportunity' THEN
          (SELECT opportunity_name FROM crm_opportunities WHERE id = mr.entity_id)
        ELSE NULL
      END as "entityName",
      'meeting' as type
    FROM core.meetings m
    INNER JOIN core.meeting_relations mr ON mr.meeting_id = m.id
    WHERE m.workspace_id = p_workspace_id
      AND m.is_deleted = false
      AND m.scheduled_start >= NOW()
      AND (p_is_all_visible OR m.created_by = p_user_id)
    ORDER BY m.scheduled_start ASC
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
