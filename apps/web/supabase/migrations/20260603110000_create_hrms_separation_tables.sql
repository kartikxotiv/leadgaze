CREATE SCHEMA IF NOT EXISTS hrms;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'resignation_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.resignation_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'RETRACTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'exit_task_category' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.exit_task_category AS ENUM ('IT', 'ADMIN', 'HR', 'FINANCE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'asset_return_condition' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.asset_return_condition AS ENUM ('PENDING', 'GOOD', 'DAMAGED', 'LOST');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'asset_clearance_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.asset_clearance_status AS ENUM ('PENDING', 'RETURNED', 'WAIVED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'fnf_settlement_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.fnf_settlement_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'exit_letter_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.exit_letter_type AS ENUM ('RELIEVING', 'EXPERIENCE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'exit_letter_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.exit_letter_status AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS hrms.resignation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    resignation_date DATE NOT NULL,
    last_working_day DATE,
    notice_period_days INTEGER,
    notice_waiver_days INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status hrms.resignation_status NOT NULL DEFAULT 'SUBMITTED',
    remarks TEXT,
    accepted_by UUID,
    accepted_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT resignation_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrms.employees(id) ON DELETE CASCADE,
    CONSTRAINT resignation_requests_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT hrms_resignations_notice_non_negative CHECK (notice_period_days IS NULL OR notice_period_days >= 0),
    CONSTRAINT hrms_resignations_waiver_non_negative CHECK (notice_waiver_days >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrms_resignations_active_unique
    ON hrms.resignation_requests(workspace_id, employee_id)
    WHERE status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED');

CREATE TABLE IF NOT EXISTS hrms.exit_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT hrms_exit_checklist_items_workspace_title_unique UNIQUE (workspace_id, title)
);

CREATE TABLE IF NOT EXISTS hrms.exit_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    resignation_id UUID,
    checklist_item_id UUID,
    task_name TEXT NOT NULL,
    task_category hrms.exit_task_category NOT NULL DEFAULT 'HR',
    owner_employee_id UUID,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    description TEXT,
    remarks TEXT,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exit_checklists_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrms.employees(id) ON DELETE CASCADE,
    CONSTRAINT exit_checklists_resignation_id_fkey FOREIGN KEY (resignation_id) REFERENCES hrms.resignation_requests(id) ON DELETE SET NULL,
    CONSTRAINT exit_checklists_checklist_item_id_fkey FOREIGN KEY (checklist_item_id) REFERENCES hrms.exit_checklist_items(id) ON DELETE SET NULL,
    CONSTRAINT exit_checklists_owner_employee_id_fkey FOREIGN KEY (owner_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hrms.asset_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    resignation_id UUID,
    asset_name TEXT NOT NULL,
    asset_tag TEXT,
    issued_date DATE,
    returned_date DATE,
    condition_at_return hrms.asset_return_condition NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    status hrms.asset_clearance_status NOT NULL DEFAULT 'PENDING',
    cleared_by UUID,
    cleared_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT asset_clearances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrms.employees(id) ON DELETE CASCADE,
    CONSTRAINT asset_clearances_resignation_id_fkey FOREIGN KEY (resignation_id) REFERENCES hrms.resignation_requests(id) ON DELETE SET NULL,
    CONSTRAINT asset_clearances_cleared_by_fkey FOREIGN KEY (cleared_by) REFERENCES hrms.employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hrms.fnf_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    payroll_run_id UUID,
    last_working_day DATE NOT NULL,
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    leave_encashment NUMERIC(12,2) NOT NULL DEFAULT 0,
    gratuity NUMERIC(12,2) NOT NULL DEFAULT 0,
    notice_recovery NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
    tds_on_fnf NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
    status hrms.fnf_settlement_status NOT NULL DEFAULT 'DRAFT',
    settlement_date DATE,
    remarks TEXT,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fnf_settlements_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrms.employees(id) ON DELETE CASCADE,
    CONSTRAINT hrms_fnf_amounts_non_negative CHECK (
      leave_encashment >= 0 AND gratuity >= 0 AND notice_recovery >= 0 AND
      total_payable >= 0 AND tds_on_fnf >= 0 AND net_payable >= 0
    )
);

CREATE TABLE IF NOT EXISTS hrms.employee_exit_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    resignation_id UUID,
    letter_type hrms.exit_letter_type NOT NULL,
    issued_by UUID,
    issued_at TIMESTAMPTZ,
    letter_number TEXT,
    letter_url TEXT,
    remarks TEXT,
    status hrms.exit_letter_status NOT NULL DEFAULT 'DRAFT',
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT employee_exit_letters_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hrms.employees(id) ON DELETE CASCADE,
    CONSTRAINT employee_exit_letters_resignation_id_fkey FOREIGN KEY (resignation_id) REFERENCES hrms.resignation_requests(id) ON DELETE SET NULL,
    CONSTRAINT employee_exit_letters_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES hrms.employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hrms_resignations_workspace_status ON hrms.resignation_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_resignations_employee ON hrms.resignation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_exit_checklist_items_workspace ON hrms.exit_checklist_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_exit_checklists_workspace_employee ON hrms.exit_checklists(workspace_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_exit_checklists_resignation ON hrms.exit_checklists(resignation_id);
CREATE INDEX IF NOT EXISTS idx_hrms_asset_clearances_workspace_employee ON hrms.asset_clearances(workspace_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_asset_clearances_resignation ON hrms.asset_clearances(resignation_id);
CREATE INDEX IF NOT EXISTS idx_hrms_fnf_settlements_workspace_status ON hrms.fnf_settlements(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_exit_letters_workspace_status ON hrms.employee_exit_letters(workspace_id, status);

ALTER TABLE hrms.resignation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.asset_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.fnf_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_exit_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrms_resignations_authenticated_access ON hrms.resignation_requests;
DROP POLICY IF EXISTS hrms_exit_checklist_items_authenticated_access ON hrms.exit_checklist_items;
DROP POLICY IF EXISTS hrms_exit_checklists_authenticated_access ON hrms.exit_checklists;
DROP POLICY IF EXISTS hrms_asset_clearances_authenticated_access ON hrms.asset_clearances;
DROP POLICY IF EXISTS hrms_fnf_settlements_authenticated_access ON hrms.fnf_settlements;
DROP POLICY IF EXISTS hrms_exit_letters_authenticated_access ON hrms.employee_exit_letters;

CREATE POLICY hrms_resignations_authenticated_access ON hrms.resignation_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY hrms_exit_checklist_items_authenticated_access ON hrms.exit_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY hrms_exit_checklists_authenticated_access ON hrms.exit_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY hrms_asset_clearances_authenticated_access ON hrms.asset_clearances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY hrms_fnf_settlements_authenticated_access ON hrms.fnf_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY hrms_exit_letters_authenticated_access ON hrms.employee_exit_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA hrms TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  hrms.resignation_requests,
  hrms.exit_checklist_items,
  hrms.exit_checklists,
  hrms.asset_clearances,
  hrms.fnf_settlements,
  hrms.employee_exit_letters
TO authenticated, service_role;

DROP TRIGGER IF EXISTS set_updated_at ON hrms.resignation_requests;
DROP TRIGGER IF EXISTS set_updated_at ON hrms.exit_checklist_items;
DROP TRIGGER IF EXISTS set_updated_at ON hrms.exit_checklists;
DROP TRIGGER IF EXISTS set_updated_at ON hrms.asset_clearances;
DROP TRIGGER IF EXISTS set_updated_at ON hrms.fnf_settlements;
DROP TRIGGER IF EXISTS set_updated_at ON hrms.employee_exit_letters;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.resignation_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.exit_checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.exit_checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.asset_clearances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.fnf_settlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.employee_exit_letters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_active, is_core)
VALUES ('hrms_separation', 'HRMS Separation', 'Manage resignations, exit checklist, asset clearance, FNF settlement, and exit letters', 57, TRUE, TRUE)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  is_core = EXCLUDED.is_core,
  updated_at = NOW();

INSERT INTO public.crm_module_features (
  module_id,
  feature_key,
  feature_name,
  description,
  feature_type,
  display_order
)
SELECT modules.id, features.feature_key, features.feature_name, features.description, features.feature_type::public.crm_feature_type, features.display_order
FROM public.crm_modules modules
CROSS JOIN (
  VALUES
    ('view', 'View Separation', 'View separation workspace', 'view', 1),
    ('view_resignation', 'View Resignations', 'View resignation requests', 'view', 2),
    ('create_resignation', 'Create Resignations', 'Submit resignation requests', 'crud', 3),
    ('manage_resignation', 'Manage Resignations', 'Review and update resignation requests', 'crud', 4),
    ('view_checklist', 'View Exit Checklist', 'View exit checklist templates and assignments', 'view', 5),
    ('manage_checklist', 'Manage Exit Checklist', 'Create and update exit checklist tasks', 'crud', 6),
    ('view_assets', 'View Asset Clearance', 'View asset clearance records', 'view', 7),
    ('manage_assets', 'Manage Asset Clearance', 'Create and update asset clearance records', 'crud', 8),
    ('view_fnf', 'View FNF Settlement', 'View full and final settlement records', 'view', 9),
    ('manage_fnf', 'Manage FNF Settlement', 'Create and update full and final settlements', 'crud', 10),
    ('view_letters', 'View Exit Letters', 'View relieving and experience letters', 'view', 11),
    ('manage_letters', 'Manage Exit Letters', 'Create and issue relieving and experience letters', 'crud', 12)
) AS features(feature_key, feature_name, description, feature_type, display_order)
WHERE modules.module_key = 'hrms_separation'
ON CONFLICT (module_id, feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  feature_type = EXCLUDED.feature_type,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

DO $$
DECLARE
  workspace_record RECORD;
  role_record RECORD;
  feature_record RECORD;
  access_level public.permission_access_level;
  can_access BOOLEAN;
BEGIN
  FOR workspace_record IN SELECT id FROM public.workspaces LOOP
    FOR role_record IN
      SELECT id, role_key
      FROM public.workspace_roles
      WHERE workspace_id = workspace_record.id
    LOOP
      FOR feature_record IN
        SELECT features.id, features.feature_key
        FROM public.crm_module_features features
        JOIN public.crm_modules modules ON modules.id = features.module_id
        WHERE modules.module_key = 'hrms_separation'
      LOOP
        access_level := CASE
          WHEN role_record.role_key IN ('admin', 'owner') THEN 'all'::public.permission_access_level
          WHEN role_record.role_key = 'manager' THEN 'team'::public.permission_access_level
          WHEN role_record.role_key = 'viewer' THEN 'all'::public.permission_access_level
          ELSE 'own'::public.permission_access_level
        END;

        can_access := CASE
          WHEN role_record.role_key IN ('admin', 'owner') THEN TRUE
          WHEN role_record.role_key = 'manager' THEN TRUE
          WHEN role_record.role_key = 'viewer' THEN feature_record.feature_key IN (
            'view', 'view_resignation', 'view_checklist', 'view_assets', 'view_fnf', 'view_letters'
          )
          ELSE feature_record.feature_key IN ('view', 'view_resignation', 'create_resignation')
        END;

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
          workspace_record.id,
          role_record.id,
          feature_record.id,
          can_access,
          access_level,
          role_record.role_key IN ('admin', 'owner', 'manager'),
          role_record.role_key IN ('admin', 'owner')
        )
        ON CONFLICT (role_id, module_feature_id) DO UPDATE SET
          can_access = EXCLUDED.can_access,
          access_level = EXCLUDED.access_level,
          can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
          can_override_owner = EXCLUDED.can_override_owner,
          updated_at = NOW();
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
