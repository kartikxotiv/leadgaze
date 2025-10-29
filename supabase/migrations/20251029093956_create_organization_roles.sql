-- Create organization_roles table
create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  role varchar(50) not null unique,
  display_name varchar(100) not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  hierarchy_level integer not null default 0,
  is_system_role boolean default false,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (optional but recommended)
alter table public.organization_roles enable row level security;

