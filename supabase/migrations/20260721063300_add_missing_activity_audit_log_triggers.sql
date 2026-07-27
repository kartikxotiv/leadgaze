/*
 * -------------------------------------------------------
 * Migration: Add Missing Audit Log Triggers for Sales & Service Activity Tables
 * Date: 2026-07-21
 * Description:
 *   Plugs all gaps identified in the audit log gap analysis:
 *
 *   SALES gaps:
 *     - core.tasks              (Tasks – new core schema, never had a trigger)
 *     - core.task_time_logs     (Task time logs – never had a trigger)
 *     - public.crm_call_logs    (Call Logs – never had a trigger)
 *     - core.notes              (Notes migrated from crm_notes; old trigger is now stale)
 *     - core.reminders          (Reminders migrated from crm_reminders; old trigger stale)
 *     - core.meetings           (Meetings migrated from crm_meetings; old trigger stale)
 *     - core.documents          (Documents migrated from crm_documents; old trigger stale)
 *
 *   SERVICE gaps (global public.audit_logs):
 *     - service_cloud.ticket_assignees  (only in ticket_activities, not audit_logs)
 *     - service_cloud.time_entries      (only in ticket_activities, not audit_logs)
 *     - service_cloud.team_members      (no trigger anywhere)
 *
 *   Also updates fn_audit_log_trigger to add entity name formatting for all new
 *   module keys and to correctly infer product_key for 'common' core tables.
 * -------------------------------------------------------
 */

-- ================================================================
-- 1. Update fn_audit_log_trigger with new entity name cases and
--    product_key inference for new module keys.
-- ================================================================

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
      -- Core / shared activity tables → common
      WHEN v_module IN (
        'roles', 'team_members', 'notes', 'reminders', 'meetings', 'documents',
        'activities', 'settings', 'reports', 'emails', 'role_permissions', 'audit_logs',
        'core_notes', 'core_reminders', 'core_meetings', 'core_documents'
      ) THEN 'common'
      -- Tasks and call logs are sales-owned but shared; default to sales
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
    v_action       := 'UPDATE';
    v_old_data     := to_jsonb(OLD);
    v_new_data     := to_jsonb(NEW);
    v_data         := v_new_data;
  ELSIF (TG_OP = 'INSERT') THEN
    v_workspace_id := NEW.workspace_id;
    v_action       := 'CREATE';
    v_new_data     := to_jsonb(NEW);
    v_data         := v_new_data;
  END IF;

  -- 4. Human-readable entity name
  CASE v_module
    -- ── Sales core entities ──────────────────────────────────────
    WHEN 'leads', 'contacts' THEN
      v_entity_name := (v_data->>'first_name') || ' ' || COALESCE(v_data->>'last_name', '');
    WHEN 'accounts' THEN
      v_entity_name := v_data->>'account_name';
    WHEN 'opportunities' THEN
      v_entity_name := v_data->>'opportunity_name';

    -- ── Admin tables ─────────────────────────────────────────────
    WHEN 'team_members' THEN
      v_entity_name := COALESCE(
        v_data->>'email',
        'Internal User: ' || COALESCE(v_data->>'user_id', 'Unknown')
      );
    WHEN 'roles' THEN
      v_entity_name := v_data->>'role_name';
    WHEN 'role_permissions' THEN
      v_entity_name := 'Permissions for Role ID ' || COALESCE(v_data->>'role_id', 'Unknown');

    -- ── Legacy public.crm_* activity tables (stale but kept) ─────
    WHEN 'notes' THEN
      v_entity_name := 'Note on ' || COALESCE(v_data->>'entity_type', 'Entity')
                       || ' ' || COALESCE(v_data->>'entity_id', '');
    WHEN 'reminders', 'meetings' THEN
      v_entity_name := v_data->>'title';
    WHEN 'documents' THEN
      v_entity_name := v_data->>'name';

    -- ── New core.* activity tables ───────────────────────────────
    WHEN 'core_notes' THEN
      -- core.notes stores content in the 'note' column
      v_entity_name := 'Note: ' || LEFT(COALESCE(v_data->>'note', '(empty)'), 60);
    WHEN 'core_reminders' THEN
      v_entity_name := v_data->>'title';
    WHEN 'core_meetings' THEN
      v_entity_name := v_data->>'title';
    WHEN 'core_documents' THEN
      v_entity_name := v_data->>'name';

    -- ── Tasks ────────────────────────────────────────────────────
    WHEN 'tasks', 'core_tasks' THEN
      v_entity_name := v_data->>'title';
    WHEN 'core_task_time_logs' THEN
      v_entity_name := 'Time log: '
                       || COALESCE(v_data->>'duration_minutes', '?')
                       || ' min on Task ' || COALESCE(v_data->>'task_id', 'Unknown');

    -- ── Call Logs ────────────────────────────────────────────────
    WHEN 'call_logs' THEN
      v_entity_name := COALESCE(v_data->>'subject', 'Call Log');

    -- ── Service Cloud core entities ──────────────────────────────
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

    -- ── Service Cloud activity tables ─────────────────────────────
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

    -- ── Fallback ──────────────────────────────────────────────────
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


-- ================================================================
-- 2. SALES — New core schema activity triggers
--    (The old public.crm_* triggers remain but are now stale since
--     the app writes to core.* tables. New triggers added below.)
-- ================================================================

-- ── core.notes ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_core_notes ON core.notes;
CREATE TRIGGER tr_audit_log_core_notes
  AFTER INSERT OR UPDATE OR DELETE ON core.notes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('core_notes', 'common');

-- ── core.reminders ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_core_reminders ON core.reminders;
CREATE TRIGGER tr_audit_log_core_reminders
  AFTER INSERT OR UPDATE OR DELETE ON core.reminders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('core_reminders', 'common');

-- ── core.meetings ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_core_meetings ON core.meetings;
CREATE TRIGGER tr_audit_log_core_meetings
  AFTER INSERT OR UPDATE OR DELETE ON core.meetings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('core_meetings', 'common');

-- ── core.documents ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_core_documents ON core.documents;
CREATE TRIGGER tr_audit_log_core_documents
  AFTER INSERT OR UPDATE OR DELETE ON core.documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('core_documents', 'common');


-- ================================================================
-- 3. SALES — Tasks (core schema, brand new feature)
-- ================================================================

-- ── core.tasks ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_core_tasks ON core.tasks;
CREATE TRIGGER tr_audit_log_core_tasks
  AFTER INSERT OR UPDATE OR DELETE ON core.tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('core_tasks', 'sales');

-- ── core.task_time_logs ──────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_core_task_time_logs ON core.task_time_logs;
CREATE TRIGGER tr_audit_log_core_task_time_logs
  AFTER INSERT OR UPDATE OR DELETE ON core.task_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('core_task_time_logs', 'sales');


-- ================================================================
-- 4. SALES — Call Logs (public schema, never had a trigger)
-- ================================================================

DROP TRIGGER IF EXISTS tr_audit_log_call_logs ON public.crm_call_logs;
CREATE TRIGGER tr_audit_log_call_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_call_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('call_logs', 'sales');


-- ================================================================
-- 5. SERVICE — Global audit_logs triggers for service cloud
--    activity tables that previously only wrote to ticket_activities
-- ================================================================

-- ── service_cloud.ticket_assignees ───────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_service_ticket_assignees ON service_cloud.ticket_assignees;
CREATE TRIGGER tr_audit_log_service_ticket_assignees
  AFTER INSERT OR UPDATE OR DELETE ON service_cloud.ticket_assignees
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_ticket_assignees', 'service_cloud');

-- ── service_cloud.time_entries ───────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_service_time_entries ON service_cloud.time_entries;
CREATE TRIGGER tr_audit_log_service_time_entries
  AFTER INSERT OR UPDATE OR DELETE ON service_cloud.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_time_entries', 'service_cloud');

-- ── service_cloud.team_members ───────────────────────────────────
DROP TRIGGER IF EXISTS tr_audit_log_service_team_members ON service_cloud.team_members;
CREATE TRIGGER tr_audit_log_service_team_members
  AFTER INSERT OR UPDATE OR DELETE ON service_cloud.team_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_team_members', 'service_cloud');
