-- Migration: Update fn_audit_log_trigger to detect soft deletions and record action = 'DELETE'
-- Description: When a record in core or crm tables is soft deleted (is_deleted = true or deleted_at IS NOT NULL),
-- the trigger now sets action = 'DELETE' instead of 'UPDATE'.

CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_module       VARCHAR(50);
  v_entity_name  VARCHAR(255) := NULL;
  v_action       VARCHAR(50);
  v_old_data     JSONB := NULL;
  v_new_data     JSONB := NULL;
  v_data         JSONB;
  v_product_key  VARCHAR(50);
BEGIN
  -- 1. Identify module
  v_module := TG_ARGV[0];

  -- 2. Determine product_key: explicit second arg wins, otherwise infer
  IF array_length(TG_ARGV, 1) > 1 THEN
    v_product_key := TG_ARGV[1];
  ELSE
    v_product_key := CASE
      WHEN v_module IN (
        'roles', 'team_members', 'notes', 'reminders', 'meetings', 'documents',
        'activities', 'settings', 'reports', 'emails', 'role_permissions', 'audit_logs',
        'core_notes', 'core_reminders', 'core_meetings', 'core_documents', 'core_emails'
      ) THEN 'common'
      WHEN v_module IN ('tasks', 'core_tasks', 'core_task_time_logs', 'call_logs') THEN 'sales'
      WHEN v_module LIKE 'hrms%'        THEN 'hrms'
      WHEN v_module LIKE 'inventory%'   THEN 'inventory'
      WHEN v_module LIKE 'service_cloud%' THEN 'service_cloud'
      WHEN v_module LIKE 'fundraising%' THEN 'funds'
      ELSE 'sales'
    END;
  END IF;

  -- 3. Populate action + data pointers
  IF (TG_OP = 'DELETE') THEN
    v_workspace_id := OLD.workspace_id;
    v_action       := 'DELETE';
    v_old_data     := to_jsonb(OLD);
    v_data         := v_old_data;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_workspace_id := NEW.workspace_id;
    v_old_data     := to_jsonb(OLD);
    v_new_data     := to_jsonb(NEW);
    v_data         := v_new_data;

    -- Check if this update represents a soft-deletion
    IF (
      ((v_new_data->>'is_deleted')::boolean IS TRUE AND COALESCE((v_old_data->>'is_deleted')::boolean, FALSE) IS FALSE)
      OR
      (v_new_data->>'deleted_at' IS NOT NULL AND v_old_data->>'deleted_at' IS NULL)
    ) THEN
      v_action := 'DELETE';
    ELSE
      v_action := 'UPDATE';
    END IF;
  ELSIF (TG_OP = 'INSERT') THEN
    v_workspace_id := NEW.workspace_id;
    v_action       := 'CREATE';
    v_new_data     := to_jsonb(NEW);
    v_data         := v_new_data;
  END IF;

  -- 4. Human-readable entity name
  CASE v_module
    WHEN 'leads', 'contacts' THEN
      v_entity_name := (v_data->>'first_name') || ' ' || COALESCE(v_data->>'last_name', '');
    WHEN 'accounts' THEN
      v_entity_name := v_data->>'account_name';
    WHEN 'opportunities' THEN
      v_entity_name := v_data->>'opportunity_name';
    WHEN 'team_members' THEN
      v_entity_name := COALESCE(
        v_data->>'email',
        'Internal User: ' || COALESCE(v_data->>'user_id', 'Unknown')
      );
    WHEN 'roles' THEN
      v_entity_name := v_data->>'role_name';
    WHEN 'role_permissions' THEN
      v_entity_name := 'Permissions for Role ID ' || COALESCE(v_data->>'role_id', 'Unknown');
    WHEN 'notes' THEN
      v_entity_name := 'Note on ' || COALESCE(v_data->>'entity_type', 'Entity')
                       || ' ' || COALESCE(v_data->>'entity_id', '');
    WHEN 'reminders', 'meetings' THEN
      v_entity_name := v_data->>'title';
    WHEN 'documents' THEN
      v_entity_name := v_data->>'name';
    WHEN 'core_notes' THEN
      v_entity_name := 'Note: ' || LEFT(COALESCE(v_data->>'note', '(empty)'), 60);
    WHEN 'core_reminders', 'core_meetings' THEN
      v_entity_name := v_data->>'title';
    WHEN 'core_documents' THEN
      v_entity_name := v_data->>'name';
    WHEN 'core_emails', 'emails' THEN
      v_entity_name := COALESCE(v_data->>'subject', 'Email');
    WHEN 'tasks', 'core_tasks' THEN
      v_entity_name := v_data->>'title';
    WHEN 'core_task_time_logs' THEN
      v_entity_name := 'Time log: '
                       || COALESCE(v_data->>'duration_minutes', '?')
                       || ' min on Task ' || COALESCE(v_data->>'task_id', 'Unknown');
    WHEN 'call_logs' THEN
      v_entity_name := COALESCE(v_data->>'subject', 'Call Log');
    WHEN 'service_cloud_tickets' THEN
      v_entity_name := 'Ticket #' || COALESCE(v_data->>'ticket_number', '?')
                       || ': ' || COALESCE(v_data->>'subject', '');
    WHEN 'service_cloud_customers',
         'service_cloud_organizations',
         'service_cloud_teams',
         'service_cloud_statuses',
         'service_cloud_priorities',
         'service_cloud_categories' THEN
      v_entity_name := v_data->>'name';
    WHEN 'service_cloud_ticket_assignees' THEN
      v_entity_name := 'Assignee on Ticket '
                       || COALESCE(v_data->>'ticket_id', 'Unknown')
                       || ' (role: ' || COALESCE(v_data->>'assignment_role', 'unknown') || ')';
    WHEN 'service_cloud_time_entries' THEN
      v_entity_name := 'Time Entry on Ticket '
                       || COALESCE(v_data->>'ticket_id', 'Unknown')
                       || ': ' || COALESCE(v_data->>'duration_seconds', '?') || 's';
    WHEN 'service_cloud_team_members' THEN
      v_entity_name := 'Team Member on Team '
                       || COALESCE(v_data->>'team_id', 'Unknown');
    ELSE
      v_entity_name := v_module || ' #' || COALESCE(v_data->>'id', 'Unknown');
  END CASE;

  -- 5. Insert audit log row
  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    module,
    action,
    entity_id,
    entity_name,
    old_data,
    new_data,
    product_key
  ) VALUES (
    v_workspace_id,
    auth.uid(),
    v_module,
    v_action,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_entity_name,
    v_old_data,
    v_new_data,
    v_product_key
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
