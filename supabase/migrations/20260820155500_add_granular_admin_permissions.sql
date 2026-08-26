-- =====================================================
-- Migration: Add granular permissions to admin.role_permissions
-- =====================================================

ALTER TABLE admin.role_permissions
    ADD COLUMN IF NOT EXISTS can_view BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_create BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_delete BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing super-admin permissions to have full access
UPDATE admin.role_permissions
SET 
    can_view = TRUE,
    can_create = TRUE,
    can_edit = TRUE,
    can_delete = TRUE
FROM admin.roles r
WHERE admin.role_permissions.role_id = r.id AND r.slug = 'super-admin';

-- Update support-agent to have view/edit (no delete)
UPDATE admin.role_permissions
SET 
    can_view = TRUE,
    can_create = FALSE,
    can_edit = TRUE,
    can_delete = FALSE
FROM admin.roles r
WHERE admin.role_permissions.role_id = r.id AND r.slug = 'support-agent';

-- Update billing-admin to have view/edit (no delete)
UPDATE admin.role_permissions
SET 
    can_view = TRUE,
    can_create = FALSE,
    can_edit = TRUE,
    can_delete = FALSE
FROM admin.roles r
WHERE admin.role_permissions.role_id = r.id AND r.slug = 'billing-admin';
