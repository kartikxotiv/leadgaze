CREATE SCHEMA IF NOT EXISTS hrms;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'leave_request_status'
          AND n.nspname = 'hrms'
    ) THEN
        CREATE TYPE hrms.leave_request_status AS ENUM (
            'pending',
            'approved',
            'rejected',
            'cancelled'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'attendance_record_status'
          AND n.nspname = 'hrms'
    ) THEN
        CREATE TYPE hrms.attendance_record_status AS ENUM (
            'present',
            'absent'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'attendance_punch_type'
          AND n.nspname = 'hrms'
    ) THEN
        CREATE TYPE hrms.attendance_punch_type AS ENUM (
            'in',
            'out'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS hrms.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    annual_allocation NUMERIC(6, 2) NOT NULL DEFAULT 0,
    can_carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
    requires_hr_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_leave_types_workspace_code_unique UNIQUE (workspace_id, code),
    CONSTRAINT hrms_leave_types_workspace_name_unique UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS hrms.leave_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_leave_holidays_workspace_date_name_unique UNIQUE (workspace_id, holiday_date, name)
);

CREATE TABLE IF NOT EXISTS hrms.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES hrms.leave_types(id) ON DELETE RESTRICT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    day_count NUMERIC(6, 2) NOT NULL DEFAULT 1,
    reason TEXT,
    status hrms.leave_request_status NOT NULL DEFAULT 'pending',
    approver_employee_id UUID REFERENCES hrms.employees(id) ON DELETE SET NULL,
    decision_at TIMESTAMPTZ,
    decision_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_leave_requests_valid_date_range CHECK (to_date >= from_date)
);

CREATE TABLE IF NOT EXISTS hrms.attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    working_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_attendance_settings_workspace_unique UNIQUE (workspace_id),
    CONSTRAINT hrms_attendance_settings_valid_days CHECK (
        working_days <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
    )
);

CREATE TABLE IF NOT EXISTS hrms.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status hrms.attendance_record_status NOT NULL DEFAULT 'absent',
    work_hours NUMERIC(6, 2),
    shift_id UUID REFERENCES hrms.shifts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT hrms_attendance_records_workspace_employee_date_unique UNIQUE (workspace_id, employee_id, date),
    CONSTRAINT hrms_attendance_records_checkout_after_checkin CHECK (
        check_out IS NULL OR check_in IS NULL OR check_out >= check_in
    )
);

CREATE TABLE IF NOT EXISTS hrms.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES hrms.attendance_records(id) ON DELETE SET NULL,
    punch_type hrms.attendance_punch_type NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hrms_leave_types_workspace_id
    ON hrms.leave_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_leave_holidays_workspace_date
    ON hrms.leave_holidays(workspace_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_hrms_leave_requests_workspace_employee
    ON hrms.leave_requests(workspace_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_leave_requests_workspace_status
    ON hrms.leave_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_attendance_records_workspace_date
    ON hrms.attendance_records(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_hrms_attendance_records_employee_date
    ON hrms.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_hrms_attendance_logs_workspace_employee_time
    ON hrms.attendance_logs(workspace_id, employee_id, punch_time DESC);

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'leave_types',
        'leave_holidays',
        'leave_requests',
        'attendance_settings',
        'attendance_records'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON hrms.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
            table_name
        );
    END LOOP;
END $$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'leave_types',
        'leave_holidays',
        'leave_requests',
        'attendance_settings',
        'attendance_records',
        'attendance_logs'
    ]
    LOOP
        EXECUTE format('ALTER TABLE hrms.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON hrms.%I', 'hrms_' || table_name || '_authenticated_access', table_name);
        EXECUTE format(
            'CREATE POLICY %I ON hrms.%I FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)',
            'hrms_' || table_name || '_authenticated_access',
            table_name
        );
        EXECUTE format('GRANT ALL ON hrms.%I TO authenticated, service_role', table_name);
    END LOOP;
END $$;

INSERT INTO public.crm_modules (
    module_key,
    module_name,
    description,
    display_order,
    is_system,
    is_active
)
VALUES
    ('hrms_attendance', 'HRMS Attendance', 'Manage attendance records and shifts', 54, TRUE, TRUE),
    ('hrms_leave', 'HRMS Leave', 'Manage leave requests, holidays, and balances', 55, TRUE, TRUE)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
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
SELECT
    m.id,
    features.feature_key,
    features.feature_name,
    features.feature_description,
    features.feature_type::public.crm_feature_type,
    features.display_order
FROM public.crm_modules m
CROSS JOIN (
    VALUES
        ('hrms_attendance', 'view', 'View Attendance', 'View attendance records', 'view', 1),
        ('hrms_attendance', 'log', 'Log Attendance', 'Check in and check out', 'action', 2),
        ('hrms_attendance', 'approve', 'Approve Attendance', 'Review team attendance', 'action', 3),
        ('hrms_attendance', 'create', 'Manage Shifts', 'Create and manage shifts', 'crud', 4),
        ('hrms_attendance', 'edit', 'Edit Attendance', 'Edit attendance records', 'crud', 5),
        ('hrms_attendance', 'delete', 'Delete Attendance', 'Delete attendance records', 'crud', 6),
        ('hrms_leave', 'view', 'View Leave', 'View leave requests', 'view', 1),
        ('hrms_leave', 'create', 'Apply Leave', 'Submit leave requests', 'crud', 2),
        ('hrms_leave', 'approve', 'Approve Leave', 'Approve or reject leave requests', 'action', 3),
        ('hrms_leave', 'approve_requests', 'Approve Requests', 'Approve team leave requests', 'action', 4),
        ('hrms_leave', 'view_approvals', 'View Approvals', 'View leave approval queue', 'view', 5),
        ('hrms_leave', 'view_requests', 'View Requests', 'View leave request history', 'view', 6),
        ('hrms_leave', 'manage_holidays', 'Manage Holidays', 'Create and edit holidays', 'crud', 7),
        ('hrms_leave', 'view_holidays', 'View Holidays', 'View holiday calendar', 'view', 8),
        ('hrms_leave', 'manage_types', 'Manage Leave Types', 'Create and edit leave types', 'crud', 9),
        ('hrms_leave', 'view_reports', 'View Leave Reports', 'View leave reports', 'view', 10)
) AS features(module_key, feature_key, feature_name, feature_description, feature_type, display_order)
WHERE m.module_key = features.module_key
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
              AND role_key = 'admin'
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
                f.id,
                TRUE,
                'all'::public.permission_access_level,
                TRUE,
                TRUE
            FROM public.crm_module_features f
            JOIN public.crm_modules m ON m.id = f.module_id
            WHERE m.module_key IN ('hrms_attendance', 'hrms_leave')
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
