/*
 * -------------------------------------------------------
 * Migration: Add product_key to audit_logs and backfill
 * Date: 2026-06-11
 * Description: Adds product_key column to audit_logs table,
 *   populates it based on module naming conventions, and
 *   updates fn_audit_log_trigger to populate it dynamically
 *   and handle Service Cloud entities.
 * -------------------------------------------------------
 */

-- 1. Add product_key column to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS product_key VARCHAR(50);

-- 2. Backfill product_key based on module naming conventions
UPDATE public.audit_logs
SET product_key = CASE 
  WHEN module IN ('roles', 'team_members', 'notes', 'reminders', 'meetings', 'documents', 'activities', 'settings', 'reports', 'emails', 'role_permissions') THEN 'common'
  WHEN module LIKE 'hrms%' THEN 'hrms'
  WHEN module LIKE 'inventory%' THEN 'inventory'
  WHEN module LIKE 'service_cloud%' THEN 'service_cloud'
  WHEN module LIKE 'fundraising%' THEN 'funds'
  ELSE 'sales'
END
WHERE product_key IS NULL;

-- Set default after backfilling
ALTER TABLE public.audit_logs
  ALTER COLUMN product_key SET DEFAULT 'sales';

-- 3. Add index for product_key filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_product_key
  ON public.audit_logs(product_key);

-- 4. Update the fn_audit_log_trigger to infer product_key & format entity names
CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_module VARCHAR(50);
  v_entity_name VARCHAR(255) := NULL;
  v_action VARCHAR(50);
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
  v_data JSONB; -- Pointer to focus data (NEW for Insert/Update, OLD for Delete)
  v_product_key VARCHAR(50);
BEGIN
  -- 1. Identify Module and Action
  v_module := TG_ARGV[0];
  
  -- Determine product_key either from TG_ARGV[1] or infer it
  IF array_length(TG_ARGV, 1) > 1 THEN
    v_product_key := TG_ARGV[1];
  ELSE
    v_product_key := CASE 
      WHEN v_module IN ('roles', 'team_members', 'notes', 'reminders', 'meetings', 'documents', 'activities', 'settings', 'reports', 'emails', 'role_permissions', 'audit_logs') THEN 'common'
      WHEN v_module LIKE 'hrms%' THEN 'hrms'
      WHEN v_module LIKE 'inventory%' THEN 'inventory'
      WHEN v_module LIKE 'service_cloud%' THEN 'service_cloud'
      WHEN v_module LIKE 'fundraising%' THEN 'funds'
      ELSE 'sales'
    END;
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    v_workspace_id := OLD.workspace_id;
    v_action := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_data := v_old_data;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_workspace_id := NEW.workspace_id;
    v_action := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_data := v_new_data;
  ELSIF (TG_OP = 'INSERT') THEN
    v_workspace_id := NEW.workspace_id;
    v_action := 'CREATE';
    v_new_data := to_jsonb(NEW);
    v_data := v_new_data;
  END IF;

  -- 2. Safely extract Entity Name via JSONB to prevent "missing field" errors
  CASE v_module
    WHEN 'leads', 'contacts' THEN 
      v_entity_name := (v_data->>'first_name') || ' ' || COALESCE(v_data->>'last_name', '');
    WHEN 'accounts' THEN 
      v_entity_name := v_data->>'account_name';
    WHEN 'opportunities' THEN 
      v_entity_name := v_data->>'opportunity_name';
    WHEN 'team_members' THEN 
      v_entity_name := COALESCE(v_data->>'email', 'Internal User: ' || COALESCE(v_data->>'user_id', 'Unknown'));
    WHEN 'roles' THEN 
      v_entity_name := v_data->>'role_name';
    WHEN 'role_permissions' THEN 
      v_entity_name := 'Permissions for Role ID ' || COALESCE(v_data->>'role_id', 'Unknown');
    WHEN 'notes' THEN 
      v_entity_name := 'Note on ' || COALESCE(v_data->>'entity_type', 'Entity') || ' ' || COALESCE(v_data->>'entity_id', '');
    WHEN 'reminders', 'meetings' THEN 
      v_entity_name := v_data->>'title';
    WHEN 'documents' THEN 
      v_entity_name := v_data->>'name';
    WHEN 'service_cloud_tickets' THEN
      v_entity_name := 'Ticket #' || COALESCE(v_data->>'ticket_number', '?') || ': ' || COALESCE(v_data->>'subject', '');
    WHEN 'service_cloud_customers', 'service_cloud_organizations', 'service_cloud_teams', 'service_cloud_statuses', 'service_cloud_priorities', 'service_cloud_categories' THEN
      v_entity_name := v_data->>'name';
    ELSE 
      v_entity_name := v_module || ' #' || COALESCE(v_data->>'id', 'Unknown');
  END CASE;

  -- 3. Insert Log
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

-- 5. Add Audit Log Triggers to Service Cloud Tables

-- Tickets
DROP TRIGGER IF EXISTS tr_audit_log_service_tickets ON service_cloud.tickets;
CREATE TRIGGER tr_audit_log_service_tickets
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.tickets
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_tickets', 'service_cloud');

-- Customers
DROP TRIGGER IF EXISTS tr_audit_log_service_customers ON service_cloud.customers;
CREATE TRIGGER tr_audit_log_service_customers
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.customers
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_customers', 'service_cloud');

-- Organizations
DROP TRIGGER IF EXISTS tr_audit_log_service_organizations ON service_cloud.organizations;
CREATE TRIGGER tr_audit_log_service_organizations
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.organizations
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_organizations', 'service_cloud');

-- Teams
DROP TRIGGER IF EXISTS tr_audit_log_service_teams ON service_cloud.teams;
CREATE TRIGGER tr_audit_log_service_teams
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.teams
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_teams', 'service_cloud');

-- Taxonomies
DROP TRIGGER IF EXISTS tr_audit_log_service_statuses ON service_cloud.ticket_statuses;
CREATE TRIGGER tr_audit_log_service_statuses
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.ticket_statuses
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_statuses', 'service_cloud');

DROP TRIGGER IF EXISTS tr_audit_log_service_priorities ON service_cloud.ticket_priorities;
CREATE TRIGGER tr_audit_log_service_priorities
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.ticket_priorities
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_priorities', 'service_cloud');

DROP TRIGGER IF EXISTS tr_audit_log_service_categories ON service_cloud.ticket_categories;
CREATE TRIGGER tr_audit_log_service_categories
AFTER INSERT OR UPDATE OR DELETE ON service_cloud.ticket_categories
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('service_cloud_categories', 'service_cloud');
