-- =====================================================
-- TRUSTED DEVICES TABLE
-- =====================================================
-- Stores trusted device tokens so users can skip MFA
-- on recognized devices for up to 30 days.
-- =====================================================

create table if not exists core.trusted_devices (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id) on delete cascade,

    device_token text not null unique,

    device_name text,

    browser text,

    os text,

    ip_address text,

    expires_at timestamptz not null,

    last_used_at timestamptz,

    created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_trusted_devices_user_id
    on core.trusted_devices(user_id);

create index if not exists idx_trusted_devices_device_token
    on core.trusted_devices(device_token);

create index if not exists idx_trusted_devices_expires_at
    on core.trusted_devices(expires_at);

-- Enable RLS
alter table core.trusted_devices enable row level security;

-- Users can only see and modify their own trusted devices
drop policy if exists trusted_devices_select_policy on core.trusted_devices;
create policy trusted_devices_select_policy
    on core.trusted_devices
    for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists trusted_devices_insert_policy on core.trusted_devices;
create policy trusted_devices_insert_policy
    on core.trusted_devices
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists trusted_devices_delete_policy on core.trusted_devices;
create policy trusted_devices_delete_policy
    on core.trusted_devices
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, DELETE ON core.trusted_devices TO authenticated;
GRANT ALL ON core.trusted_devices TO service_role, authenticated, anon;
