
-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Actor Information
  actor_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Action Details
  module VARCHAR(50) NOT NULL, -- 'leads', 'contacts', 'accounts', 'opportunities', etc.
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  
  -- Physical Link
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255), -- Human readable name for the entity (e.g. Lead Name)
  
  -- Data Snapshot
  old_data JSONB,
  new_data JSONB,
  
  -- Additional Context
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(module, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Default Policy: Workspace members can view logs
CREATE POLICY audit_logs_policy ON public.audit_logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Function to automatically log changes
CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_module VARCHAR(50);
  v_entity_name VARCHAR(255);
  v_action VARCHAR(50);
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
BEGIN
  -- 1. Identify Module and Workspace
  v_module := TG_ARGV[0];
  
  IF (TG_OP = 'DELETE') THEN
    v_workspace_id := OLD.workspace_id;
    v_action := 'DELETE';
    v_old_data := to_jsonb(OLD);
    
    -- Try to find a name for the entity
    CASE v_module
      WHEN 'leads' THEN v_entity_name := OLD.first_name || ' ' || COALESCE(OLD.last_name, '');
      WHEN 'contacts' THEN v_entity_name := OLD.first_name || ' ' || COALESCE(OLD.last_name, '');
      WHEN 'accounts' THEN v_entity_name := OLD.account_name;
      WHEN 'opportunities' THEN v_entity_name := OLD.opportunity_name;
      WHEN 'team_members' THEN v_entity_name := COALESCE(OLD.email, OLD.user_id::text);
      WHEN 'roles' THEN v_entity_name := OLD.role_name;
      WHEN 'role_permissions' THEN v_entity_name := 'Permissions for Role ' || OLD.role_id::text;
      ELSE v_entity_name := v_module || ' #' || OLD.id;
    END CASE;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    v_workspace_id := NEW.workspace_id;
    v_action := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    CASE v_module
      WHEN 'leads' THEN v_entity_name := NEW.first_name || ' ' || COALESCE(NEW.last_name, '');
      WHEN 'contacts' THEN v_entity_name := NEW.first_name || ' ' || COALESCE(NEW.last_name, '');
      WHEN 'accounts' THEN v_entity_name := NEW.account_name;
      WHEN 'opportunities' THEN v_entity_name := NEW.opportunity_name;
      WHEN 'team_members' THEN v_entity_name := COALESCE(NEW.email, NEW.user_id::text);
      WHEN 'roles' THEN v_entity_name := NEW.role_name;
      WHEN 'role_permissions' THEN v_entity_name := 'Permissions for Role ' || NEW.role_id::text;
      ELSE v_entity_name := v_module || ' #' || NEW.id;
    END CASE;
    
  ELSIF (TG_OP = 'INSERT') THEN
    v_workspace_id := NEW.workspace_id;
    v_action := 'CREATE';
    v_new_data := to_jsonb(NEW);
    
    CASE v_module
      WHEN 'leads' THEN v_entity_name := NEW.first_name || ' ' || COALESCE(NEW.last_name, '');
      WHEN 'contacts' THEN v_entity_name := NEW.first_name || ' ' || COALESCE(NEW.last_name, '');
      WHEN 'accounts' THEN v_entity_name := NEW.account_name;
      WHEN 'opportunities' THEN v_entity_name := NEW.opportunity_name;
      WHEN 'team_members' THEN v_entity_name := COALESCE(NEW.email, NEW.user_id::text);
      WHEN 'roles' THEN v_entity_name := NEW.role_name;
      WHEN 'role_permissions' THEN v_entity_name := 'Permissions for Role ' || NEW.role_id::text;
      WHEN 'notes' THEN v_entity_name := 'Note on ' || NEW.entity_type || ' ' || NEW.entity_id::text;
      WHEN 'reminders' THEN v_entity_name := NEW.title;
      WHEN 'meetings' THEN v_entity_name := NEW.title;
      WHEN 'documents' THEN v_entity_name := NEW.name;
      ELSE v_entity_name := v_module || ' #' || NEW.id;
    END CASE;
  END IF;

  -- 2. Insert Log
  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    module,
    action,
    entity_id,
    entity_name,
    old_data,
    new_data
  ) VALUES (
    v_workspace_id,
    auth.uid(), -- Tries to catch web user ID
    v_module,
    v_action,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_entity_name,
    v_old_data,
    v_new_data
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Triggers to CRM Tables

-- Leads
DROP TRIGGER IF EXISTS tr_audit_log_leads ON public.crm_leads;
CREATE TRIGGER tr_audit_log_leads
AFTER INSERT OR UPDATE OR DELETE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('leads');

-- Contacts
DROP TRIGGER IF EXISTS tr_audit_log_contacts ON public.crm_contacts;
CREATE TRIGGER tr_audit_log_contacts
AFTER INSERT OR UPDATE OR DELETE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('contacts');

-- Accounts
DROP TRIGGER IF EXISTS tr_audit_log_accounts ON public.crm_accounts;
CREATE TRIGGER tr_audit_log_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.crm_accounts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('accounts');

-- Opportunities
DROP TRIGGER IF EXISTS tr_audit_log_opportunities ON public.crm_opportunities;
CREATE TRIGGER tr_audit_log_opportunities
AFTER INSERT OR UPDATE OR DELETE ON public.crm_opportunities
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('opportunities');

-- 4. Apply Triggers to Admin Tables

-- Team Members
DROP TRIGGER IF EXISTS tr_audit_log_members ON public.workspace_members;
CREATE TRIGGER tr_audit_log_members
AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('team_members');

-- Roles
DROP TRIGGER IF EXISTS tr_audit_log_roles ON public.workspace_roles;
CREATE TRIGGER tr_audit_log_roles
AFTER INSERT OR UPDATE OR DELETE ON public.workspace_roles
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('roles');

-- Role Permissions
DROP TRIGGER IF EXISTS tr_audit_log_permissions ON public.role_permissions;
CREATE TRIGGER tr_audit_log_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('role_permissions');

-- 5. Apply Triggers to Activity Tables

-- Notes
DROP TRIGGER IF EXISTS tr_audit_log_notes ON public.crm_notes;
CREATE TRIGGER tr_audit_log_notes
AFTER INSERT OR UPDATE OR DELETE ON public.crm_notes
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('notes');

-- Reminders
DROP TRIGGER IF EXISTS tr_audit_log_reminders ON public.crm_reminders;
CREATE TRIGGER tr_audit_log_reminders
AFTER INSERT OR UPDATE OR DELETE ON public.crm_reminders
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('reminders');

-- Meetings
DROP TRIGGER IF EXISTS tr_audit_log_meetings ON public.crm_meetings;
CREATE TRIGGER tr_audit_log_meetings
AFTER INSERT OR UPDATE OR DELETE ON public.crm_meetings
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('meetings');

-- Documents
DROP TRIGGER IF EXISTS tr_audit_log_documents ON public.crm_documents;
CREATE TRIGGER tr_audit_log_documents
AFTER INSERT OR UPDATE OR DELETE ON public.crm_documents
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger('documents');

-- 5. Retroactively Seed Permissions for existing workspaces
DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_feature_id UUID;
BEGIN
  -- Get the Audit Logs 'view' feature ID
  SELECT f.id INTO v_feature_id 
  FROM public.crm_module_features f
  JOIN public.crm_modules m ON f.module_id = m.id
  WHERE m.module_key = 'audit_logs' AND f.feature_key = 'view';

  IF v_feature_id IS NOT NULL THEN
    FOR v_workspace_id IN SELECT id FROM public.workspaces
    LOOP
      -- Grant to Admin role in this workspace
      SELECT id INTO v_admin_role_id 
      FROM public.workspace_roles 
      WHERE workspace_id = v_workspace_id AND role_key = 'admin' LIMIT 1;
      
      IF v_admin_role_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (
          workspace_id, 
          role_id, 
          module_feature_id, 
          can_access, 
          access_level,
          can_view_sensitive_data,
          can_override_owner
        )
        VALUES (
          v_workspace_id, 
          v_admin_role_id, 
          v_feature_id, 
          true, 
          'all',
          true,
          true
        )
        ON CONFLICT (role_id, module_feature_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;
