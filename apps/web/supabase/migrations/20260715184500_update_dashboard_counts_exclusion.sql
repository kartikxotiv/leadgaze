-- Migration: Update Dashboard Stats to exclude specific statuses from totals
-- Migration: Update RPC function for Sales Dashboard Stats
-- Purpose: Add date filtering parameters (p_date_from, p_date_to) to the dashboard stats RPC
-- to support the "Created On" filter from the frontend.

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
GRANT EXECUTE ON FUNCTION get_sales_dashboard_stats(UUID, BOOLEAN, UUID[], UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated,anon,service_role;

-- Migration: Update RPC function for Service Cloud Dashboard Stats
-- Purpose: Add date filtering parameters (p_date_from, p_date_to) to the service cloud dashboard stats RPC
-- to support the "Created On" filter from the frontend.

CREATE OR REPLACE FUNCTION get_service_cloud_dashboard_stats(
  p_workspace_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_total_tickets INT;
  v_open_tickets INT;
  v_customers INT;
  v_organizations INT;
  v_total_logged_seconds INT;
  v_status_breakdown JSON;
  v_priority_breakdown JSON;
  v_customer_breakdown JSON;
  v_ticket_time_breakdown JSON;
  v_assignee_workload JSON;
  v_open_ticket_aging JSON;
  v_time_by_ticket JSON;
  v_recent_tickets JSON;
BEGIN
  -- 1. Simple count metrics
  SELECT COUNT(*)::INT FROM service_cloud.tickets t
  LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
  WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
    AND (ts.lifecycle IS NULL OR ts.lifecycle != 'closed')
    AND (p_date_from IS NULL OR t.created_at >= p_date_from)
    AND (p_date_to IS NULL OR t.created_at <= p_date_to)
  INTO v_total_tickets;

  SELECT COUNT(*)::INT FROM service_cloud.tickets t
  LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
  WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
    AND ts.lifecycle = 'open'
    AND (p_date_from IS NULL OR t.created_at >= p_date_from)
    AND (p_date_to IS NULL OR t.created_at <= p_date_to)
  INTO v_open_tickets;

  SELECT COUNT(*)::INT FROM service_cloud.customers
  WHERE workspace_id = p_workspace_id AND is_deleted = false
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
  INTO v_customers;

  SELECT COUNT(*)::INT FROM service_cloud.organizations
  WHERE workspace_id = p_workspace_id AND is_deleted = false
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
  INTO v_organizations;

  SELECT COALESCE(SUM(duration_seconds), 0)::INT
  FROM service_cloud.time_entries
  WHERE workspace_id = p_workspace_id
    AND (p_date_from IS NULL OR logged_date >= p_date_from::date)
    AND (p_date_to IS NULL OR logged_date <= p_date_to::date)
  INTO v_total_logged_seconds;

  -- 2. Status breakdown (with lifecycle, color, count, loggedSeconds)
  SELECT json_agg(t) INTO v_status_breakdown FROM (
    SELECT
      ts.id,
      ts.name,
      ts.lifecycle,
      ts.color,
      COUNT(t.id)::INT as count,
      COALESCE(SUM(t.total_logged_seconds), 0)::INT as "loggedSeconds"
    FROM service_cloud.ticket_statuses ts
    LEFT JOIN service_cloud.tickets t ON t.status_id = ts.id
      AND t.workspace_id = p_workspace_id
      AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    WHERE ts.workspace_id = p_workspace_id
    GROUP BY ts.id, ts.name, ts.lifecycle, ts.color, ts.display_order
    ORDER BY ts.display_order
  ) t;

  -- 3. Priority breakdown (with color, count, openCount)
  SELECT json_agg(t) INTO v_priority_breakdown FROM (
    SELECT
      tp.id,
      tp.name,
      tp.color,
      COUNT(t.id)::INT as count,
      COUNT(t.id) FILTER (WHERE ts.lifecycle = 'open')::INT as "openCount"
    FROM service_cloud.ticket_priorities tp
    LEFT JOIN service_cloud.tickets t ON t.priority_id = tp.id
      AND t.workspace_id = p_workspace_id
      AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
    WHERE tp.workspace_id = p_workspace_id
    GROUP BY tp.id, tp.name, tp.color, tp.severity_order
    ORDER BY tp.severity_order
  ) t;

  -- 4. Customer pressure breakdown
  SELECT json_agg(t) INTO v_customer_breakdown FROM (
    SELECT
      c.id,
      c.name,
      c.email,
      o.name as organization,
      COUNT(t.id)::INT as "totalTickets",
      COUNT(t.id) FILTER (WHERE ts.lifecycle = 'open')::INT as "openTickets",
      COUNT(t.id) FILTER (WHERE ts.lifecycle IN ('resolved', 'closed'))::INT as "closedTickets",
      COALESCE(SUM(t.total_logged_seconds), 0)::INT as "loggedSeconds",
      MAX(t.created_at) as "latestTicketAt"
    FROM service_cloud.customers c
    LEFT JOIN service_cloud.tickets t ON t.customer_id = c.id
      AND t.workspace_id = p_workspace_id
      AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
    LEFT JOIN service_cloud.organizations o ON o.id = c.organization_id
    WHERE c.workspace_id = p_workspace_id AND c.is_deleted = false
      AND (p_date_from IS NULL OR c.created_at >= p_date_from)
      AND (p_date_to IS NULL OR c.created_at <= p_date_to)
    GROUP BY c.id, c.name, c.email, o.name
    ORDER BY "openTickets" DESC, "totalTickets" DESC
    LIMIT 12
  ) t;

  -- 5. Open ticket aging
  SELECT json_agg(t) INTO v_open_ticket_aging FROM (
    SELECT
      t.id,
      t.ticket_number as "ticketNumber",
      t.subject,
      ts.name as status,
      c.name as customer,
      COALESCE(a.name, a.email, 'Unassigned') as assignee,
      GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400))::INT as "daysOpen",
      t.due_date as "dueDate",
      COALESCE(t.total_logged_seconds, 0)::INT as "loggedSeconds"
    FROM service_cloud.tickets t
    LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
    LEFT JOIN service_cloud.customers c ON c.id = t.customer_id
    LEFT JOIN public.accounts a ON a.id = t.assigned_agent_id
    WHERE t.workspace_id = p_workspace_id
      AND t.is_deleted = false
      AND ts.lifecycle = 'open'
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    ORDER BY t.created_at ASC
    LIMIT 12
  ) t;

  -- 6. Recent tickets (with related data)
  SELECT json_agg(t) INTO v_recent_tickets FROM (
    SELECT
      t.id,
      t.ticket_number,
      t.subject,
      t.source,
      t.email_count,
      t.created_at,
      ts.name as status_name,
      ts.color as status_color,
      tp.name as priority_name,
      tp.color as priority_color,
      c.name as customer_name
    FROM service_cloud.tickets t
    LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
    LEFT JOIN service_cloud.ticket_priorities tp ON tp.id = t.priority_id
    LEFT JOIN service_cloud.customers c ON c.id = t.customer_id
    WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    ORDER BY t.created_at DESC
    LIMIT 8
  ) t;

  -- 7. Ticket time breakdown (top tickets by logged time)
  SELECT json_agg(t) INTO v_ticket_time_breakdown FROM (
    SELECT
      t.id,
      t.ticket_number as "ticketNumber",
      t.subject,
      ts.name as status,
      tp.name as priority,
      c.name as customer,
      COALESCE(a.name, a.email, 'Unassigned') as assignee,
      COALESCE(t.total_logged_seconds, 0)::INT as "loggedSeconds",
      COALESCE(t.email_count, 0)::INT as "emailCount",
      t.created_at as "createdAt"
    FROM service_cloud.tickets t
    LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
    LEFT JOIN service_cloud.ticket_priorities tp ON tp.id = t.priority_id
    LEFT JOIN service_cloud.customers c ON c.id = t.customer_id
    LEFT JOIN public.accounts a ON a.id = t.assigned_agent_id
    WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    ORDER BY "loggedSeconds" DESC
    LIMIT 12
  ) t;

  -- 8. Assignee workload
  SELECT json_agg(t) INTO v_assignee_workload FROM (
    SELECT
      COALESCE(t.assigned_agent_id::TEXT, 'unassigned') as id,
      COALESCE(a.name, a.email, 'Unassigned') as name,
      COUNT(t.id)::INT as "totalTickets",
      COUNT(t.id) FILTER (WHERE ts.lifecycle = 'open')::INT as "openTickets",
      COALESCE(SUM(t.total_logged_seconds), 0)::INT as "ticketLoggedSeconds",
      0::INT as "actualLoggedSeconds"
    FROM service_cloud.tickets t
    LEFT JOIN public.accounts a ON a.id = t.assigned_agent_id
    LEFT JOIN service_cloud.ticket_statuses ts ON ts.id = t.status_id
    WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    GROUP BY t.assigned_agent_id, a.name, a.email
    ORDER BY "openTickets" DESC
    LIMIT 12
  ) t;

  -- 9. Time by ticket
  SELECT json_agg(t) INTO v_time_by_ticket FROM (
    SELECT
      t.id,
      t.ticket_number as "ticketNumber",
      t.subject,
      c.name as customer,
      COUNT(te.id)::INT as entries,
      COALESCE(SUM(te.duration_seconds), 0)::INT as "loggedSeconds",
      MAX(te.logged_date) as "latestLoggedDate"
    FROM service_cloud.tickets t
    LEFT JOIN service_cloud.customers c ON c.id = t.customer_id
    LEFT JOIN service_cloud.time_entries te ON te.ticket_id = t.id AND te.workspace_id = p_workspace_id
      AND (p_date_from IS NULL OR te.logged_date >= p_date_from::date)
      AND (p_date_to IS NULL OR te.logged_date <= p_date_to::date)
    WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    GROUP BY t.id, t.ticket_number, t.subject, c.name
    HAVING COUNT(te.id) > 0
    ORDER BY "loggedSeconds" DESC
    LIMIT 12
  ) t;

  -- Return combined result matching the API response structure
  RETURN json_build_object(
    'totalTickets', v_total_tickets,
    'openTickets', v_open_tickets,
    'customers', v_customers,
    'organizations', v_organizations,
    'totalLoggedSeconds', v_total_logged_seconds,
    'recentTickets', COALESCE(v_recent_tickets, '[]'::json),
    'reports', json_build_object(
      'statusBreakdown', COALESCE(v_status_breakdown, '[]'::json),
      'priorityBreakdown', COALESCE(v_priority_breakdown, '[]'::json),
      'customerBreakdown', COALESCE(v_customer_breakdown, '[]'::json),
      'ticketTimeBreakdown', COALESCE(v_ticket_time_breakdown, '[]'::json),
      'assigneeWorkload', COALESCE(v_assignee_workload, '[]'::json),
      'openTicketAging', COALESCE(v_open_ticket_aging, '[]'::json),
      'timeByTicket', COALESCE(v_time_by_ticket, '[]'::json)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_service_cloud_dashboard_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, anon, service_role;
