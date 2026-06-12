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
  VALUES
    (p_workspace_id, 'New', 'new', 'new', 'Newly created support request', '#2563eb', 1, TRUE, TRUE),
    (p_workspace_id, 'Open', 'open', 'open', 'Ticket is open and awaiting action', '#0891b2', 2, FALSE, TRUE),
    (p_workspace_id, 'In Progress', 'in_progress', 'in_progress', 'Agent is actively working on the ticket', '#ca8a04', 3, FALSE, TRUE),
    (p_workspace_id, 'Waiting For Customer', 'waiting_for_customer', 'waiting', 'Waiting for customer response or confirmation', '#9333ea', 4, FALSE, TRUE),
    (p_workspace_id, 'Resolved', 'resolved', 'resolved', 'Issue has been resolved but not closed', '#16a34a', 5, FALSE, TRUE),
    (p_workspace_id, 'Closed', 'closed', 'closed', 'Ticket is closed', '#475569', 6, FALSE, TRUE)
  ON CONFLICT (workspace_id, status_key) DO NOTHING;

  -- C. Create Default Ticket Priorities
  INSERT INTO service_cloud.ticket_priorities (
    workspace_id, name, priority_key, severity_order, color, response_due_minutes, resolution_due_minutes, is_default, is_system
  )
  VALUES
    (p_workspace_id, 'Low', 'low', 1, '#64748b', 1440, 10080, FALSE, TRUE),
    (p_workspace_id, 'Medium', 'medium', 2, '#2563eb', 480, 2880, TRUE, TRUE),
    (p_workspace_id, 'High', 'high', 3, '#ca8a04', 240, 1440, FALSE, TRUE),
    (p_workspace_id, 'Urgent', 'urgent', 4, '#ea580c', 60, 480, FALSE, TRUE),
    (p_workspace_id, 'Critical', 'critical', 5, '#dc2626', 30, 240, FALSE, TRUE)
  ON CONFLICT (workspace_id, priority_key) DO NOTHING;

  -- D. Create Default Ticket Categories
  INSERT INTO service_cloud.ticket_categories (
    workspace_id, name, category_key, description, display_order, is_system
  )
  VALUES
    (p_workspace_id, 'Technical Issue', 'technical_issue', 'Technical support and troubleshooting requests', 1, TRUE),
    (p_workspace_id, 'Billing', 'billing', 'Billing, payment, and invoice questions', 2, TRUE),
    (p_workspace_id, 'Refund', 'refund', 'Refund requests and refund status questions', 3, TRUE),
    (p_workspace_id, 'Complaint', 'complaint', 'Customer complaints and dissatisfaction reports', 4, TRUE),
    (p_workspace_id, 'Feature Request', 'feature_request', 'Customer requests for product features', 5, TRUE),
    (p_workspace_id, 'Product Inquiry', 'product_inquiry', 'Questions about product usage, plans, or capabilities', 6, TRUE)
  ON CONFLICT (workspace_id, category_key) DO NOTHING;
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
