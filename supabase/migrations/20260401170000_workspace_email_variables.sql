DROP TABLE IF EXISTS public.workspace_email_variables CASCADE;

CREATE TABLE workspace_email_variables (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, key)
);

-- ENABLE RLS
ALTER TABLE workspace_email_variables ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can view variables of their workspace" ON workspace_email_variables
    FOR ALL TO service_role, anon, authenticated
    USING (
        true
    );

-- TRIGGER
CREATE TRIGGER trg_workspace_email_variables_updated_at BEFORE
UPDATE ON workspace_email_variables FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

GRANT ALL ON public.workspace_email_variables TO authenticated, service_role, service_role;
