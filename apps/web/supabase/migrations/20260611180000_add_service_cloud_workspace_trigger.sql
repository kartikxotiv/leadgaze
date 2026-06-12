-- Migration: Add Service Cloud Workspace Trigger
-- Date: 2026-06-11
-- Description: Unified trigger and function to seed default Service Cloud data (teams, statuses, priorities, categories) for new and existing workspaces.

-- 0. Cleanup Legacy Triggers (Prevent Duplicate Insertion)
DROP TRIGGER IF EXISTS trg_sc_seed_workspace_defaults ON public.workspaces;

-- 1. Helper function to initialize a workspace with Service Cloud defaults
CREATE OR REPLACE FUNCTION service_cloud.initialize_workspace_data(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
  -- A. Create Default Team
  INSERT INTO service_cloud.teams (workspace_id, name, description, is_default, is_active)
  VALUES (p_workspace_id, 'Support Team', 'Default Service Cloud support team', TRUE, TRUE)
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- B. Create Default Ticket Statuses
  INSERT INTO service_cloud.ticket_statuses (
    workspace_id, name, status_key, lifecycle, description, color, display_order, is_default, is_system
  )
  SELECT p_workspace_id, t.name, t.status_key, t.lifecycle::service_cloud.ticket_lifecycle_enum, t.description, t.color, t.display_order, t.is_default, t.is_system
  FROM (
    VALUES
      ('New', 'new', 'new', 'Newly created support request', '#2563eb', 1, TRUE, TRUE),
      ('Open', 'open', 'open', 'Ticket is open and awaiting action', '#0891b2', 2, FALSE, TRUE),
      ('In Progress', 'in_progress', 'in_progress', 'Agent is actively working on the ticket', '#ca8a04', 3, FALSE, TRUE),
      ('Waiting For Customer', 'waiting_for_customer', 'waiting', 'Waiting for customer response or confirmation', '#9333ea', 4, FALSE, TRUE),
      ('Resolved', 'resolved', 'resolved', 'Issue has been resolved but not closed', '#16a34a', 5, FALSE, TRUE),
      ('Closed', 'closed', 'closed', 'Ticket is closed', '#475569', 6, FALSE, TRUE)
  ) AS t(name, status_key, lifecycle, description, color, display_order, is_default, is_system)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_cloud.ticket_statuses ts
    WHERE ts.workspace_id = p_workspace_id
      AND (ts.status_key = t.status_key OR ts.name = t.name)
  );

  -- C. Create Default Ticket Priorities
  INSERT INTO service_cloud.ticket_priorities (
    workspace_id, name, priority_key, severity_order, color, response_due_minutes, resolution_due_minutes, is_default, is_system
  )
  SELECT p_workspace_id, t.name, t.priority_key, t.severity_order, t.color, t.response_due_minutes, t.resolution_due_minutes, t.is_default, t.is_system
  FROM (
    VALUES
      ('Low', 'low', 1, '#64748b', 1440, 10080, FALSE, TRUE),
      ('Medium', 'medium', 2, '#2563eb', 480, 2880, TRUE, TRUE),
      ('High', 'high', 3, '#ca8a04', 240, 1440, FALSE, TRUE),
      ('Urgent', 'urgent', 4, '#ea580c', 60, 480, FALSE, TRUE),
      ('Critical', 'critical', 5, '#dc2626', 30, 240, FALSE, TRUE)
  ) AS t(name, priority_key, severity_order, color, response_due_minutes, resolution_due_minutes, is_default, is_system)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_cloud.ticket_priorities tp
    WHERE tp.workspace_id = p_workspace_id
      AND (tp.priority_key = t.priority_key OR tp.name = t.name)
  );

  -- D. Create Default Ticket Categories
  INSERT INTO service_cloud.ticket_categories (
    workspace_id, name, category_key, description, display_order, is_system
  )
  SELECT p_workspace_id, t.name, t.category_key, t.description, t.display_order, t.is_system
  FROM (
    VALUES
      ('Technical Issue', 'technical_issue', 'Technical support and troubleshooting requests', 1, TRUE),
      ('Billing', 'billing', 'Billing, payment, and invoice questions', 2, TRUE),
      ('Refund', 'refund', 'Refund requests and refund status questions', 3, TRUE),
      ('Complaint', 'complaint', 'Customer complaints and dissatisfaction reports', 4, TRUE),
      ('Feature Request', 'feature_request', 'Customer requests for product features', 5, TRUE),
      ('Product Inquiry', 'product_inquiry', 'Questions about product usage, plans, or capabilities', 6, TRUE)
  ) AS t(name, category_key, description, display_order, is_system)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_cloud.ticket_categories tc
    WHERE tc.workspace_id = p_workspace_id
      AND (tc.category_key = t.category_key OR tc.name = t.name)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the workspace initialization trigger to call the helper
CREATE OR REPLACE FUNCTION service_cloud.seed_workspace_defaults()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM service_cloud.initialize_workspace_data(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create/Attach the trigger to the workspaces table
DROP TRIGGER IF EXISTS trg_sc_seed_workspace_defaults ON public.workspaces;
CREATE TRIGGER trg_sc_seed_workspace_defaults
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION service_cloud.seed_workspace_defaults();

-- 4. One-time execution for all existing workspaces
DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN SELECT id FROM public.workspaces LOOP
    PERFORM service_cloud.initialize_workspace_data(w.id);
  END LOOP;
END $$;
