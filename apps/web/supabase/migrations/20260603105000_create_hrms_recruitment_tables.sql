CREATE SCHEMA IF NOT EXISTS hrms;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_requisition_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_requisition_status AS ENUM ('draft', 'open', 'on_hold', 'filled', 'closed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_priority' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_employment_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_employment_type AS ENUM ('full_time', 'part_time', 'contract', 'intern');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_candidate_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_candidate_status AS ENUM ('sourced', 'applied', 'screening', 'interview', 'shortlisted', 'offered', 'hired', 'rejected', 'withdrawn');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_interview_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_interview_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_interview_round_type' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_interview_round_type AS ENUM ('screening', 'technical', 'managerial', 'panel', 'hr');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_feedback_recommendation' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_feedback_recommendation AS ENUM ('strong_yes', 'yes', 'maybe', 'no');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_offer_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_offer_status AS ENUM ('draft', 'approval_pending', 'sent', 'accepted', 'declined', 'expired');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'recruitment_onboarding_status' AND n.nspname = 'hrms') THEN
        CREATE TYPE hrms.recruitment_onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS hrms.recruitment_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    department_id UUID,
    requested_by_employee_id UUID,
    owner_employee_id UUID,
    hiring_manager_employee_id UUID,
    requisition_code VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    employment_type hrms.recruitment_employment_type NOT NULL DEFAULT 'full_time',
    location VARCHAR(150),
    priority hrms.recruitment_priority NOT NULL DEFAULT 'medium',
    openings INTEGER NOT NULL DEFAULT 1,
    status hrms.recruitment_requisition_status NOT NULL DEFAULT 'draft',
    target_start_date DATE,
    description TEXT,
    compensation_min NUMERIC(14, 2),
    compensation_max NUMERIC(14, 2),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_requisitions_department_id_fkey FOREIGN KEY (department_id) REFERENCES hrms.departments(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_requisitions_requested_by_employee_id_fkey FOREIGN KEY (requested_by_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_requisitions_owner_employee_id_fkey FOREIGN KEY (owner_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_requisitions_hiring_manager_employee_id_fkey FOREIGN KEY (hiring_manager_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT hrms_recruitment_requisitions_workspace_code_unique UNIQUE (workspace_id, requisition_code),
    CONSTRAINT hrms_recruitment_requisitions_openings_positive CHECK (openings > 0),
    CONSTRAINT hrms_recruitment_requisitions_compensation_order CHECK (compensation_min IS NULL OR compensation_max IS NULL OR compensation_max >= compensation_min)
);

CREATE TABLE IF NOT EXISTS hrms.recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES hrms.recruitment_requisitions(id) ON DELETE CASCADE,
    owner_employee_id UUID,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    source VARCHAR(120),
    current_company VARCHAR(200),
    current_designation VARCHAR(200),
    experience_years NUMERIC(5, 2),
    notice_period_days INTEGER,
    current_ctc NUMERIC(14, 2),
    expected_ctc NUMERIC(14, 2),
    resume_url TEXT,
    status hrms.recruitment_candidate_status NOT NULL DEFAULT 'applied',
    applied_at DATE NOT NULL DEFAULT CURRENT_DATE,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_candidates_owner_employee_id_fkey FOREIGN KEY (owner_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT hrms_recruitment_candidates_workspace_requisition_email_unique UNIQUE (workspace_id, requisition_id, email),
    CONSTRAINT hrms_recruitment_candidates_experience_non_negative CHECK (experience_years IS NULL OR experience_years >= 0),
    CONSTRAINT hrms_recruitment_candidates_notice_period_non_negative CHECK (notice_period_days IS NULL OR notice_period_days >= 0)
);

CREATE TABLE IF NOT EXISTS hrms.recruitment_candidate_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hrms.recruitment_candidates(id) ON DELETE CASCADE,
    author_employee_id UUID,
    note TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_candidate_notes_author_employee_id_fkey FOREIGN KEY (author_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hrms.recruitment_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hrms.recruitment_candidates(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES hrms.recruitment_requisitions(id) ON DELETE CASCADE,
    interviewer_employee_id UUID,
    title VARCHAR(200) NOT NULL,
    round_type hrms.recruitment_interview_round_type NOT NULL DEFAULT 'screening',
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    meeting_link TEXT,
    location VARCHAR(200),
    status hrms.recruitment_interview_status NOT NULL DEFAULT 'scheduled',
    outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_interviews_interviewer_employee_id_fkey FOREIGN KEY (interviewer_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT hrms_recruitment_interviews_duration_positive CHECK (duration_minutes > 0)
);

CREATE TABLE IF NOT EXISTS hrms.recruitment_interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES hrms.recruitment_interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hrms.recruitment_candidates(id) ON DELETE CASCADE,
    interviewer_employee_id UUID,
    recommendation hrms.recruitment_feedback_recommendation NOT NULL DEFAULT 'yes',
    rating INTEGER,
    strengths TEXT,
    concerns TEXT,
    summary TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_interview_feedback_interviewer_employee_id_fkey FOREIGN KEY (interviewer_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT hrms_recruitment_feedback_interview_interviewer_unique UNIQUE (interview_id, interviewer_employee_id),
    CONSTRAINT hrms_recruitment_feedback_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS hrms.recruitment_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hrms.recruitment_candidates(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES hrms.recruitment_requisitions(id) ON DELETE CASCADE,
    approved_by_employee_id UUID,
    offered_designation VARCHAR(200) NOT NULL,
    salary_amount NUMERIC(14, 2) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'INR',
    joining_date DATE,
    status hrms.recruitment_offer_status NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_offers_approved_by_employee_id_fkey FOREIGN KEY (approved_by_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL,
    CONSTRAINT hrms_recruitment_offers_salary_non_negative CHECK (salary_amount >= 0)
);

CREATE TABLE IF NOT EXISTS hrms.recruitment_onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES hrms.recruitment_candidates(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES hrms.recruitment_offers(id) ON DELETE SET NULL,
    owner_employee_id UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE,
    status hrms.recruitment_onboarding_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    CONSTRAINT recruitment_onboarding_tasks_owner_employee_id_fkey FOREIGN KEY (owner_employee_id) REFERENCES hrms.employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_requisitions_workspace_status ON hrms.recruitment_requisitions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_requisitions_workspace_department ON hrms.recruitment_requisitions(workspace_id, department_id);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_candidates_workspace_status ON hrms.recruitment_candidates(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_candidates_requisition ON hrms.recruitment_candidates(requisition_id);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_candidate_notes_candidate ON hrms.recruitment_candidate_notes(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_interviews_workspace_schedule ON hrms.recruitment_interviews(workspace_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_feedback_candidate ON hrms.recruitment_interview_feedback(candidate_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_offers_workspace_status ON hrms.recruitment_offers(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_hrms_recruitment_onboarding_workspace_status ON hrms.recruitment_onboarding_tasks(workspace_id, status);

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'recruitment_requisitions',
        'recruitment_candidates',
        'recruitment_candidate_notes',
        'recruitment_interviews',
        'recruitment_interview_feedback',
        'recruitment_offers',
        'recruitment_onboarding_tasks'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON hrms.%I', table_name);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON hrms.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', table_name);
        EXECUTE format('ALTER TABLE hrms.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON hrms.%I', 'hrms_' || table_name || '_authenticated_access', table_name);
        EXECUTE format('CREATE POLICY %I ON hrms.%I FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE)', 'hrms_' || table_name || '_authenticated_access', table_name);
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
    ('hrms_recruitment', 'HRMS Recruitment', 'Manage requisitions, candidates, interviews, offers, and onboarding', 56, TRUE, TRUE)
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
    modules.id,
    features.feature_key,
    features.feature_name,
    features.feature_description,
    features.feature_type::public.crm_feature_type,
    features.display_order
FROM public.crm_modules modules
CROSS JOIN (
    VALUES
        ('view', 'View Recruitment', 'View recruitment dashboard and pipeline records', 'view', 1),
        ('create', 'Create Requisitions', 'Create hiring requisitions', 'crud', 2),
        ('edit', 'Edit Requisitions', 'Edit hiring requisitions', 'crud', 3),
        ('delete', 'Delete Recruitment Records', 'Delete recruitment records', 'crud', 4),
        ('manage_candidates', 'Manage Candidates', 'Create and update candidates', 'crud', 5),
        ('schedule_interviews', 'Schedule Interviews', 'Create and update interviews', 'action', 6),
        ('record_feedback', 'Record Feedback', 'Submit interview feedback', 'action', 7),
        ('add_notes', 'Add Candidate Notes', 'Add candidate notes', 'action', 8),
        ('manage_offers', 'Manage Offers', 'Create and update offers', 'crud', 9),
        ('manage_onboarding', 'Manage Onboarding', 'Create and update onboarding tasks', 'crud', 10),
        ('manage', 'Manage Recruitment', 'Full recruitment management', 'crud', 11)
) AS features(feature_key, feature_name, feature_description, feature_type, display_order)
WHERE modules.module_key = 'hrms_recruitment'
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
                    WHEN role_record.role_key = 'manager' THEN TRUE
                    WHEN role_record.role_key = 'user' THEN FALSE
                    WHEN role_record.role_key = 'viewer' THEN features.feature_key = 'view'
                    ELSE FALSE
                END,
                CASE
                    WHEN role_record.role_key = 'admin' THEN 'all'::public.permission_access_level
                    WHEN role_record.role_key = 'manager' THEN 'team'::public.permission_access_level
                    WHEN role_record.role_key = 'viewer' THEN 'all'::public.permission_access_level
                    WHEN role_record.role_key = 'user' THEN 'none'::public.permission_access_level
                    ELSE 'none'::public.permission_access_level
                END,
                role_record.role_key = 'admin',
                role_record.role_key = 'admin'
            FROM public.crm_module_features features
            JOIN public.crm_modules modules ON modules.id = features.module_id
            WHERE modules.module_key = 'hrms_recruitment'
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
