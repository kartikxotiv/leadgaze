-- Create users_config table
create table if not exists public.users_config (
  id uuid primary key default gen_random_uuid(),
  entity_type varchar(50) not null,
  entity_value varchar(100) not null,
  display_name varchar(100) not null,
  description text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add unique constraint for entity_type and entity_value as per migration
alter table public.users_config
  add constraint users_config_entity_type_entity_value_key
  unique (entity_type, entity_value);

-- (Optional but recommended) Enable Row Level Security
alter table public.users_config enable row level security;

-- For rollback, use:
-- drop table if exists public.users_config cascade;
