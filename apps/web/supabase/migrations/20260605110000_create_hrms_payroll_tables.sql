CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA IF NOT EXISTS hrms;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'salary_component_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.salary_component_type AS ENUM ('earning', 'deduction', 'employer_contribution');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payroll_run_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.payroll_run_status AS ENUM ('draft', 'calculating', 'processed', 'approved', 'paid', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'salary_calculation_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.salary_calculation_type AS ENUM ('fixed_amount', 'percentage_of_ctc', 'percentage_of_basic', 'percentage_of_gross', 'formula');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'compensation_assignment_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.compensation_assignment_type AS ENUM ('primary', 'secondary', 'contract', 'retainer');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'compensation_assignment_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.compensation_assignment_status AS ENUM ('draft', 'active', 'closed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'pay_frequency' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.pay_frequency AS ENUM ('monthly', 'hourly', 'daily', 'one_time');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'pay_item_source_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.pay_item_source_type AS ENUM ('manual', 'bonus', 'incentive', 'reimbursement', 'arrear', 'adjustment', 'attendance', 'statutory');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'pay_item_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.pay_item_status AS ENUM ('draft', 'approved', 'cancelled', 'applied');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payroll_entry_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.payroll_entry_status AS ENUM ('draft', 'calculated', 'approved', 'paid', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payroll_item_source' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.payroll_item_source AS ENUM ('assignment', 'pay_item', 'attendance', 'statutory', 'manual', 'arrear');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payslip_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.payslip_status AS ENUM ('generated', 'published', 'void');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS hrms.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    currency_code CHAR(3) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_salary_structures_unique_name_per_workspace UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS hrms.salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type hrms.salary_component_type NOT NULL,
    taxable BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_statutory BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring_default BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_salary_components_unique_code_per_workspace UNIQUE (workspace_id, code),
    CONSTRAINT hrms_salary_components_unique_name_per_workspace UNIQUE (workspace_id, name, type)
);

CREATE TABLE IF NOT EXISTS hrms.salary_structure_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES hrms.salary_structures(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES hrms.salary_components(id) ON DELETE CASCADE,
    calculation_type hrms.salary_calculation_type NOT NULL DEFAULT 'fixed_amount',
    calculation_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount_override NUMERIC(14, 2),
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    is_pro_ratable BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_salary_structure_component_unique UNIQUE (salary_structure_id, salary_component_id),
    CONSTRAINT hrms_salary_structure_component_calc_value_non_negative CHECK (calculation_value >= 0),
    CONSTRAINT hrms_salary_structure_component_amount_override_non_negative CHECK (amount_override IS NULL OR amount_override >= 0)
);

CREATE TABLE IF NOT EXISTS hrms.employee_compensation_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    salary_structure_id UUID REFERENCES hrms.salary_structures(id) ON DELETE SET NULL,
    assignment_type hrms.compensation_assignment_type NOT NULL DEFAULT 'primary',
    status hrms.compensation_assignment_status NOT NULL DEFAULT 'draft',
    pay_frequency hrms.pay_frequency NOT NULL DEFAULT 'monthly',
    currency_code CHAR(3) NOT NULL DEFAULT 'INR',
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    annual_ctc NUMERIC(14, 2),
    monthly_gross NUMERIC(14, 2),
    hourly_rate NUMERIC(14, 2),
    target_variable_amount NUMERIC(14, 2),
    effective_from DATE NOT NULL,
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_employee_comp_assignments_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT hrms_employee_comp_assignments_positive_amounts CHECK (
        COALESCE(annual_ctc, 0) >= 0
        AND COALESCE(monthly_gross, 0) >= 0
        AND COALESCE(hourly_rate, 0) >= 0
        AND COALESCE(target_variable_amount, 0) >= 0
    ),
    CONSTRAINT hrms_employee_comp_assignments_primary_type_check CHECK (
        (is_primary = FALSE) OR (assignment_type = 'primary')
    )
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'hrms_employee_comp_assignments_no_overlapping_primary'
    ) THEN
        ALTER TABLE hrms.employee_compensation_assignments
            ADD CONSTRAINT hrms_employee_comp_assignments_no_overlapping_primary
            EXCLUDE USING gist (
                workspace_id WITH =,
                employee_id WITH =,
                daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
            )
            WHERE (
                is_primary
                AND status IN ('draft', 'active')
            );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS hrms.employee_compensation_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    compensation_assignment_id UUID NOT NULL REFERENCES hrms.employee_compensation_assignments(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES hrms.salary_components(id) ON DELETE CASCADE,
    calculation_type hrms.salary_calculation_type NOT NULL DEFAULT 'fixed_amount',
    calculation_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount_override NUMERIC(14, 2),
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
    is_pro_ratable BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    display_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_employee_comp_components_unique UNIQUE (compensation_assignment_id, salary_component_id, effective_from),
    CONSTRAINT hrms_employee_comp_components_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT hrms_employee_comp_components_non_negative CHECK (
        calculation_value >= 0
        AND (amount_override IS NULL OR amount_override >= 0)
    )
);

CREATE TABLE IF NOT EXISTS hrms.employee_pay_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    compensation_assignment_id UUID REFERENCES hrms.employee_compensation_assignments(id) ON DELETE SET NULL,
    salary_component_id UUID NOT NULL REFERENCES hrms.salary_components(id) ON DELETE RESTRICT,
    source_type hrms.pay_item_source_type NOT NULL DEFAULT 'manual',
    status hrms.pay_item_status NOT NULL DEFAULT 'draft',
    amount NUMERIC(14, 2) NOT NULL,
    quantity NUMERIC(12, 2),
    rate NUMERIC(14, 2),
    effective_date DATE NOT NULL,
    payable_in_period_start DATE,
    payable_in_period_end DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_employee_pay_items_amount_non_zero CHECK (amount <> 0),
    CONSTRAINT hrms_employee_pay_items_period_valid CHECK (
        payable_in_period_end IS NULL
        OR payable_in_period_start IS NULL
        OR payable_in_period_end >= payable_in_period_start
    )
);

CREATE TABLE IF NOT EXISTS hrms.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE,
    status hrms.payroll_run_status NOT NULL DEFAULT 'draft',
    locked_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_payroll_runs_period_valid CHECK (period_end >= period_start),
    CONSTRAINT hrms_payroll_runs_unique_period UNIQUE (workspace_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS hrms.payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES hrms.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    compensation_assignment_id UUID REFERENCES hrms.employee_compensation_assignments(id) ON DELETE SET NULL,
    status hrms.payroll_entry_status NOT NULL DEFAULT 'draft',
    attendance_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    lop_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    paid_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
    gross_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    employer_contributions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(14, 2) NOT NULL DEFAULT 0,
    calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_payroll_entries_unique_employee_per_run UNIQUE (workspace_id, payroll_run_id, employee_id),
    CONSTRAINT hrms_payroll_entries_non_negative_totals CHECK (
        attendance_days >= 0
        AND lop_days >= 0
        AND paid_days >= 0
        AND gross_earnings >= 0
        AND total_deductions >= 0
        AND employer_contributions >= 0
        AND net_pay >= 0
    )
);

CREATE TABLE IF NOT EXISTS hrms.payroll_entry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    payroll_entry_id UUID NOT NULL REFERENCES hrms.payroll_entries(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES hrms.salary_components(id) ON DELETE RESTRICT,
    employee_pay_item_id UUID REFERENCES hrms.employee_pay_items(id) ON DELETE SET NULL,
    source hrms.payroll_item_source NOT NULL DEFAULT 'assignment',
    amount NUMERIC(14, 2) NOT NULL,
    quantity NUMERIC(12, 2),
    rate NUMERIC(14, 2),
    is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
    is_employer_side BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 100,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_payroll_entry_items_unique UNIQUE (payroll_entry_id, salary_component_id, source, employee_pay_item_id)
);

CREATE TABLE IF NOT EXISTS hrms.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES hrms.payroll_runs(id) ON DELETE CASCADE,
    payroll_entry_id UUID NOT NULL REFERENCES hrms.payroll_entries(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    status hrms.payslip_status NOT NULL DEFAULT 'generated',
    gross_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    employer_contributions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_payslips_unique_employee_per_run UNIQUE (workspace_id, payroll_run_id, employee_id),
    CONSTRAINT hrms_payslips_unique_entry UNIQUE (payroll_entry_id)
);

CREATE TABLE IF NOT EXISTS hrms.payslip_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    payslip_id UUID NOT NULL REFERENCES hrms.payslips(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES hrms.salary_components(id) ON DELETE RESTRICT,
    payroll_entry_item_id UUID REFERENCES hrms.payroll_entry_items(id) ON DELETE SET NULL,
    source hrms.payroll_item_source NOT NULL DEFAULT 'assignment',
    amount NUMERIC(14, 2) NOT NULL,
    quantity NUMERIC(12, 2),
    rate NUMERIC(14, 2),
    is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
    is_employer_side BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 100,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_payslip_components_unique UNIQUE (payslip_id, salary_component_id, source, payroll_entry_item_id)
);

CREATE INDEX IF NOT EXISTS idx_hrms_salary_structures_workspace ON hrms.salary_structures(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_salary_components_workspace_type ON hrms.salary_components(workspace_id, type, is_active);
CREATE INDEX IF NOT EXISTS idx_hrms_salary_structure_components_workspace ON hrms.salary_structure_components(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_salary_structure_components_structure ON hrms.salary_structure_components(salary_structure_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_comp_assignments_workspace ON hrms.employee_compensation_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_comp_assignments_employee ON hrms.employee_compensation_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_comp_assignments_active_dates ON hrms.employee_compensation_assignments(employee_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_comp_components_workspace ON hrms.employee_compensation_components(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_comp_components_assignment ON hrms.employee_compensation_components(compensation_assignment_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_pay_items_workspace ON hrms.employee_pay_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_pay_items_employee ON hrms.employee_pay_items(employee_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_pay_items_status ON hrms.employee_pay_items(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_runs_workspace ON hrms.payroll_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_runs_period ON hrms.payroll_runs(workspace_id, period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_entries_workspace ON hrms.payroll_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_entries_run ON hrms.payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_entries_employee ON hrms.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_entry_items_workspace ON hrms.payroll_entry_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payroll_entry_items_entry ON hrms.payroll_entry_items(payroll_entry_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payslips_workspace ON hrms.payslips(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payslips_payroll_run ON hrms.payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payslips_employee ON hrms.payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payslip_components_workspace ON hrms.payslip_components(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_payslip_components_payslip ON hrms.payslip_components(payslip_id);

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'salary_structures',
        'salary_components',
        'salary_structure_components',
        'employee_compensation_assignments',
        'employee_compensation_components',
        'employee_pay_items',
        'payroll_runs',
        'payroll_entries',
        'payroll_entry_items',
        'payslips',
        'payslip_components'
    ]
    LOOP
        EXECUTE format('ALTER TABLE hrms.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS hrms_%I_authenticated_access ON hrms.%I', table_name, table_name);
        EXECUTE format(
            'CREATE POLICY hrms_%I_authenticated_access ON hrms.%I FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)',
            table_name,
            table_name
        );
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.%I TO authenticated, service_role', table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON hrms.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
            table_name
        );
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA hrms TO authenticated, service_role;

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system, is_active)
VALUES ('hrms_payroll', 'HRMS Payroll', 'Manage salary structures, compensation assignments, payroll runs, and payslips', 60, TRUE, TRUE)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.crm_module_features (
    module_id,
    feature_key,
    feature_name,
    description,
    feature_type,
    display_order
)
SELECT modules.id, features.feature_key, features.feature_name, features.feature_description, features.feature_type::public.crm_feature_type, features.display_order
FROM public.crm_modules modules
CROSS JOIN (
    VALUES
        ('view', 'View Payroll', 'View payroll dashboard and payslips', 'view', 1),
        ('edit', 'Edit Payroll Setup', 'Create and update payroll setup records', 'crud', 2),
        ('process', 'Process Payroll', 'Create and calculate payroll runs', 'action', 3),
        ('approve', 'Approve Payroll', 'Approve payroll runs and publish payslips', 'action', 4),
        ('export', 'Export Payroll', 'Export payroll and payslip data', 'export', 5)
) AS features(feature_key, feature_name, feature_description, feature_type, display_order)
WHERE modules.module_key = 'hrms_payroll'
ON CONFLICT (module_id, feature_key) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    updated_at = NOW();

DO $$
DECLARE
    workspace_record RECORD;
    role_record RECORD;
BEGIN
    FOR workspace_record IN SELECT id FROM public.workspaces LOOP
        FOR role_record IN
            SELECT id, role_key
            FROM public.workspace_roles
            WHERE workspace_id = workspace_record.id
              AND role_key IN ('admin', 'manager', 'user', 'viewer')
        LOOP
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
                workspace_record.id,
                role_record.id,
                features.id,
                CASE
                    WHEN role_record.role_key = 'admin' THEN TRUE
                    WHEN role_record.role_key = 'manager' THEN features.feature_key IN ('view', 'edit', 'process', 'export')
                    WHEN role_record.role_key = 'user' THEN features.feature_key = 'view'
                    WHEN role_record.role_key = 'viewer' THEN features.feature_key = 'view'
                    ELSE FALSE
                END,
                CASE
                    WHEN role_record.role_key = 'admin' THEN 'all'::public.permission_access_level
                    WHEN role_record.role_key = 'manager' THEN 'team'::public.permission_access_level
                    WHEN role_record.role_key IN ('user', 'viewer') THEN 'own'::public.permission_access_level
                    ELSE 'none'::public.permission_access_level
                END,
                role_record.role_key IN ('admin', 'manager'),
                role_record.role_key = 'admin'
            FROM public.crm_module_features features
            JOIN public.crm_modules modules ON modules.id = features.module_id
            WHERE modules.module_key = 'hrms_payroll'
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                workspace_id = EXCLUDED.workspace_id,
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END $$;
