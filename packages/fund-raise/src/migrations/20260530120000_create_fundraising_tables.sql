/*
 * -------------------------------------------------------
 * Migration: Create Fundraising Schema & Tables
 * Date: 2026-05-30
 * Description: Creates a dedicated `fundraising` PostgreSQL schema and
 *              all core tables for the Fundraising module:
 *                - fundraising.pipeline_stages
 *                - fundraising.investors
 *                - fundraising.investor_contacts
 *                - fundraising.rounds
 *                - fundraising.deals
 *              Also registers the module in the shared RBAC system and
 *              seeds default pipeline stages + permissions for existing workspaces.
 *
 *              Cross-schema FK references to public.workspaces and
 *              public.accounts are intentional — auth & workspace management
 *              live in the platform layer (public schema).
 * -------------------------------------------------------
 */


-- =====================================================
-- 0. Create Fundraising Schema
-- =====================================================

CREATE SCHEMA IF NOT EXISTS fundraising;

COMMENT ON SCHEMA fundraising IS 'Dedicated schema for the Fundraising business module. Contains investors, rounds, pipeline stages, and deals.';

-- Grant usage so authenticated roles can access tables in this schema
GRANT USAGE ON SCHEMA fundraising TO authenticated, service_role, anon;

-- =====================================================
-- 1. Pipeline Stages
-- =====================================================
-- Created first because fundraising.deals has a FK to this table.

CREATE TABLE IF NOT EXISTS fundraising.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Stage Identity
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Ordering & behaviour
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,    -- marks the starting stage for new deals
  is_closed_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed_lost BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pipeline_stages_name_workspace_unique UNIQUE (workspace_id, name)
);

COMMENT ON TABLE fundraising.pipeline_stages IS 'Dynamic pipeline stages for the fundraising deal pipeline (e.g. Lead, Contacted, Pitch Shared, Due Diligence, Committed, Funds Received).';

CREATE INDEX IF NOT EXISTS idx_fr_pipeline_stages_workspace ON fundraising.pipeline_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fr_pipeline_stages_order ON fundraising.pipeline_stages(workspace_id, display_order);

ALTER TABLE fundraising.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_stages_policy ON fundraising.pipeline_stages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON fundraising.pipeline_stages TO service_role, authenticated, anon;


-- =====================================================
-- 2. Investors
-- =====================================================

CREATE TABLE IF NOT EXISTS fundraising.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Firm / Organisation Info
  name VARCHAR(255) NOT NULL,
  investor_type VARCHAR(50),          -- e.g. VC, Angel, Family Office, Corporate, PE
  website VARCHAR(500),
  linkedin_url VARCHAR(500),
  description TEXT,

  -- Investment Thesis
  ticket_size_min DECIMAL(18, 2),     -- in base currency (see currency field)
  ticket_size_max DECIMAL(18, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  industry_focus JSONB DEFAULT '[]'::jsonb,   -- e.g. ["SaaS", "FinTech"]
  geo_focus JSONB DEFAULT '[]'::jsonb,        -- e.g. ["India", "SEA"]

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active | inactive | blacklisted

  -- Ownership
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  -- Additional Data
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  CONSTRAINT investors_name_workspace_unique UNIQUE (workspace_id, name)
);

COMMENT ON TABLE fundraising.investors IS 'Investor organisations/firms being tracked in the fundraising pipeline.';

CREATE INDEX IF NOT EXISTS idx_fr_investors_workspace ON fundraising.investors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fr_investors_owner ON fundraising.investors(owner_id);
CREATE INDEX IF NOT EXISTS idx_fr_investors_status ON fundraising.investors(status);
CREATE INDEX IF NOT EXISTS idx_fr_investors_not_deleted ON fundraising.investors(workspace_id, is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE fundraising.investors ENABLE ROW LEVEL SECURITY;

CREATE POLICY investors_policy ON fundraising.investors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON fundraising.investors TO service_role, authenticated, anon;


-- =====================================================
-- 3. Investor Contacts
-- =====================================================

CREATE TABLE IF NOT EXISTS fundraising.investor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES fundraising.investors(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Contact Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  designation VARCHAR(255),
  linkedin_url VARCHAR(500),

  -- Flags
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE fundraising.investor_contacts IS 'Individual representatives / partners within an investor organisation.';

CREATE INDEX IF NOT EXISTS idx_fr_investor_contacts_investor ON fundraising.investor_contacts(investor_id);
CREATE INDEX IF NOT EXISTS idx_fr_investor_contacts_workspace ON fundraising.investor_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fr_investor_contacts_email ON fundraising.investor_contacts(email) WHERE email IS NOT NULL;

ALTER TABLE fundraising.investor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_contacts_policy ON fundraising.investor_contacts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON fundraising.investor_contacts TO service_role, authenticated, anon;


-- =====================================================
-- 4. Funding Rounds
-- =====================================================

CREATE TABLE IF NOT EXISTS fundraising.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Round Identity
  -- Note: company_name is intentionally omitted. workspace_id already identifies
  -- the company raising funds; duplicating it here would be redundant.
  round_name VARCHAR(255) NOT NULL,      -- e.g. "Series A", "Seed Round 2026"
  round_type VARCHAR(50),                -- pre_seed | seed | series_a | series_b | bridge | debt

  -- Financials
  target_amount DECIMAL(18, 2),
  raised_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  valuation DECIMAL(18, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'planning',  -- planning | active | closed | cancelled

  -- Timeline
  start_date DATE,
  close_date DATE,

  -- Ownership
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  -- Additional Data
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

COMMENT ON TABLE fundraising.rounds IS 'Funding rounds being tracked (e.g. Seed, Series A). Tracks target amount, raised amount, and valuation.';

CREATE INDEX IF NOT EXISTS idx_fr_rounds_workspace ON fundraising.rounds(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fr_rounds_status ON fundraising.rounds(status);
CREATE INDEX IF NOT EXISTS idx_fr_rounds_owner ON fundraising.rounds(owner_id);
CREATE INDEX IF NOT EXISTS idx_fr_rounds_close_date ON fundraising.rounds(close_date);
CREATE INDEX IF NOT EXISTS idx_fr_rounds_not_deleted ON fundraising.rounds(workspace_id, is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE fundraising.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY rounds_policy ON fundraising.rounds
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON fundraising.rounds TO service_role, authenticated, anon;


-- =====================================================
-- 5. Deals (Pipeline)
-- =====================================================

CREATE TABLE IF NOT EXISTS fundraising.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Core Relationships
  investor_id UUID NOT NULL REFERENCES fundraising.investors(id) ON DELETE CASCADE,
  round_id UUID REFERENCES fundraising.rounds(id) ON DELETE SET NULL,
  stage_id UUID NOT NULL REFERENCES fundraising.pipeline_stages(id) ON DELETE RESTRICT,

  -- Deal Status (independent of stage — a deal can be on_hold or cancelled at any stage)
  -- active | on_hold | won | lost | cancelled
  status VARCHAR(50) NOT NULL DEFAULT 'active',

  -- Deal Financials
  probability INTEGER NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_amount DECIMAL(18, 2),
  -- committed_amount is intentionally omitted here.
  -- Use fundraising.commitments for precise promised vs received tracking.
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Activity Tracking
  last_contact_date TIMESTAMPTZ,
  next_followup_date TIMESTAMPTZ,

  -- Notes / Context
  notes TEXT,

  -- Stage Audit Trail (MVP: JSONB; future: migrate to fundraising.deal_stage_history table)
  -- Each entry: { from_stage_id, to_stage_id, changed_by, changed_at }
  stage_history JSONB DEFAULT '[]'::jsonb,

  -- Ownership
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  -- Additional Data
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

COMMENT ON TABLE fundraising.deals IS 'Tracks individual investor conversations across pipeline stages (kanban). Each deal links one investor to one funding round at a specific stage. Status is independent of stage.';

CREATE INDEX IF NOT EXISTS idx_fr_deals_workspace ON fundraising.deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fr_deals_investor ON fundraising.deals(investor_id);
CREATE INDEX IF NOT EXISTS idx_fr_deals_round ON fundraising.deals(round_id);
CREATE INDEX IF NOT EXISTS idx_fr_deals_stage ON fundraising.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_fr_deals_status ON fundraising.deals(status);
CREATE INDEX IF NOT EXISTS idx_fr_deals_owner ON fundraising.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_fr_deals_followup ON fundraising.deals(next_followup_date) WHERE next_followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fr_deals_not_deleted ON fundraising.deals(workspace_id, is_deleted) WHERE is_deleted = FALSE;

ALTER TABLE fundraising.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY deals_policy ON fundraising.deals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON fundraising.deals TO service_role, authenticated, anon;


-- =====================================================
-- 6. Commitments
-- =====================================================
-- Tracks the promised vs received breakdown per deal.
-- A single deal can have multiple commitment entries
-- (e.g. promise of $100k, then $50k received, $50k pending).

CREATE TABLE IF NOT EXISTS fundraising.commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES fundraising.deals(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Commitment Amounts
  promised_amount DECIMAL(18, 2) NOT NULL,          -- what the investor committed to invest
  received_amount DECIMAL(18, 2) NOT NULL DEFAULT 0, -- amount actually wired / received
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  -- pending | partially_received | fully_received | cancelled
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Timeline
  commitment_date DATE,        -- date investor made the commitment
  expected_close_date DATE,    -- expected date for full receipt
  received_date DATE,          -- date final wire was received (set when fully_received)

  -- Notes
  notes TEXT,

  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE fundraising.commitments IS 'Tracks promised vs received amounts per deal. A deal can have multiple commitments (e.g. tranches). promised_amount - received_amount = outstanding balance.';

CREATE INDEX IF NOT EXISTS idx_fr_commitments_deal ON fundraising.commitments(deal_id);
CREATE INDEX IF NOT EXISTS idx_fr_commitments_workspace ON fundraising.commitments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fr_commitments_status ON fundraising.commitments(status);

ALTER TABLE fundraising.commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY commitments_policy ON fundraising.commitments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON fundraising.commitments TO service_role, authenticated, anon;


-- =====================================================
-- 6. updated_at Triggers
-- =====================================================
-- Uses the shared update_updated_at_column() function from the public schema.
-- If it doesn't exist yet (fresh DB), create it here.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fr_pipeline_stages_updated_at
  BEFORE UPDATE ON fundraising.pipeline_stages
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER trg_fr_investors_updated_at
  BEFORE UPDATE ON fundraising.investors
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER trg_fr_investor_contacts_updated_at
  BEFORE UPDATE ON fundraising.investor_contacts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER trg_fr_rounds_updated_at
  BEFORE UPDATE ON fundraising.rounds
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER trg_fr_deals_updated_at
  BEFORE UPDATE ON fundraising.deals
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER trg_fr_commitments_updated_at
  BEFORE UPDATE ON fundraising.commitments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- =====================================================
-- 7. Register Fundraising Features in Shared RBAC
-- =====================================================

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system)
VALUES
  ('fundraising_investors', 'Funding Investors',      'Manage investor organisations and contacts', 1, TRUE),
  ('fundraising_rounds',    'Funding Rounds', 'Create and manage funding rounds',          2, TRUE),
  ('fundraising_pipeline',  'Funding Pipeline',       'Track deals across pipeline stages',        3, TRUE)
ON CONFLICT (module_key) DO NOTHING;


-- =====================================================
-- 8. Seed Module Features
-- =====================================================

-- 8a. Investors features
INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view'             AS feature_key, 'View Investors'       AS feature_name, 'View investor records'                AS description, 'crud'   AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create',               'Create Investors',     'Create new investor records',                                          'crud',   2
  UNION ALL SELECT 'edit',                 'Edit Investors',       'Edit existing investor records',                                       'crud',   3
  UNION ALL SELECT 'delete',               'Delete Investors',     'Delete investor records',                                              'crud',   4
  UNION ALL SELECT 'export',               'Export Investors',     'Export investor data',                                                 'export', 5
  UNION ALL SELECT 'add_contact',          'Add Contact',          'Add contacts to an investor profile',                                  'action', 6
  UNION ALL SELECT 'add_note',             'Add Notes',            'Add notes to investor records',                                        'action', 7
  UNION ALL SELECT 'schedule_meeting',     'Schedule Meeting',     'Schedule a meeting with an investor',                                  'action', 8
) f
WHERE m.module_key = 'fundraising_investors'
ON CONFLICT (module_id, feature_key) DO NOTHING;

-- 8b. Funding Rounds features
INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view'    AS feature_key, 'View Rounds'   AS feature_name, 'View funding round records' AS description, 'crud'   AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create',       'Create Rounds', 'Create new funding rounds',                                  'crud',   2
  UNION ALL SELECT 'edit',         'Edit Rounds',   'Edit existing funding rounds',                               'crud',   3
  UNION ALL SELECT 'delete',       'Delete Rounds', 'Delete funding rounds',                                      'crud',   4
  UNION ALL SELECT 'export',       'Export Rounds', 'Export round data',                                          'export', 5
) f
WHERE m.module_key = 'fundraising_rounds'
ON CONFLICT (module_id, feature_key) DO NOTHING;

-- 8c. Pipeline features
INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view'           AS feature_key, 'View Pipeline'           AS feature_name, 'View the fundraising pipeline'          AS description, 'view'   AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create_deal',         'Create Deal',             'Add a new deal to the pipeline',                                        'crud',   2
  UNION ALL SELECT 'edit_deal',           'Edit Deal',               'Edit an existing deal',                                                 'crud',   3
  UNION ALL SELECT 'delete_deal',         'Delete Deal',             'Delete a deal from the pipeline',                                       'crud',   4
  UNION ALL SELECT 'move_stage',          'Move Stage',              'Move a deal to a different pipeline stage',                             'action', 5
  UNION ALL SELECT 'manage_stages',       'Manage Pipeline Stages',  'Create, edit, and reorder pipeline stages',                            'action', 6
  UNION ALL SELECT 'export',             'Export Pipeline',          'Export pipeline data',                                                  'export', 7
) f
WHERE m.module_key = 'fundraising_pipeline'
ON CONFLICT (module_id, feature_key) DO NOTHING;


-- =====================================================
-- 9. Grant Default Permissions to Existing Workspaces
-- =====================================================

DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_user_role_id UUID;
  v_viewer_role_id UUID;
  v_feature_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT DISTINCT workspace_id FROM public.workspace_roles
  LOOP
    SELECT id INTO v_admin_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'admin' LIMIT 1;

    SELECT id INTO v_manager_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'manager' LIMIT 1;

    SELECT id INTO v_user_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'user' LIMIT 1;

    SELECT id INTO v_viewer_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'viewer' LIMIT 1;

    FOR v_feature_id IN
      SELECT f.id
      FROM public.crm_module_features f
      JOIN public.crm_modules m ON f.module_id = m.id
      WHERE m.module_key IN ('fundraising_investors', 'fundraising_rounds', 'fundraising_pipeline')
    LOOP
      -- Admin: Full access
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_admin_role_id, v_feature_id,
             true, 'all'::public.permission_access_level,
             true, true
      WHERE v_admin_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_admin_role_id AND module_feature_id = v_feature_id
        );

      -- Manager: Team-level access
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_manager_role_id, v_feature_id,
             true, 'team'::public.permission_access_level,
             false, false
      WHERE v_manager_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_manager_role_id AND module_feature_id = v_feature_id
        );

      -- User: Own-record access
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_user_role_id, v_feature_id,
             true, 'own'::public.permission_access_level,
             false, false
      WHERE v_user_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_user_role_id AND module_feature_id = v_feature_id
        );

      -- Viewer: Read-all, no write
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_viewer_role_id, v_feature_id,
             true, 'all'::public.permission_access_level,
             false, false
      WHERE v_viewer_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_viewer_role_id AND module_feature_id = v_feature_id
        );

    END LOOP;
  END LOOP;
END $$;


-- =====================================================
-- 10. Seed Default Pipeline Stages per Existing Workspace
-- =====================================================

DO $$
DECLARE
  v_workspace_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT DISTINCT id FROM public.workspaces
  LOOP
    INSERT INTO fundraising.pipeline_stages
      (workspace_id, name, description, display_order, is_default, is_closed_won, is_closed_lost)
    VALUES
      (v_workspace_id, 'Lead',              'Potential investor identified',            1, TRUE,  FALSE, FALSE),
      (v_workspace_id, 'Contacted',         'Initial outreach made',                   2, FALSE, FALSE, FALSE),
      (v_workspace_id, 'Pitch Shared',      'Pitch deck or teaser sent to investor',   3, FALSE, FALSE, FALSE),
      (v_workspace_id, 'Meeting Scheduled', 'Intro or pitch meeting booked',           4, FALSE, FALSE, FALSE),
      (v_workspace_id, 'Due Diligence',     'Investor conducting due diligence',       5, FALSE, FALSE, FALSE),
      (v_workspace_id, 'Negotiation',       'Term sheet negotiation in progress',      6, FALSE, FALSE, FALSE),
      (v_workspace_id, 'Committed',         'Investor has committed to invest',        7, FALSE, FALSE, FALSE),
      (v_workspace_id, 'Funds Received',    'Wire transfer received',                  8, FALSE, TRUE,  FALSE),
      (v_workspace_id, 'Closed Lost',       'Investor passed or deal fell through',    9, FALSE, FALSE, TRUE)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA fundraising TO authenticated, service_role, anon;
