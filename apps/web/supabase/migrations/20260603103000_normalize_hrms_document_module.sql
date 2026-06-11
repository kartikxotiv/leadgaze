/*
 * Migration: Normalize HRMS Document Module
 *
 * Employee document records live in hrms.employee_documents. This registers a
 * dedicated Leadgaze RBAC module for the document UI/API and keeps storage
 * bucket defaults in place.
 */

INSERT INTO storage.buckets (id, name, public)
VALUES ('hrms_employee_documents', 'hrms_employee_documents', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "hrms_employee_documents_public_policy" ON storage.objects;
CREATE POLICY "hrms_employee_documents_public_policy"
ON storage.objects FOR ALL TO anon, authenticated, service_role
USING (bucket_id = 'hrms_employee_documents')
WITH CHECK (bucket_id = 'hrms_employee_documents');

INSERT INTO public.crm_modules (
    module_key,
    module_name,
    description,
    display_order,
    is_system
)
VALUES (
    'hrms_documents',
    'HRMS Documents',
    'Manage employee documents',
    53,
    TRUE
)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_system = EXCLUDED.is_system,
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
    features.description,
    features.feature_type::public.crm_feature_type,
    features.display_order
FROM public.crm_modules m
CROSS JOIN (
    VALUES
        ('view', 'View Documents', 'View employee documents', 'view', 1),
        ('create', 'Create Documents', 'Create employee document records', 'crud', 2),
        ('upload', 'Upload Documents', 'Upload employee document files', 'action', 3),
        ('edit', 'Edit Documents', 'Update employee document metadata', 'crud', 4),
        ('update', 'Update Documents', 'Legacy alias for editing employee documents', 'crud', 5),
        ('delete', 'Delete Documents', 'Delete employee document records', 'crud', 6),
        ('manage', 'Manage Documents', 'Legacy manage permission for employee documents', 'crud', 7)
) AS features(feature_key, feature_name, description, feature_type, display_order)
WHERE m.module_key = 'hrms_documents'
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
    document_module_id UUID;
BEGIN
    SELECT id INTO document_module_id
    FROM public.crm_modules
    WHERE module_key = 'hrms_documents';

    IF document_module_id IS NULL THEN
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
            WHERE f.module_id = document_module_id
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
            WHERE f.module_id = document_module_id
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
                f.feature_key = 'view',
                CASE
                    WHEN f.feature_key = 'view' THEN 'own'::public.permission_access_level
                    ELSE 'none'::public.permission_access_level
                END,
                FALSE,
                FALSE
            FROM public.crm_module_features f
            WHERE f.module_id = document_module_id
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
                f.feature_key = 'view',
                CASE
                    WHEN f.feature_key = 'view' THEN 'all'::public.permission_access_level
                    ELSE 'none'::public.permission_access_level
                END,
                FALSE,
                FALSE
            FROM public.crm_module_features f
            WHERE f.module_id = document_module_id
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
