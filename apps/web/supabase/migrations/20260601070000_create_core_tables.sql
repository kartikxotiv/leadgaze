-- =====================================================
-- CORE SCHEMA
-- =====================================================

CREATE SCHEMA IF NOT EXISTS core;

GRANT USAGE ON SCHEMA core TO authenticated, service_role, anon;

-- =====================================================
-- MODULE REGISTRY
-- =====================================================

create table core.modules (
    id uuid primary key default gen_random_uuid(),

    module_key text not null unique,
    module_name text not null,

    description text,

    icon text,
    color text,

    display_order integer not null default 0,

    is_active boolean not null default true,
    is_system boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_core_modules_module_key on core.modules(module_key);
create index if not exists idx_core_modules_is_active on core.modules(is_active) where is_active = true;

create table core.module_features (
    id uuid primary key default gen_random_uuid(),

    module_id uuid not null references core.modules(id) on delete cascade,

    feature_key text not null,
    feature_name text not null,

    description text,

    display_order integer not null default 0,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(module_id, feature_key)
);

create index if not exists idx_core_module_features_module_id on core.module_features(module_id);
create index if not exists idx_core_module_features_feature_key on core.module_features(feature_key);
create index if not exists idx_core_module_features_is_active on core.module_features(is_active) where is_active = true;

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================

create table core.plans (
    id uuid primary key default gen_random_uuid(),

    plan_key text not null unique,
    plan_name text not null,

    monthly_price numeric(12,2),
    yearly_price numeric(12,2),

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_core_plans_plan_key on core.plans(plan_key);
create index if not exists idx_core_plans_is_active on core.plans(is_active) where is_active = true;

create table core.plan_modules (
    id uuid primary key default gen_random_uuid(),

    plan_id uuid not null references core.plans(id) on delete cascade,
    module_id uuid not null references core.modules(id) on delete cascade,

    is_enabled boolean not null default true,

    unique(plan_id, module_id)
);

create index if not exists idx_core_plan_modules_plan_id on core.plan_modules(plan_id);
create index if not exists idx_core_plan_modules_module_id on core.plan_modules(module_id);

create table core.workspace_subscriptions (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    plan_id uuid not null references core.plans(id),

    status text not null default 'active',

    starts_at timestamptz,
    expires_at timestamptz,

    created_at timestamptz not null default now()
);

create index if not exists idx_core_workspace_subscriptions_workspace_id on core.workspace_subscriptions(workspace_id);
create index if not exists idx_core_workspace_subscriptions_plan_id on core.workspace_subscriptions(plan_id);
create index if not exists idx_core_workspace_subscriptions_status on core.workspace_subscriptions(status);
create index if not exists idx_core_workspace_subscriptions_expires_at on core.workspace_subscriptions(workspace_id, expires_at);

create table core.workspace_modules (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    module_id uuid not null references core.modules(id) on delete cascade,

    is_enabled boolean not null default true,

    enabled_at timestamptz default now(),

    unique(workspace_id, module_id)
);

create index if not exists idx_core_workspace_modules_workspace_id on core.workspace_modules(workspace_id);
create index if not exists idx_core_workspace_modules_module_id on core.workspace_modules(module_id);
create index if not exists idx_core_workspace_modules_enabled on core.workspace_modules(workspace_id, is_enabled) where is_enabled = true;

alter table core.modules enable row level security;
alter table core.module_features enable row level security;
alter table core.plans enable row level security;
alter table core.plan_modules enable row level security;
alter table core.workspace_subscriptions enable row level security;
alter table core.workspace_modules enable row level security;

drop policy if exists modules_policy on core.modules;
create policy modules_policy on core.modules for all using (true) with check (true);

drop policy if exists module_features_policy on core.module_features;
create policy module_features_policy on core.module_features for all using (true) with check (true);

drop policy if exists plans_policy on core.plans;
create policy plans_policy on core.plans for all using (true) with check (true);

drop policy if exists plan_modules_policy on core.plan_modules;
create policy plan_modules_policy on core.plan_modules for all using (true) with check (true);

drop policy if exists workspace_subscriptions_policy on core.workspace_subscriptions;
create policy workspace_subscriptions_policy on core.workspace_subscriptions for all using (true) with check (true);

drop policy if exists workspace_modules_policy on core.workspace_modules;
create policy workspace_modules_policy on core.workspace_modules for all using (true) with check (true);

GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;
