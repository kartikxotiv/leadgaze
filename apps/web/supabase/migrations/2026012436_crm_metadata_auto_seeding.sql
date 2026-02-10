-- Migration: Comprehensive CRM Metadata Auto-Seeding
-- Date: 2026-01-31
-- Description: Unified trigger and function to seed default metadata (industries, stages, statuses) for new and existing workspaces.

-- 0. Cleanup Legacy Triggers (Prevent Duplicate Insertion)
DROP TRIGGER IF EXISTS trg_seed_workspace_defaults ON public.workspaces;
DROP TRIGGER IF EXISTS trigger_seed_industries ON public.workspaces;

-- 1. Helper function to initialize a workspace with CRM defaults
CREATE OR REPLACE FUNCTION public.initialize_workspace_crm_data(p_workspace_id UUID)
RETURNS VOID AS $$
DECLARE
  v_leads_module_id UUID;
  v_ops_module_id UUID;
  v_acc_module_id UUID;
  v_con_module_id UUID;
BEGIN
  -- Get module IDs
  SELECT id INTO v_leads_module_id FROM public.crm_modules WHERE module_key = 'leads';
  SELECT id INTO v_ops_module_id FROM public.crm_modules WHERE module_key = 'opportunities';
  SELECT id INTO v_acc_module_id FROM public.crm_modules WHERE module_key = 'accounts';
  SELECT id INTO v_con_module_id FROM public.crm_modules WHERE module_key = 'contacts';

  -- A. Seed Industries
  INSERT INTO public.crm_industries (workspace_id, industry_name, is_system)
  VALUES
    (p_workspace_id, 'Advertising & Marketing', TRUE),
    (p_workspace_id, 'Aerospace & Defense', TRUE),
    (p_workspace_id, 'Agriculture & Farming', TRUE),
    (p_workspace_id, 'Automotive', TRUE),
    (p_workspace_id, 'Banking & Finance', TRUE),
    (p_workspace_id, 'Biotechnology & Life Sciences', TRUE),
    (p_workspace_id, 'Business Services', TRUE),
    (p_workspace_id, 'Chemicals', TRUE),
    (p_workspace_id, 'Computer & Electronics', TRUE),
    (p_workspace_id, 'Construction & Engineering', TRUE),
    (p_workspace_id, 'Education', TRUE),
    (p_workspace_id, 'Energy & Utilities', TRUE),
    (p_workspace_id, 'Entertainment & Leisure', TRUE),
    (p_workspace_id, 'Environmental & Waste', TRUE),
    (p_workspace_id, 'Fashion & Apparel', TRUE),
    (p_workspace_id, 'Food & Beverage', TRUE),
    (p_workspace_id, 'Government & Public Sector', TRUE),
    (p_workspace_id, 'Healthcare', TRUE),
    (p_workspace_id, 'Hospitality & Tourism', TRUE),
    (p_workspace_id, 'Insurance', TRUE),
    (p_workspace_id, 'Law & Legal Services', TRUE),
    (p_workspace_id, 'Logistics & Supply Chain', TRUE),
    (p_workspace_id, 'Manufacturing', TRUE),
    (p_workspace_id, 'Media & Publishing', TRUE),
    (p_workspace_id, 'Non-Profit', TRUE),
    (p_workspace_id, 'Real Estate', TRUE),
    (p_workspace_id, 'Retail & Consumer Goods', TRUE),
    (p_workspace_id, 'Software & SaaS', TRUE),
    (p_workspace_id, 'Telecommunications', TRUE),
    (p_workspace_id, 'Transportation', TRUE)
  ON CONFLICT (workspace_id, industry_name) DO NOTHING;

  -- B. Seed Opportunity Stages
  IF v_ops_module_id IS NOT NULL THEN
    INSERT INTO public.entity_statuses (
      workspace_id, module_id, status_name, status_key, color, icon, 
      sort_order, is_system, is_active, is_default, is_closed
    ) VALUES
      (p_workspace_id, v_ops_module_id, 'Qualify', 'qualify', '#9CA3AF', 'search', 0, TRUE, TRUE, TRUE, FALSE),
      (p_workspace_id, v_ops_module_id, 'Meet & Present', 'meet_present', '#3B82F6', 'presentation', 1, TRUE, TRUE, FALSE, FALSE),
      (p_workspace_id, v_ops_module_id, 'Propose', 'propose', '#8B5CF6', 'file-text', 2, TRUE, TRUE, FALSE, FALSE),
      (p_workspace_id, v_ops_module_id, 'Negotiate', 'negotiate', '#F59E0B', 'users', 3, TRUE, TRUE, FALSE, FALSE),
      (p_workspace_id, v_ops_module_id, 'Closed Won', 'closed_won', '#10B981', 'check-circle', 4, TRUE, TRUE, FALSE, TRUE),
      (p_workspace_id, v_ops_module_id, 'Closed Lost', 'closed_lost', '#EF4444', 'x-circle', 5, TRUE, TRUE, FALSE, TRUE)
    ON CONFLICT (workspace_id, module_id, status_key) DO NOTHING;
  END IF;

  -- C. Seed Account & Contact Statuses (Unified 'Active' default)
  IF v_acc_module_id IS NOT NULL THEN
    INSERT INTO public.entity_statuses (
      workspace_id, module_id, status_name, status_key, color, icon, 
      sort_order, is_system, is_active, is_default, is_closed
    ) VALUES
      (p_workspace_id, v_acc_module_id, 'Active', 'active', '#10B981', 'check-circle', 0, TRUE, TRUE, TRUE, FALSE)
    ON CONFLICT (workspace_id, module_id, status_key) DO NOTHING;
  END IF;

  IF v_con_module_id IS NOT NULL THEN
    INSERT INTO public.entity_statuses (
      workspace_id, module_id, status_name, status_key, color, icon, 
      sort_order, is_system, is_active, is_default, is_closed
    ) VALUES
      (p_workspace_id, v_con_module_id, 'Active', 'active', '#10B981', 'check-circle', 0, TRUE, TRUE, TRUE, FALSE)
    ON CONFLICT (workspace_id, module_id, status_key) DO NOTHING;
  END IF;

  -- D. Seed Lead Statuses & Sources (Keeping existing logic but unified)
  IF v_leads_module_id IS NOT NULL THEN
    INSERT INTO public.entity_statuses (
      workspace_id, module_id, status_name, status_key, color, icon, 
      sort_order, is_system, is_active, is_default, is_closed
    ) VALUES
      (p_workspace_id, v_leads_module_id, 'New', 'new', '#3B82F6', 'star', 0, TRUE, TRUE, TRUE, FALSE),
      (p_workspace_id, v_leads_module_id, 'Contacted', 'contacted', '#60A5FA', 'message-circle', 1, TRUE, TRUE, FALSE, FALSE),
      (p_workspace_id, v_leads_module_id, 'Nurturing', 'nurturing', '#F59E0B', 'heart', 2, TRUE, TRUE, FALSE, FALSE),
      (p_workspace_id, v_leads_module_id, 'Qualified', 'qualified', '#10B981', 'check-circle', 3, TRUE, TRUE, FALSE, TRUE),
      (p_workspace_id, v_leads_module_id, 'Converted', 'converted', '#10B981', 'refresh-cw', 4, TRUE, TRUE, FALSE, TRUE),
      (p_workspace_id, v_leads_module_id, 'Unqualified', 'unqualified', '#EF4444', 'x-circle', 5, TRUE, TRUE, FALSE, TRUE)
    ON CONFLICT (workspace_id, module_id, status_key) DO NOTHING;

    INSERT INTO public.lead_sources (
      workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active
    ) VALUES
      (p_workspace_id, 'Direct', 'direct', '#3B82F6', 'user', 0, TRUE, TRUE),
      (p_workspace_id, 'Website', 'website', '#60A5FA', 'globe', 1, TRUE, TRUE),
      (p_workspace_id, 'Phone', 'phone', '#34D399', 'phone', 2, TRUE, TRUE),
      (p_workspace_id, 'Email', 'email', '#F59E0B', 'mail', 3, TRUE, TRUE),
      (p_workspace_id, 'Referral', 'referral', '#8B5CF6', 'share-2', 4, TRUE, TRUE),
      (p_workspace_id, 'Social Media', 'social_media', '#EC4899', 'share', 5, TRUE, TRUE),
      (p_workspace_id, 'Event', 'event', '#06B6D4', 'calendar', 6, TRUE, TRUE),
      (p_workspace_id, 'Advertisement', 'advertisement', '#EF4444', 'megaphone', 7, TRUE, TRUE),
      (p_workspace_id, 'Partner', 'partner', '#06B6D4', 'link', 8, TRUE, TRUE),
      (p_workspace_id, 'Other', 'other', '#6B7280', 'help-circle', 9, TRUE, TRUE)
    ON CONFLICT (workspace_id, source_key) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the workspace initialization trigger to call the helper
CREATE OR REPLACE FUNCTION public.seed_workspace_defaults()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.initialize_workspace_crm_data(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create/Attach the trigger to the workspaces table
DROP TRIGGER IF EXISTS trg_seed_workspace_defaults ON public.workspaces;
CREATE TRIGGER trg_seed_workspace_defaults
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.seed_workspace_defaults();

-- 4. One-time execution for all existing workspaces
DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN SELECT id FROM public.workspaces LOOP
    PERFORM public.initialize_workspace_crm_data(w.id);
  END LOOP;
END $$;
