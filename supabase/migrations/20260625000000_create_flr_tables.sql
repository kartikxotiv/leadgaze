-- =====================================================
-- FIELD LEVEL SECURITY SCHEMA
-- =====================================================

CREATE SCHEMA IF NOT EXISTS core;

GRANT USAGE ON SCHEMA core TO authenticated, service_role, anon;

-- =====================================================
-- ENTITY FIELDS TABLE
-- Master definition for all fields (system + custom)
-- =====================================================

CREATE TABLE IF NOT EXISTS core.entity_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL DEFAULT 'sales',
  entity_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, product_key, entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_entity_fields_workspace ON core.entity_fields(workspace_id);
CREATE INDEX IF NOT EXISTS idx_entity_fields_product ON core.entity_fields(workspace_id, product_key);
CREATE INDEX IF NOT EXISTS idx_entity_fields_entity_type ON core.entity_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_fields_field_key ON core.entity_fields(field_key);
CREATE INDEX IF NOT EXISTS idx_entity_fields_is_active ON core.entity_fields(is_active) WHERE is_active = true;

-- =====================================================
-- FIELD ACCESS RULES TABLE
-- Stores field security configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS core.field_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES core.entity_fields(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(field_id)
);

CREATE INDEX IF NOT EXISTS idx_field_access_rules_workspace ON core.field_access_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_field_access_rules_field_id ON core.field_access_rules(field_id);
CREATE INDEX IF NOT EXISTS idx_field_access_rules_access_type ON core.field_access_rules(access_type);

-- =====================================================
-- FIELD ACCESS MEMBERS TABLE
-- Stores users and roles with field permissions
-- =====================================================

CREATE TABLE IF NOT EXISTS core.field_access_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  field_access_rule_id UUID NOT NULL REFERENCES core.field_access_rules(id) ON DELETE CASCADE,
  member_type TEXT NOT NULL,
  member_id UUID NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_access_members_workspace ON core.field_access_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_field_access_members_access_rule ON core.field_access_members(field_access_rule_id);
CREATE INDEX IF NOT EXISTS idx_field_access_members_member ON core.field_access_members(member_type, member_id);

-- =====================================================
-- USER COLUMN PREFERENCES TABLE
-- Stores per-user column visibility and ordering
-- =====================================================

CREATE TABLE IF NOT EXISTS core.user_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{
    "visibleColumns": [],
    "columnWidths": {},
    "columnOrder": []
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_user_column_preferences_workspace ON core.user_column_preferences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_column_preferences_user ON core.user_column_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_column_preferences_entity ON core.user_column_preferences(entity_type);

-- =====================================================
-- ENTITY FIELD VALUES TABLE
-- Stores custom field values for entities
-- =====================================================

CREATE TABLE IF NOT EXISTS core.entity_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_id UUID NOT NULL REFERENCES core.entity_fields(id) ON DELETE CASCADE,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, entity_type, entity_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_field_values_workspace ON core.entity_field_values(workspace_id);
CREATE INDEX IF NOT EXISTS idx_entity_field_values_entity ON core.entity_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_field_values_field ON core.entity_field_values(field_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at on entity_fields
CREATE OR REPLACE FUNCTION core.update_entity_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_entity_fields ON core.entity_fields;
CREATE TRIGGER trigger_update_entity_fields
  BEFORE UPDATE ON core.entity_fields
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

-- Update updated_at on field_access_rules
CREATE OR REPLACE FUNCTION core.update_field_access_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_field_access_rules ON core.field_access_rules;
CREATE TRIGGER trigger_update_field_access_rules
  BEFORE UPDATE ON core.field_access_rules
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

-- Update updated_at on field_access_members
CREATE OR REPLACE FUNCTION core.update_field_access_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_field_access_members ON core.field_access_members;
CREATE TRIGGER trigger_update_field_access_members
  BEFORE UPDATE ON core.field_access_members
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

-- Update updated_at on user_column_preferences
CREATE OR REPLACE FUNCTION core.update_user_column_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_column_preferences ON core.user_column_preferences;
CREATE TRIGGER trigger_update_user_column_preferences
  BEFORE UPDATE ON core.user_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

-- Update updated_at on entity_field_values
CREATE OR REPLACE FUNCTION core.update_entity_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_entity_field_values ON core.entity_field_values;
CREATE TRIGGER trigger_update_entity_field_values
  BEFORE UPDATE ON core.entity_field_values
  FOR EACH ROW
  EXECUTE FUNCTION core.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE core.entity_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.field_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.field_access_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.user_column_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.entity_field_values ENABLE ROW LEVEL SECURITY;

-- Policy: Allow workspace members to read entity fields
CREATE POLICY entity_fields_read_policy ON core.entity_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_fields.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Allow workspace admins to insert entity fields
CREATE POLICY entity_fields_insert_policy ON core.entity_fields
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_fields.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role_id IN (
        SELECT id FROM public.workspace_roles wr
        WHERE wr.workspace_id = entity_fields.workspace_id
        AND (wr.role_key = 'admin' OR wr.role_key = 'owner')
      )
    )
  );

-- Policy: Allow workspace admins to update entity fields
CREATE POLICY entity_fields_update_policy ON core.entity_fields
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_fields.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role_id IN (
        SELECT id FROM public.workspace_roles wr
        WHERE wr.workspace_id = entity_fields.workspace_id
        AND (wr.role_key = 'admin' OR wr.role_key = 'owner')
      )
    )
  );

-- Policy: Allow workspace admins to delete entity fields
CREATE POLICY entity_fields_delete_policy ON core.entity_fields
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_fields.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role_id IN (
        SELECT id FROM public.workspace_roles wr
        WHERE wr.workspace_id = entity_fields.workspace_id
        AND (wr.role_key = 'admin' OR wr.role_key = 'owner')
      )
    )
  );

-- Policy: Allow workspace members to read field access rules
CREATE POLICY field_access_rules_read_policy ON core.field_access_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = field_access_rules.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Allow workspace admins to manage field access rules
CREATE POLICY field_access_rules_manage_policy ON core.field_access_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = field_access_rules.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role_id IN (
        SELECT id FROM public.workspace_roles wr
        WHERE wr.workspace_id = field_access_rules.workspace_id
        AND (wr.role_key = 'admin' OR wr.role_key = 'owner')
      )
    )
  );

-- Policy: Allow workspace members to read field access members
CREATE POLICY field_access_members_read_policy ON core.field_access_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = field_access_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Allow workspace admins to manage field access members
CREATE POLICY field_access_members_manage_policy ON core.field_access_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = field_access_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role_id IN (
        SELECT id FROM public.workspace_roles wr
        WHERE wr.workspace_id = field_access_members.workspace_id
        AND (wr.role_key = 'admin' OR wr.role_key = 'owner')
      )
    )
  );

-- Policy: Users can read their own column preferences
CREATE POLICY user_column_preferences_read_policy ON core.user_column_preferences
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = user_column_preferences.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Users can manage their own column preferences
CREATE POLICY user_column_preferences_manage_policy ON core.user_column_preferences
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = user_column_preferences.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role_id IN (
        SELECT id FROM public.workspace_roles wr
        WHERE wr.workspace_id = user_column_preferences.workspace_id
        AND (wr.role_key = 'admin' OR wr.role_key = 'owner')
      )
    )
  );

-- Policy: Allow workspace members to read entity field values
CREATE POLICY entity_field_values_read_policy ON core.entity_field_values
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_field_values.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Allow workspace members to insert/update entity field values
CREATE POLICY entity_field_values_manage_policy ON core.entity_field_values
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_field_values.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;
