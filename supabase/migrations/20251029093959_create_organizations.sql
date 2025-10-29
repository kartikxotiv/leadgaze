-- Create the organizations table
create table if not exists public.organizations (
  organization_id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  slug varchar(255) not null unique,
  description text,
  industry_type varchar(100),
  company_size_config_id uuid references public.organization_config(id),
  primary_use_case varchar(255),
  current_tool varchar(255),
  logo_url varchar(500),
  website varchar(255),
  address text,
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100),
  phone varchar(20),
  created_by uuid references public.users(user_id),
  status_id uuid references public.organization_config(id),
  subscription_status_id uuid references public.organization_config(id),
  plan_type_id uuid references public.organization_config(id),
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  billing_email varchar(255),
  max_users integer default 5,
  max_workspaces integer default 3,
  max_storage_gb integer default 10,
  features_enabled jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable row level security on the table
alter table public.organizations enable row level security;

-- To rollback:
-- drop table if exists public.organizations cascade;

