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
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'hr_request_category' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.hr_request_category AS ENUM ('payroll', 'policy', 'personal_details', 'documents', 'benefits', 'other');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'hr_request_priority' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.hr_request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'hr_request_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.hr_request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'announcement_category' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.announcement_category AS ENUM ('general', 'policy', 'payroll', 'event');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'announcement_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.announcement_status AS ENUM ('draft', 'published', 'archived');
    END IF;
END $$;

ALTER TABLE hrms.employees
    ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);

CREATE TABLE IF NOT EXISTS hrms.hr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrms.employees(id) ON DELETE CASCADE,
    category hrms.hr_request_category NOT NULL,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    priority hrms.hr_request_priority NOT NULL DEFAULT 'medium',
    status hrms.hr_request_status NOT NULL DEFAULT 'open',
    response_message TEXT,
    resolved_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hrms.company_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    summary TEXT,
    body TEXT NOT NULL,
    category hrms.announcement_category NOT NULL DEFAULT 'general',
    status hrms.announcement_status NOT NULL DEFAULT 'published',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cta_label VARCHAR(80),
    cta_url TEXT,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hrms_hr_requests_workspace ON hrms.hr_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_hr_requests_employee ON hrms.hr_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_hr_requests_workspace_status ON hrms.hr_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_hr_requests_created_at ON hrms.hr_requests(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hrms_company_announcements_workspace ON hrms.company_announcements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hrms_company_announcements_status ON hrms.company_announcements(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_company_announcements_published ON hrms.company_announcements(workspace_id, is_pinned DESC, published_at DESC);

ALTER TABLE hrms.hr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.company_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrms_hr_requests_authenticated_access ON hrms.hr_requests;
CREATE POLICY hrms_hr_requests_authenticated_access ON hrms.hr_requests
    FOR ALL TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS hrms_company_announcements_authenticated_access ON hrms.company_announcements;
CREATE POLICY hrms_company_announcements_authenticated_access ON hrms.company_announcements
    FOR ALL TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

GRANT USAGE ON SCHEMA hrms TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.hr_requests TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hrms.company_announcements TO authenticated, service_role;

DROP TRIGGER IF EXISTS set_updated_at ON hrms.hr_requests;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON hrms.hr_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON hrms.company_announcements;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON hrms.company_announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system, is_active)
VALUES ('hrms_self_service', 'HRMS Self Service', 'Employee self-service portal for profile updates, HR requests, announcements, and payslips', 59, TRUE, TRUE)
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
        ('view', 'View Self Service', 'View self-service dashboard, profile, requests, announcements, and payslips', 'view', 1),
        ('update_profile', 'Update Profile', 'Update own personal profile details', 'action', 2),
        ('create_request', 'Raise HR Request', 'Create own HR requests and tickets', 'action', 3),
        ('download_payslip', 'Download Payslip', 'Download own employee payslips', 'export', 4)
) AS features(feature_key, feature_name, feature_description, feature_type, display_order)
WHERE modules.module_key = 'hrms_self_service'
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
                    WHEN role_record.role_key IN ('admin', 'manager', 'user') THEN TRUE
                    WHEN role_record.role_key = 'viewer' THEN features.feature_key = 'view'
                    ELSE FALSE
                END,
                CASE
                    WHEN role_record.role_key = 'admin' THEN 'all'::public.permission_access_level
                    WHEN role_record.role_key IN ('manager', 'user', 'viewer') THEN 'own'::public.permission_access_level
                    ELSE 'none'::public.permission_access_level
                END,
                role_record.role_key = 'admin',
                role_record.role_key = 'admin'
            FROM public.crm_module_features features
            JOIN public.crm_modules modules ON modules.id = features.module_id
            WHERE modules.module_key = 'hrms_self_service'
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
