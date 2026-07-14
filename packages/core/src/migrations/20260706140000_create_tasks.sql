-- Migration to create core.tasks, core.task_relations, and core.task_time_logs tables

CREATE TABLE IF NOT EXISTS core.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.task_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES core.tasks(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES core.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_core_tasks_workspace ON core.tasks(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_task_relations_entity ON core.task_relations(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_task_relations_task ON core.task_relations(task_id);
CREATE INDEX IF NOT EXISTS idx_core_task_time_logs_task ON core.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_core_task_time_logs_user ON core.task_time_logs(user_id);

-- Updated at Trigger
DROP TRIGGER IF EXISTS set_core_tasks_updated_at ON core.tasks;
CREATE TRIGGER set_core_tasks_updated_at BEFORE UPDATE ON core.tasks FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_core_task_time_logs_updated_at ON core.task_time_logs;
CREATE TRIGGER set_core_task_time_logs_updated_at BEFORE UPDATE ON core.task_time_logs FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Grant permissions
GRANT ALL ON TABLE core.tasks TO authenticated, service_role, anon;
GRANT ALL ON TABLE core.task_relations TO authenticated, service_role, anon;
GRANT ALL ON TABLE core.task_time_logs TO authenticated, service_role, anon;

-- Enable RLS and create permissive policies
ALTER TABLE core.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_policy ON core.tasks;
CREATE POLICY tasks_policy ON core.tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE core.task_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_relations_policy ON core.task_relations;
CREATE POLICY task_relations_policy ON core.task_relations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE core.task_time_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_time_logs_policy ON core.task_time_logs;
CREATE POLICY task_time_logs_policy ON core.task_time_logs FOR ALL USING (true) WITH CHECK (true);

