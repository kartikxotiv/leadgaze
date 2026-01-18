-- Create users_config table
CREATE TABLE IF NOT EXISTS public.users_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_value VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint on entity_type and entity_value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_config_entity_type_entity_value_key'
  ) THEN
    ALTER TABLE public.users_config
      ADD CONSTRAINT users_config_entity_type_entity_value_key UNIQUE (entity_type, entity_value);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.users_config ENABLE ROW LEVEL SECURITY;
