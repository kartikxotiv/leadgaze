/*
 * -------------------------------------------------------
 * Migration: Create CRM Modules and Features Tables
 * Date: 2026-01-24
 * Description: Creates database structure for module and feature management
 * This enables dynamic module and permission configuration for the CRM system
 * -------------------------------------------------------
 */

/*
 * -------------------------------------------------------
 * Section: Create ENUM Types
 * Define enumerated types for type safety
 * -------------------------------------------------------
 */

-- Feature type enum
DROP TYPE IF EXISTS public.crm_feature_type CASCADE;

CREATE TYPE public.crm_feature_type AS ENUM (
  'crud',      -- Create, Read, Update, Delete operations
  'action',    -- Special actions (convert, assign, etc.)
  'view',      -- Read-only views
  'export',    -- Export operations
  'import',    -- Import operations
  'bulk'       -- Bulk operations
);

COMMENT ON TYPE public.crm_feature_type IS 'Enumerated type for CRM feature classifications';

/*
 * -------------------------------------------------------
 * Section: CRM Modules Table
 * Defines the main CRM modules (Leads, Contacts, Accounts, Opportunities, etc.)
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.crm_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Module Identity
  module_key VARCHAR(50) NOT NULL UNIQUE,
  module_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- UI/UX
  icon VARCHAR(50),
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Hierarchy & Status
  parent_module_id UUID REFERENCES public.crm_modules(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT TRUE, -- system modules cannot be deleted
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_modules IS 'Defines all available CRM modules (Leads, Contacts, Accounts, Opportunities, Activities, Reports, Settings)';
COMMENT ON COLUMN public.crm_modules.module_key IS 'Unique identifier for module (leads, contacts, accounts, opportunities, activities, reports, settings)';
COMMENT ON COLUMN public.crm_modules.module_name IS 'Human-readable name of the module';
COMMENT ON COLUMN public.crm_modules.is_system IS 'If true, module cannot be deleted by users';
COMMENT ON COLUMN public.crm_modules.parent_module_id IS 'Reference to parent module for sub-modules';

-- Indexes
CREATE INDEX idx_crm_modules_key ON public.crm_modules(module_key);
CREATE INDEX idx_crm_modules_active ON public.crm_modules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_crm_modules_parent ON public.crm_modules(parent_module_id);

-- Enable RLS
ALTER TABLE public.crm_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies - crm_modules is readable by all authenticated users
CREATE POLICY crm_modules_read ON public.crm_modules FOR SELECT TO authenticated USING (is_active = TRUE);

-- Revoke and grant permissions
REVOKE ALL ON public.crm_modules FROM authenticated, service_role;
GRANT SELECT ON public.crm_modules TO authenticated, service_role;
GRANT ALL ON public.crm_modules TO service_role;

/*
 * -------------------------------------------------------
 * Section: CRM Module Features Table
 * Defines features/actions available in each module (view, create, edit, delete, export, etc.)
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.crm_module_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,
  
  -- Feature Identity
  feature_key VARCHAR(50) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Feature Classification
  feature_type public.crm_feature_type NOT NULL DEFAULT 'action'::public.crm_feature_type,
  
  -- Access Control
  requires_owner BOOLEAN NOT NULL DEFAULT FALSE, -- if true, user can only perform on records they own
  
  -- Status & Order
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT crm_module_features_unique UNIQUE (module_id, feature_key)
);

COMMENT ON TABLE public.crm_module_features IS 'Defines features/actions available within each CRM module';
COMMENT ON COLUMN public.crm_module_features.feature_key IS 'Unique identifier for feature (view, create, edit, delete, export, import, convert, assign, etc.)';
COMMENT ON COLUMN public.crm_module_features.feature_type IS 'Type of feature: crud (create/read/update/delete), action (bulk/special operations), view (read-only), export/import';
COMMENT ON COLUMN public.crm_module_features.requires_owner IS 'If true, user can only perform this action on records they own';

-- Indexes
CREATE INDEX idx_crm_module_features_module ON public.crm_module_features(module_id);
CREATE INDEX idx_crm_module_features_key ON public.crm_module_features(feature_key);
CREATE INDEX idx_crm_module_features_active ON public.crm_module_features(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.crm_module_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies - crm_module_features is readable by all authenticated users
CREATE POLICY crm_module_features_read ON public.crm_module_features FOR SELECT TO authenticated USING (is_active = TRUE);

-- Revoke and grant permissions
REVOKE ALL ON public.crm_module_features FROM authenticated, service_role;
GRANT SELECT ON public.crm_module_features TO authenticated, service_role;
GRANT ALL ON public.crm_module_features TO service_role;

/*
 * -------------------------------------------------------
 * Section: Seed Default Modules
 * Insert core CRM modules into the system
 * -------------------------------------------------------
 */

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system)
VALUES
  ('leads', 'Leads', 'Manage and track sales leads', 1, TRUE),
  ('contacts', 'Contacts', 'Manage contact information and relationships', 2, TRUE),
  ('accounts', 'Accounts', 'Manage company accounts and hierarchies', 3, TRUE),
  ('opportunities', 'Opportunities', 'Track and manage sales opportunities', 4, TRUE),
  ('activities', 'Activities', 'Log calls, meetings, and interactions', 5, TRUE),
  ('reports', 'Reports', 'View analytics and generate reports', 6, TRUE),
  ('settings', 'Settings', 'Manage workspace configuration and settings', 7, TRUE)
ON CONFLICT (module_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Leads
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Leads' as feature_name, 'View lead records' as description, 'crud' as feature_type, 1 as display_order
  UNION ALL SELECT 'create', 'Create Leads', 'Create new lead records', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Leads', 'Edit existing lead records', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Leads', 'Delete lead records', 'crud', 4
  UNION ALL SELECT 'convert', 'Convert Leads', 'Convert leads to contacts and accounts', 'action', 5
  UNION ALL SELECT 'export', 'Export Leads', 'Export lead data', 'export', 6
  UNION ALL SELECT 'import', 'Import Leads', 'Import lead data', 'import', 7
  UNION ALL SELECT 'assign', 'Assign Leads', 'Assign leads to users', 'action', 8
  UNION ALL SELECT 'add_note', 'Add Notes', 'Add notes to leads', 'action', 9
  UNION ALL SELECT 'schedule_meeting', 'Schedule Meetings', 'Schedule meetings for leads', 'action', 10
) f
WHERE m.module_key = 'leads'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Contacts
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Contacts' as feature_name, 'View contact records' as description, 'crud' as feature_type, 1 as display_order
  UNION ALL SELECT 'create', 'Create Contacts', 'Create new contact records', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Contacts', 'Edit existing contact records', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Contacts', 'Delete contact records', 'crud', 4
  UNION ALL SELECT 'export', 'Export Contacts', 'Export contact data', 'export', 5
  UNION ALL SELECT 'import', 'Import Contacts', 'Import contact data', 'import', 6
  UNION ALL SELECT 'add_note', 'Add Notes', 'Add notes to contacts', 'action', 7
  UNION ALL SELECT 'schedule_meeting', 'Schedule Meetings', 'Schedule meetings with contacts', 'action', 8
  UNION ALL SELECT 'send_email', 'Send Email', 'Send emails to contacts', 'action', 9
) f
WHERE m.module_key = 'contacts'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Accounts
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Accounts' as feature_name, 'View account records' as description, 'crud' as feature_type, 1 as display_order
  UNION ALL SELECT 'create', 'Create Accounts', 'Create new account records', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Accounts', 'Edit existing account records', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Accounts', 'Delete account records', 'crud', 4
  UNION ALL SELECT 'export', 'Export Accounts', 'Export account data', 'export', 5
  UNION ALL SELECT 'import', 'Import Accounts', 'Import account data', 'import', 6
  UNION ALL SELECT 'add_note', 'Add Notes', 'Add notes to accounts', 'action', 7
  UNION ALL SELECT 'schedule_meeting', 'Schedule Meetings', 'Schedule meetings for accounts', 'action', 8
  UNION ALL SELECT 'view_contacts', 'View Contacts', 'View contacts under account', 'view', 9
  UNION ALL SELECT 'add_contact', 'Add Contact', 'Add contacts to account', 'action', 10
  UNION ALL SELECT 'view_opportunities', 'View Opportunities', 'View opportunities under account', 'view', 11
) f
WHERE m.module_key = 'accounts'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Opportunities
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Opportunities' as feature_name, 'View opportunity records' as description, 'crud' as feature_type, 1 as display_order
  UNION ALL SELECT 'create', 'Create Opportunities', 'Create new opportunity records', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Opportunities', 'Edit existing opportunity records', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Opportunities', 'Delete opportunity records', 'crud', 4
  UNION ALL SELECT 'export', 'Export Opportunities', 'Export opportunity data', 'export', 5
  UNION ALL SELECT 'import', 'Import Opportunities', 'Import opportunity data', 'import', 6
  UNION ALL SELECT 'add_note', 'Add Notes', 'Add notes to opportunities', 'action', 7
  UNION ALL SELECT 'schedule_meeting', 'Schedule Meetings', 'Schedule meetings for opportunities', 'action', 8
  UNION ALL SELECT 'change_stage', 'Change Stage', 'Move opportunity between stages', 'action', 9
  UNION ALL SELECT 'close_won', 'Close as Won', 'Mark opportunity as closed won', 'action', 10
  UNION ALL SELECT 'close_lost', 'Close as Lost', 'Mark opportunity as closed lost', 'action', 11
) f
WHERE m.module_key = 'opportunities'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Activities
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Activities' as feature_name, 'View activity records' as description, 'crud' as feature_type, 1 as display_order
  UNION ALL SELECT 'create', 'Create Activities', 'Create new activity records', 'crud', 2
  UNION ALL SELECT 'log_call', 'Log Call', 'Log a phone call activity', 'action', 3
  UNION ALL SELECT 'log_meeting', 'Log Meeting', 'Log a meeting activity', 'action', 4
  UNION ALL SELECT 'log_email', 'Log Email', 'Log an email activity', 'action', 5
  UNION ALL SELECT 'delete', 'Delete Activities', 'Delete activity records', 'crud', 6
  UNION ALL SELECT 'export', 'Export Activities', 'Export activity data', 'export', 7
) f
WHERE m.module_key = 'activities'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Reports
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Reports' as feature_name, 'View available reports' as description, 'view' as feature_type, 1 as display_order
  UNION ALL SELECT 'create', 'Create Reports', 'Create custom reports', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Reports', 'Edit custom reports', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Reports', 'Delete custom reports', 'crud', 4
  UNION ALL SELECT 'export', 'Export Reports', 'Export report data', 'export', 5
  UNION ALL SELECT 'schedule', 'Schedule Reports', 'Schedule automated report generation', 'action', 6
) f
WHERE m.module_key = 'reports'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Seed Default Module Features for Settings
 * -------------------------------------------------------
 */

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' as feature_key, 'View Settings' as feature_name, 'View workspace settings' as description, 'view' as feature_type, 1 as display_order
  UNION ALL SELECT 'manage_modules', 'Manage Modules', 'Enable/disable modules', 'crud', 2
  UNION ALL SELECT 'manage_roles', 'Manage Roles', 'Create and manage roles', 'crud', 3
  UNION ALL SELECT 'manage_permissions', 'Manage Permissions', 'Configure role permissions', 'crud', 4
  UNION ALL SELECT 'manage_custom_fields', 'Manage Custom Fields', 'Create and manage custom fields', 'crud', 5
  UNION ALL SELECT 'manage_pipelines', 'Manage Pipelines', 'Configure sales pipelines and statuses', 'crud', 6
  UNION ALL SELECT 'manage_users', 'Manage Users', 'Manage workspace users', 'crud', 7
  UNION ALL SELECT 'view_audit_log', 'View Audit Log', 'View workspace audit logs', 'view', 8
) f
WHERE m.module_key = 'settings'
ON CONFLICT (module_id, feature_key) DO NOTHING;

/*
 * -------------------------------------------------------
 * Section: Create Sequence for Migration Tracking
 * This helps identify when new modules/features are added
 * -------------------------------------------------------
 */

CREATE SEQUENCE IF NOT EXISTS kit.module_version START 1;
