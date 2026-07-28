/*
 * -------------------------------------------------------
 * Migration: Register Service Cloud RBAC and Defaults
 * Date: 2026-06-03
 * Description: Registers Service Cloud modules/features in the shared
 *              Leadgaze RBAC tables and seeds default statuses, priorities,
 *              categories, and a default support team for existing workspaces.
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. Register Service Cloud Modules
-- =====================================================

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system)
VALUES
  ('service_cloud', 'Service Cloud Dashboard', 'Service Cloud dashboard and high-level helpdesk management', 60, TRUE),
  ('service_cloud_customers', 'Service Cloud Customers', 'Manage support customer organizations and contacts', 61, TRUE),
  ('service_cloud_tickets', 'Service Cloud Tickets', 'Create, assign, communicate on, and resolve support tickets', 62, TRUE),
  ('service_cloud_inboxes', 'Service Cloud Email Accounts', 'Manage support email accounts and ticket email routing settings powered by core email', 63, TRUE),
  ('service_cloud_teams', 'Service Cloud Teams', 'Manage support teams and team membership', 64, TRUE),
  ('service_cloud_time_tracking', 'Service Cloud Time Tracking', 'Log and report support effort spent on tickets', 65, TRUE),
  ('service_cloud_reports', 'Service Cloud Reports', 'View ticket, agent, team, time, and status analytics', 66, TRUE),
  ('service_cloud_settings', 'Service Cloud Settings', 'Manage ticket statuses, priorities, categories, and module configuration', 67, TRUE)
ON CONFLICT (module_key) DO NOTHING;

-- =====================================================
-- 2. Register Service Cloud Module Features
-- =====================================================

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Service Cloud' AS feature_name, 'View Service Cloud dashboard, KPIs, and module overview' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'manage', 'Manage Service Cloud', 'Manage high-level Service Cloud administration', 'action', 2
) f
WHERE m.module_key = 'service_cloud'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Customers' AS feature_name, 'View customer organizations and contacts' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Customers', 'Create customer organizations and contacts', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Customers', 'Edit customer organizations and contacts', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Customers', 'Delete or archive customer records', 'crud', 4
  UNION ALL SELECT 'export', 'Export Customers', 'Export customer support data', 'export', 5
) f
WHERE m.module_key = 'service_cloud_customers'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Tickets' AS feature_name, 'View support tickets and conversations' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Tickets', 'Create new support tickets', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Tickets', 'Edit ticket fields and classification', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Tickets', 'Delete or archive support tickets', 'crud', 4
  UNION ALL SELECT 'assign', 'Assign Tickets', 'Assign or reassign tickets to agents and teams', 'action', 5
  UNION ALL SELECT 'change_status', 'Change Status', 'Move tickets through statuses', 'action', 6
  UNION ALL SELECT 'reply', 'Reply To Customers', 'Send public replies to customers', 'action', 7
  UNION ALL SELECT 'add_internal_note', 'Add Internal Notes', 'Add private internal notes to tickets', 'action', 8
  UNION ALL SELECT 'upload_document', 'Upload Documents', 'Upload ticket and conversation documents through Core Documents', 'action', 9
  UNION ALL SELECT 'close', 'Close Tickets', 'Resolve and close support tickets', 'action', 10
  UNION ALL SELECT 'export', 'Export Tickets', 'Export ticket data', 'export', 11
) f
WHERE m.module_key = 'service_cloud_tickets'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Email Accounts' AS feature_name, 'View support email accounts' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Email Accounts', 'Connect support email accounts through Core Email', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Email Accounts', 'Edit support email routing and sync settings', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Email Accounts', 'Disconnect or delete support email accounts', 'crud', 4
  UNION ALL SELECT 'sync', 'Sync Email Accounts', 'Trigger or manage support email synchronization', 'action', 5
) f
WHERE m.module_key = 'service_cloud_inboxes'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Teams' AS feature_name, 'View support teams and membership' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Teams', 'Create support teams', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Teams', 'Edit support teams', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Teams', 'Delete support teams', 'crud', 4
  UNION ALL SELECT 'manage_members', 'Manage Team Members', 'Add or remove agents from support teams', 'action', 5
) f
WHERE m.module_key = 'service_cloud_teams'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Time Entries' AS feature_name, 'View time logged on tickets' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'log', 'Log Time', 'Create ticket time entries', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Time Entries', 'Edit ticket time entries', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Time Entries', 'Delete ticket time entries', 'crud', 4
  UNION ALL SELECT 'export', 'Export Time Entries', 'Export time tracking data', 'export', 5
) f
WHERE m.module_key = 'service_cloud_time_tracking'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Reports' AS feature_name, 'View Service Cloud reports and analytics' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'export', 'Export Reports', 'Export Service Cloud reporting data', 'export', 2
) f
WHERE m.module_key = 'service_cloud_reports'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'manage_statuses' AS feature_key, 'Manage Statuses' AS feature_name, 'Create and update ticket statuses' AS description, 'action' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'manage_priorities', 'Manage Priorities', 'Create and update ticket priorities', 'action', 2
  UNION ALL SELECT 'manage_categories', 'Manage Categories', 'Create and update ticket categories', 'action', 3
  UNION ALL SELECT 'manage_notifications', 'Manage Notifications', 'Manage Service Cloud notification settings', 'action', 4
) f
WHERE m.module_key = 'service_cloud_settings'
ON CONFLICT (module_id, feature_key) DO NOTHING;

-- =====================================================
-- 3. Seed Default Permissions For Existing Workspaces
-- =====================================================

DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_user_role_id UUID;
  v_viewer_role_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT DISTINCT workspace_id FROM public.workspace_roles
  LOOP
    SELECT id INTO v_admin_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'admin'
      LIMIT 1;

    SELECT id INTO v_manager_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'manager'
      LIMIT 1;

    SELECT id INTO v_user_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'user'
      LIMIT 1;

    SELECT id INTO v_viewer_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'viewer'
      LIMIT 1;

    INSERT INTO public.role_permissions (
      workspace_id,
      role_id,
      module_feature_id,
      can_access,
      access_level,
      can_view_sensitive_data,
      can_override_owner
    )
    SELECT
      v_workspace_id,
      v_admin_role_id,
      f.id,
      TRUE,
      'all'::public.permission_access_level,
      TRUE,
      TRUE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_admin_role_id IS NOT NULL
      AND m.module_key IN (
        'service_cloud',
        'service_cloud_customers',
        'service_cloud_tickets',
        'service_cloud_inboxes',
        'service_cloud_teams',
        'service_cloud_time_tracking',
        'service_cloud_reports',
        'service_cloud_settings'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_admin_role_id
          AND rp.module_feature_id = f.id
      );

    INSERT INTO public.role_permissions (
      workspace_id,
      role_id,
      module_feature_id,
      can_access,
      access_level,
      can_view_sensitive_data,
      can_override_owner
    )
    SELECT
      v_workspace_id,
      v_manager_role_id,
      f.id,
      TRUE,
      'team'::public.permission_access_level,
      FALSE,
      FALSE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_manager_role_id IS NOT NULL
      AND m.module_key IN (
        'service_cloud',
        'service_cloud_customers',
        'service_cloud_tickets',
        'service_cloud_inboxes',
        'service_cloud_teams',
        'service_cloud_time_tracking',
        'service_cloud_reports',
        'service_cloud_settings'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_manager_role_id
          AND rp.module_feature_id = f.id
      );

    INSERT INTO public.role_permissions (
      workspace_id,
      role_id,
      module_feature_id,
      can_access,
      access_level,
      can_view_sensitive_data,
      can_override_owner
    )
    SELECT
      v_workspace_id,
      v_user_role_id,
      f.id,
      CASE
        WHEN f.feature_key IN (
          'delete',
          'manage',
          'manage_members',
          'manage_statuses',
          'manage_priorities',
          'manage_categories',
          'manage_notifications',
          'sync',
          'export'
        ) THEN FALSE
        ELSE TRUE
      END,
      CASE
        WHEN f.feature_key IN (
          'delete',
          'manage',
          'manage_members',
          'manage_statuses',
          'manage_priorities',
          'manage_categories',
          'manage_notifications',
          'sync',
          'export'
        ) THEN 'none'::public.permission_access_level
        ELSE 'own'::public.permission_access_level
      END,
      FALSE,
      FALSE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_user_role_id IS NOT NULL
      AND m.module_key IN (
        'service_cloud',
        'service_cloud_customers',
        'service_cloud_tickets',
        'service_cloud_inboxes',
        'service_cloud_teams',
        'service_cloud_time_tracking',
        'service_cloud_reports',
        'service_cloud_settings'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_user_role_id
          AND rp.module_feature_id = f.id
      );

    INSERT INTO public.role_permissions (
      workspace_id,
      role_id,
      module_feature_id,
      can_access,
      access_level,
      can_view_sensitive_data,
      can_override_owner
    )
    SELECT
      v_workspace_id,
      v_viewer_role_id,
      f.id,
      CASE
        WHEN f.feature_key IN ('view', 'export') THEN TRUE
        ELSE FALSE
      END,
      CASE
        WHEN f.feature_key IN ('view', 'export') THEN 'all'::public.permission_access_level
        ELSE 'none'::public.permission_access_level
      END,
      FALSE,
      FALSE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_viewer_role_id IS NOT NULL
      AND m.module_key IN (
        'service_cloud',
        'service_cloud_customers',
        'service_cloud_tickets',
        'service_cloud_inboxes',
        'service_cloud_teams',
        'service_cloud_time_tracking',
        'service_cloud_reports',
        'service_cloud_settings'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_viewer_role_id
          AND rp.module_feature_id = f.id
      );
  END LOOP;
END $$;

-- =====================================================
-- 4. Seed Default Service Cloud Data For Existing Workspaces
-- =====================================================

DO $$
DECLARE
  v_workspace_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT id FROM public.workspaces
  LOOP
    INSERT INTO service_cloud.teams (workspace_id, name, description, is_default, is_active)
    VALUES
      (v_workspace_id, 'Support Team', 'Default Service Cloud support team', TRUE, TRUE)
    ON CONFLICT (workspace_id, name) DO NOTHING;

    INSERT INTO service_cloud.ticket_statuses (
      workspace_id,
      name,
      status_key,
      lifecycle,
      description,
      color,
      display_order,
      is_default,
      is_system
    )
    VALUES
      (v_workspace_id, 'New', 'new', 'new', 'Newly created support request', '#2563eb', 1, TRUE, TRUE),
      (v_workspace_id, 'Open', 'open', 'open', 'Ticket is open and awaiting action', '#0891b2', 2, FALSE, TRUE),
      (v_workspace_id, 'In Progress', 'in_progress', 'in_progress', 'Agent is actively working on the ticket', '#ca8a04', 3, FALSE, TRUE),
      (v_workspace_id, 'Waiting For Customer', 'waiting_for_customer', 'waiting', 'Waiting for customer response or confirmation', '#9333ea', 4, FALSE, TRUE),
      (v_workspace_id, 'Resolved', 'resolved', 'resolved', 'Issue has been resolved but not closed', '#16a34a', 5, FALSE, TRUE),
      (v_workspace_id, 'Closed', 'closed', 'closed', 'Ticket is closed', '#475569', 6, FALSE, TRUE)
    ON CONFLICT (workspace_id, status_key) DO NOTHING;

    INSERT INTO service_cloud.ticket_priorities (
      workspace_id,
      name,
      priority_key,
      severity_order,
      color,
      response_due_minutes,
      resolution_due_minutes,
      is_default,
      is_system
    )
    VALUES
      (v_workspace_id, 'Low', 'low', 1, '#64748b', 1440, 10080, FALSE, TRUE),
      (v_workspace_id, 'Medium', 'medium', 2, '#2563eb', 480, 2880, TRUE, TRUE),
      (v_workspace_id, 'High', 'high', 3, '#ca8a04', 240, 1440, FALSE, TRUE),
      (v_workspace_id, 'Urgent', 'urgent', 4, '#ea580c', 60, 480, FALSE, TRUE),
      (v_workspace_id, 'Critical', 'critical', 5, '#dc2626', 30, 240, FALSE, TRUE)
    ON CONFLICT (workspace_id, priority_key) DO NOTHING;

    INSERT INTO service_cloud.ticket_categories (
      workspace_id,
      name,
      category_key,
      description,
      display_order,
      is_system
    )
    VALUES
      (v_workspace_id, 'Technical Issue', 'technical_issue', 'Technical support and troubleshooting requests', 1, TRUE),
      (v_workspace_id, 'Billing', 'billing', 'Billing, payment, and invoice questions', 2, TRUE),
      (v_workspace_id, 'Refund', 'refund', 'Refund requests and refund status questions', 3, TRUE),
      (v_workspace_id, 'Complaint', 'complaint', 'Customer complaints and dissatisfaction reports', 4, TRUE),
      (v_workspace_id, 'Feature Request', 'feature_request', 'Customer requests for product features', 5, TRUE),
      (v_workspace_id, 'Product Inquiry', 'product_inquiry', 'Questions about product usage, plans, or capabilities', 6, TRUE)
    ON CONFLICT (workspace_id, category_key) DO NOTHING;
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA service_cloud TO authenticated, service_role, anon;
