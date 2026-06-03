/*
 * Migration: Create HRMS Employee Tables
 *
 * Ports the HRMS employee core into Leadgaze's workspace model.
 * - Uses hrms schema-owned tables and enum types.
 * - Maps HRMS organization ownership to public.workspaces.
 * - References public.accounts and public.workspace_roles for identity/RBAC.
 */

CREATE SCHEMA IF NOT EXISTS hrms;

GRANT USAGE ON SCHEMA hrms TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'employee_status'
          AND n.nspname = 'hrms'
    ) THEN
        CREATE TYPE hrms.employee_status AS ENUM (
            'invited',
            'active',
            'probation',
            'notice_period',
            'inactive',
            'exited'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'employee_employment_type'
          AND n.nspname = 'hrms'
    ) THEN
        CREATE TYPE hrms.employee_employment_type AS ENUM (
            'full_time',
            'part_time',
            'contract',
            'intern'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'document_status'
          AND n.nspname = 'hrms'
    ) THEN
        CREATE TYPE hrms.document_status AS ENUM (
            'valid',
            'invalid',
            'pending',
            'expired_soon'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS hrms.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    parent_department_id UUID REFERENCES hrms.departments(id) ON DELETE SET NULL,
    head_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    cost_center_code VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_departments_workspace_code_unique UNIQUE (workspace_id, code),
    CONSTRAINT hrms_departments_workspace_name_unique UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS hrms.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_minutes INTEGER NOT NULL DEFAULT 0 CHECK (grace_minutes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_shifts_workspace_name_unique UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS hrms.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    department_id UUID REFERENCES hrms.departments(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES hrms.shifts(id) ON DELETE SET NULL,
    manager_employee_id UUID REFERENCES hrms.employees(id) ON DELETE SET NULL,
    employee_code VARCHAR(30) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    work_email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(150),
    joining_date DATE,
    exit_date DATE,
    employment_type hrms.employee_employment_type NOT NULL DEFAULT 'full_time',
    status hrms.employee_status NOT NULL DEFAULT 'active',
    invited_at TIMESTAMPTZ,
    invited_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_employees_workspace_employee_code_unique UNIQUE (workspace_id, employee_code),
    CONSTRAINT hrms_employees_workspace_work_email_unique UNIQUE (workspace_id, work_email),
    CONSTRAINT hrms_employees_workspace_account_unique UNIQUE NULLS NOT DISTINCT (workspace_id, account_id)
);

CREATE TABLE IF NOT EXISTS hrms.employee_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_employee_roles_workspace_employee_role_unique UNIQUE (workspace_id, employee_id, role_id)
);

CREATE TABLE IF NOT EXISTS hrms.invited_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES hrms.employees(id) ON DELETE SET NULL,
    status hrms.employee_status NOT NULL DEFAULT 'invited',
    invited_email VARCHAR(255),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hrms.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES hrms.employees(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_at TIMESTAMPTZ,
    status hrms.document_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hrms_departments_workspace_id
    ON hrms.departments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_departments_parent_department_id
    ON hrms.departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_hrms_departments_head_account_id
    ON hrms.departments(head_account_id);
CREATE INDEX IF NOT EXISTS idx_hrms_departments_active
    ON hrms.departments(workspace_id, is_active);

CREATE INDEX IF NOT EXISTS idx_hrms_shifts_workspace_id
    ON hrms.shifts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_shifts_active
    ON hrms.shifts(workspace_id, is_active);

CREATE INDEX IF NOT EXISTS idx_hrms_employees_workspace_id
    ON hrms.employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employees_account_id
    ON hrms.employees(account_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employees_department_id
    ON hrms.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employees_shift_id
    ON hrms.employees(shift_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employees_manager_employee_id
    ON hrms.employees(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employees_status
    ON hrms.employees(workspace_id, status)
    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_hrms_employees_work_email_lower
    ON hrms.employees(workspace_id, LOWER(work_email));

CREATE INDEX IF NOT EXISTS idx_hrms_employee_roles_workspace_id
    ON hrms.employee_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_roles_employee_id
    ON hrms.employee_roles(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_roles_role_id
    ON hrms.employee_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_hrms_invited_employees_workspace_id
    ON hrms.invited_employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_invited_employees_employee_id
    ON hrms.invited_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_invited_employees_status
    ON hrms.invited_employees(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_invited_employees_invited_email_lower
    ON hrms.invited_employees(workspace_id, LOWER(invited_email));

CREATE INDEX IF NOT EXISTS idx_hrms_employee_documents_workspace_id
    ON hrms.employee_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_documents_employee_id
    ON hrms.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employee_documents_status
    ON hrms.employee_documents(workspace_id, status);

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'departments',
        'shifts',
        'employees',
        'employee_roles',
        'invited_employees',
        'employee_documents'
    ]
    LOOP
        EXECUTE format('ALTER TABLE hrms.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS hrms_%I_authenticated_access ON hrms.%I', table_name, table_name);
        EXECUTE format(
            'CREATE POLICY hrms_%I_authenticated_access ON hrms.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            table_name,
            table_name
        );
        EXECUTE format('GRANT ALL ON TABLE hrms.%I TO service_role, authenticated, anon', table_name);
    END LOOP;
END $$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'departments',
        'shifts',
        'employees',
        'employee_roles',
        'invited_employees',
        'employee_documents'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON hrms.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
            table_name
        );
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION hrms.link_employees_for_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        UPDATE hrms.employees
        SET account_id = NEW.id,
            updated_at = NOW()
        WHERE account_id IS NULL
          AND LOWER(work_email) = LOWER(NEW.email);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hrms_accounts_link_employees_insert_trigger ON public.accounts;
CREATE TRIGGER hrms_accounts_link_employees_insert_trigger
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION hrms.link_employees_for_account();

DROP TRIGGER IF EXISTS hrms_accounts_link_employees_update_trigger ON public.accounts;
CREATE TRIGGER hrms_accounts_link_employees_update_trigger
AFTER UPDATE OF email ON public.accounts
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION hrms.link_employees_for_account();

INSERT INTO storage.buckets (id, name, public)
VALUES ('hrms_employee_documents', 'hrms_employee_documents', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "hrms_employee_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "hrms_employee_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "hrms_employee_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "hrms_employee_documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "hrms_employee_documents_public_policy" ON storage.objects;
CREATE POLICY "hrms_employee_documents_public_policy"
ON storage.objects FOR ALL TO anon, authenticated, service_role
USING (bucket_id = 'hrms_employee_documents')
WITH CHECK (bucket_id = 'hrms_employee_documents');

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT
    m.id,
    features.feature_key,
    features.feature_name,
    features.description,
    features.feature_type::public.crm_feature_type,
    features.display_order
FROM public.crm_modules m
CROSS JOIN (
    VALUES
        ('edit', 'Edit Employees', 'Update employee profile and employment details', 'crud', 25),
        ('invite', 'Invite Employees', 'Invite employees to access the workspace', 'action', 30),
        ('export', 'Export Employees', 'Export employee records', 'export', 40),
        ('manage_documents', 'Manage Employee Documents', 'Upload and manage employee documents', 'action', 50),
        ('assign_roles', 'Assign Employee Roles', 'Assign Leadgaze workspace roles to employees', 'action', 60)
) AS features(feature_key, feature_name, description, feature_type, display_order)
WHERE m.module_key = 'hrms_employees'
ON CONFLICT (module_id, feature_key) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

DO $$
DECLARE
    workspace_record RECORD;
    admin_role_id UUID;
    manager_role_id UUID;
    user_role_id UUID;
    viewer_role_id UUID;
    employee_module_id UUID;
BEGIN
    SELECT id INTO employee_module_id
    FROM public.crm_modules
    WHERE module_key = 'hrms_employees';

    IF employee_module_id IS NULL THEN
        RETURN;
    END IF;

    FOR workspace_record IN SELECT id FROM public.workspaces LOOP
        SELECT id INTO admin_role_id
        FROM public.workspace_roles
        WHERE workspace_id = workspace_record.id
          AND role_key = 'admin'
        LIMIT 1;

        SELECT id INTO manager_role_id
        FROM public.workspace_roles
        WHERE workspace_id = workspace_record.id
          AND role_key = 'manager'
        LIMIT 1;

        SELECT id INTO user_role_id
        FROM public.workspace_roles
        WHERE workspace_id = workspace_record.id
          AND role_key = 'user'
        LIMIT 1;

        SELECT id INTO viewer_role_id
        FROM public.workspace_roles
        WHERE workspace_id = workspace_record.id
          AND role_key = 'viewer'
        LIMIT 1;

        IF admin_role_id IS NOT NULL THEN
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
                admin_role_id,
                f.id,
                TRUE,
                'all'::public.permission_access_level,
                TRUE,
                TRUE
            FROM public.crm_module_features f
            WHERE f.module_id = employee_module_id
              AND f.feature_key IN ('edit', 'invite', 'export', 'manage_documents', 'assign_roles')
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END IF;

        IF manager_role_id IS NOT NULL THEN
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
                manager_role_id,
                f.id,
                TRUE,
                'team'::public.permission_access_level,
                TRUE,
                FALSE
            FROM public.crm_module_features f
            WHERE f.module_id = employee_module_id
              AND f.feature_key IN ('edit', 'invite', 'export', 'manage_documents', 'assign_roles')
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END IF;

        IF user_role_id IS NOT NULL THEN
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
                user_role_id,
                f.id,
                FALSE,
                'none'::public.permission_access_level,
                FALSE,
                FALSE
            FROM public.crm_module_features f
            WHERE f.module_id = employee_module_id
              AND f.feature_key IN ('edit', 'invite', 'export', 'manage_documents', 'assign_roles')
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END IF;

        IF viewer_role_id IS NOT NULL THEN
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
                viewer_role_id,
                f.id,
                f.feature_key = 'export',
                CASE
                    WHEN f.feature_key = 'export' THEN 'all'::public.permission_access_level
                    ELSE 'none'::public.permission_access_level
                END,
                FALSE,
                FALSE
            FROM public.crm_module_features f
            WHERE f.module_id = employee_module_id
              AND f.feature_key IN ('edit', 'invite', 'export', 'manage_documents', 'assign_roles')
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END IF;
    END LOOP;
END $$;

COMMENT ON TABLE hrms.departments IS 'HRMS departments mapped to Leadgaze workspaces';
COMMENT ON TABLE hrms.shifts IS 'HRMS work shifts used by employee and attendance flows';
COMMENT ON TABLE hrms.employees IS 'HRMS employee records linked to Leadgaze accounts and workspaces';
COMMENT ON TABLE hrms.employee_roles IS 'Employee-to-Leadgaze workspace role assignments';
COMMENT ON TABLE hrms.invited_employees IS 'HRMS employee invitation tracking';
COMMENT ON TABLE hrms.employee_documents IS 'HRMS employee document metadata';
