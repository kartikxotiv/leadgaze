-- Enhanced database schema with additional fields and constraints

-- Add missing columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE deals ADD COLUMN IF NOT EXISTS actual_close_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Add constraints
ALTER TABLE leads ADD CONSTRAINT check_deal_value_positive CHECK (deal_value >= 0);
ALTER TABLE deals ADD CONSTRAINT check_deal_value_positive CHECK (value > 0);
ALTER TABLE deals ADD CONSTRAINT check_probability_range CHECK (probability >= 0 AND probability <= 100);

-- Create views for common queries
CREATE OR REPLACE VIEW lead_summary AS
SELECT 
  l.*,
  u1.name as assigned_user_name,
  u2.name as created_user_name,
  COUNT(t.id) as task_count,
  COUNT(d.id) as deal_count,
  COALESCE(SUM(d.value), 0) as total_deal_value
FROM leads l
LEFT JOIN users u1 ON l.assigned_to = u1.id
LEFT JOIN users u2 ON l.created_by = u2.id
LEFT JOIN tasks t ON l.id = t.lead_id
LEFT JOIN deals d ON l.id = d.lead_id
GROUP BY l.id, u1.name, u2.name;

CREATE OR REPLACE VIEW pipeline_summary AS
SELECT 
  ps.id,
  ps.name,
  ps.position,
  ps.color,
  COUNT(d.id) as deal_count,
  COALESCE(SUM(d.value), 0) as total_value,
  COALESCE(AVG(d.probability), 0) as avg_probability
FROM pipeline_stages ps
LEFT JOIN deals d ON ps.id = d.stage_id
WHERE ps.is_active = true
GROUP BY ps.id, ps.name, ps.position, ps.color
ORDER BY ps.position;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_lead_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_deal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_lead_timestamp ON leads;
CREATE TRIGGER trigger_update_lead_timestamp
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_timestamp();

DROP TRIGGER IF EXISTS trigger_update_deal_timestamp ON deals;
CREATE TRIGGER trigger_update_deal_timestamp
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_timestamp();

DROP TRIGGER IF EXISTS trigger_update_task_timestamp ON tasks;
CREATE TRIGGER trigger_update_task_timestamp
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_timestamp();
