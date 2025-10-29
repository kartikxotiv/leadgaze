-- Create organization_config table
create table if not exists public.organization_config (
  id uuid primary key default gen_random_uuid(),
  entity_type varchar(50) not null,
  entity_value varchar(100) not null,
  display_name varchar(100) not null,
  description text,
  config_data jsonb,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add unique constraint on entity_type and entity_value
alter table public.organization_config
  add constraint organization_config_entity_type_entity_value_key unique (entity_type, entity_value);

-- (Optional but recommended) Enable Row Level Security
alter table public.organization_config enable row level security;

-- For rollback, use:
-- drop table if exists public.organization_config cascade;
