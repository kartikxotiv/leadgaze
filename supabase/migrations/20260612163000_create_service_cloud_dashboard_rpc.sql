-- Migration: Create RPC function for Service Cloud Dashboard Stats
-- Purpose: Fetch all dashboard metrics in a single database transaction
-- to reduce API latency and eliminate multiple sequential SELECTs.
-- All service cloud tables are in the service_cloud schema.

CREATE OR REPLACE FUNCTION get_service_cloud_dashboard_stats(
  p_workspace_id UUID
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
  SELECT COUNT(*)::INT FROM service_cloud.tickets
  WHERE workspace_id = p_workspace_id AND is_deleted = false
  INTO v_total_tickets;

  SELECT COUNT(*)::INT FROM service_cloud.tickets
  WHERE workspace_id = p_workspace_id AND is_deleted = false AND closed_at IS NULL
  INTO v_open_tickets;

  SELECT COUNT(*)::INT FROM service_cloud.customers
  WHERE workspace_id = p_workspace_id AND is_deleted = false
  INTO v_customers;

  SELECT COUNT(*)::INT FROM service_cloud.organizations
  WHERE workspace_id = p_workspace_id AND is_deleted = false
  INTO v_organizations;

  SELECT COALESCE(SUM(duration_seconds), 0)::INT
  FROM service_cloud.time_entries
  WHERE workspace_id = p_workspace_id
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
      COUNT(t.id) FILTER (WHERE t.closed_at IS NULL)::INT as "openCount"
    FROM service_cloud.ticket_priorities tp
    LEFT JOIN service_cloud.tickets t ON t.priority_id = tp.id
      AND t.workspace_id = p_workspace_id
      AND t.is_deleted = false
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
      COUNT(t.id) FILTER (WHERE t.closed_at IS NULL)::INT as "openTickets",
      COUNT(t.id) FILTER (WHERE t.closed_at IS NOT NULL)::INT as "closedTickets",
      COALESCE(SUM(t.total_logged_seconds), 0)::INT as "loggedSeconds",
      MAX(t.created_at) as "latestTicketAt"
    FROM service_cloud.customers c
    LEFT JOIN service_cloud.tickets t ON t.customer_id = c.id
      AND t.workspace_id = p_workspace_id
      AND t.is_deleted = false
    LEFT JOIN service_cloud.organizations o ON o.id = c.organization_id
    WHERE c.workspace_id = p_workspace_id AND c.is_deleted = false
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
      AND t.closed_at IS NULL
      AND (ts.lifecycle IS NULL OR ts.lifecycle NOT IN ('resolved', 'closed'))
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
    ORDER BY "loggedSeconds" DESC
    LIMIT 12
  ) t;

  -- 8. Assignee workload
  SELECT json_agg(t) INTO v_assignee_workload FROM (
    SELECT
      COALESCE(t.assigned_agent_id::TEXT, 'unassigned') as id,
      COALESCE(a.name, a.email, 'Unassigned') as name,
      COUNT(t.id)::INT as "totalTickets",
      COUNT(t.id) FILTER (WHERE t.closed_at IS NULL)::INT as "openTickets",
      COALESCE(SUM(t.total_logged_seconds), 0)::INT as "ticketLoggedSeconds",
      0::INT as "actualLoggedSeconds"
    FROM service_cloud.tickets t
    LEFT JOIN public.accounts a ON a.id = t.assigned_agent_id
    WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
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
    WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false
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
GRANT EXECUTE ON FUNCTION get_service_cloud_dashboard_stats(UUID) TO authenticated, anon, service_role;
