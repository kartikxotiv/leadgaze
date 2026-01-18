-- Create leads_config table
CREATE TABLE IF NOT EXISTS public.leads_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_value VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  metadata JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint on entity_type and entity_value (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leads_config_entity_type_entity_value_key'
  ) THEN
    ALTER TABLE public.leads_config
      ADD CONSTRAINT leads_config_entity_type_entity_value_key UNIQUE (entity_type, entity_value);
  END IF;
END $$;

-- (Optional) Enable Row Level Security (RLS)
ALTER TABLE public.leads_config ENABLE ROW LEVEL SECURITY;

-- Rollback (manual)
-- DROP TABLE IF EXISTS public.leads_config CASCADE;
