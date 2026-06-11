/*
 * -------------------------------------------------------
 * Migration: Create Seat-Based Subscription System
 * Date: 2026-06-08
 * Description:
 *   Implements per-module seat purchasing for Leadgaze.
 *   Workspaces buy seats per product (Sales, HRMS, etc.)
 *   and assign those seats to individual users.
 *
 *   STRICTLY ADDITIVE — zero modifications to:
 *     public.workspace_members
 *     public.workspace_roles
 *     public.role_permissions
 *     public.crm_modules
 *     public.crm_module_features
 *     public.workspaces
 *
 *   Access check logic (application layer):
 *     1. Check module_entitlements — if valid row exists, allow access (bypass seats)
 *     2. Check seat_assignments — if active row exists, allow access
 *     3. Otherwise, deny and prompt to purchase seats
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

DO $$
BEGIN
  -- Billing status of a workspace's seat subscription
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'seat_subscription_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.seat_subscription_status AS ENUM (
      'active',       -- Paid and in good standing
      'trialing',     -- In a free trial period
      'past_due',     -- Payment failed, grace period
      'cancelled',    -- Cancelled, access until period end
      'expired'       -- Period ended, no access
    );
  END IF;

  -- Type of free access granted (first-class business concepts, not workarounds)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'entitlement_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.entitlement_type AS ENUM (
      'free_internal',  -- Leadgaze's own internal workspaces
      'partner',        -- Strategic partner accounts
      'close_customer', -- Selective customer gift / close relationship
      'trial',          -- Time-limited product trial
      'promo'           -- Promotional campaign access
    );
  END IF;

  -- Payment provider abstraction
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payment_provider' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_provider AS ENUM (
      'stripe',
      'razorpay',
      'manual'  -- Offline / bank transfer / invoice
    );
  END IF;

  -- Billing cycle
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'billing_cycle' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.billing_cycle AS ENUM (
      'monthly',
      'yearly'
    );
  END IF;
END $$;

-- =====================================================
-- 2. SUBSCRIPTION PRODUCTS
--    One row per billable product (Sales, HRMS, etc.)
--    Separate from crm_modules — this is the commercial
--    catalog, not the RBAC registry.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  product_key   VARCHAR(80)  NOT NULL UNIQUE,   -- 'sales', 'hrms', 'inventory', 'service_cloud'
  display_name  VARCHAR(150) NOT NULL,

  -- Pricing (per seat)
  monthly_price_per_seat NUMERIC(12, 2),        -- NULL = contact sales
  yearly_price_per_seat  NUMERIC(12, 2),        -- NULL = contact sales
  currency               CHAR(3) NOT NULL DEFAULT 'USD',

  -- Minimum seat requirement (e.g. some products may require min 1 seat)
  min_seats INTEGER NOT NULL DEFAULT 1 CHECK (min_seats >= 1),

  -- State
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_public    BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = hidden, sold only via sales team

  -- Metadata
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_products IS
  'Billable product catalog. Each row is a product users can purchase seats for (Sales, HRMS, Inventory, Service Cloud). Distinct from crm_modules — this is the commercial layer.';

COMMENT ON COLUMN public.subscription_products.product_key IS
  'Machine-readable identifier: sales, hrms, inventory, service_cloud, funds. Stable — never rename.';

CREATE INDEX IF NOT EXISTS idx_sub_products_active
  ON public.subscription_products(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 3. PRODUCT → MODULE MAP
--    Links each subscription product to the crm_modules
--    it grants access to. Bridge between billing and RBAC.
--    Zero changes to crm_modules.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_module_map (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id     UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE CASCADE,
  crm_module_id  UUID NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,

  -- Some products may grant a module in read-only mode
  -- (e.g. Service Cloud can view CRM contacts but not edit them)
  access_mode VARCHAR(20) NOT NULL DEFAULT 'full'
    CHECK (access_mode IN ('full', 'read_only')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_module_map_unique UNIQUE (product_id, crm_module_id)
);

COMMENT ON TABLE public.product_module_map IS
  'Many-to-many bridge from subscription_products to crm_modules. Defines which RBAC modules are unlocked by each product. Never modify crm_modules — only add rows here.';

CREATE INDEX IF NOT EXISTS idx_pmm_product ON public.product_module_map(product_id);
CREATE INDEX IF NOT EXISTS idx_pmm_module  ON public.product_module_map(crm_module_id);

-- =====================================================
-- 4. WORKSPACE MODULE SEATS
--    One row per workspace per product they have subscribed
--    to. Tracks seat count and billing state.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspace_module_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id)            ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,

  -- Seat counts
  seats_purchased INTEGER NOT NULL DEFAULT 1 CHECK (seats_purchased >= 1),
  seats_used      INTEGER NOT NULL DEFAULT 0 CHECK (seats_used >= 0),

  -- Billing state
  status public.seat_subscription_status NOT NULL DEFAULT 'active',

  -- Billing cycle for this subscription
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',

  -- Period
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  trial_ends_at        TIMESTAMPTZ,

  -- Payment provider abstraction
  payment_provider public.payment_provider NOT NULL DEFAULT 'stripe',

  -- Provider-specific IDs (nullable — manual/offline subscriptions won't have these)
  provider_customer_id     VARCHAR(255),   -- e.g. Stripe cus_xxx
  provider_subscription_id VARCHAR(255),   -- e.g. Stripe sub_xxx
  provider_metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A workspace can only have one active subscription per product at a time.
  -- Historical rows are kept (status = cancelled/expired).
  CONSTRAINT wms_workspace_product_active_unique
    UNIQUE (workspace_id, product_id)  -- enforced at app layer for active only; DB unique ensures cleanliness
);

COMMENT ON TABLE public.workspace_module_seats IS
  'Per-workspace seat subscription for each product. seats_used is maintained by trigger when seat_assignments change.';

COMMENT ON COLUMN public.workspace_module_seats.seats_used IS
  'Denormalized count maintained automatically by trigger on seat_assignments. Do not update manually.';

CREATE INDEX IF NOT EXISTS idx_wms_workspace  ON public.workspace_module_seats(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wms_product    ON public.workspace_module_seats(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_status     ON public.workspace_module_seats(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_provider_sub
  ON public.workspace_module_seats(payment_provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- =====================================================
-- 5. SEAT ASSIGNMENTS
--    One row per user per product they have been assigned
--    a seat in. This is the runtime access check table.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seat_id      UUID NOT NULL REFERENCES public.workspace_module_seats(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id)             ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.accounts(id)               ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.subscription_products(id)  ON DELETE RESTRICT,

  -- State
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ,

  -- Audit
  assigned_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  revoked_by  UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active assignment per user per product per workspace
  CONSTRAINT sa_user_product_workspace_active_unique
    UNIQUE (workspace_id, user_id, product_id)
);

COMMENT ON TABLE public.seat_assignments IS
  'Maps a user to a product seat within a workspace. The runtime check for module access is: does an active seat_assignment row exist for this (workspace_id, user_id, product_id)?';

CREATE INDEX IF NOT EXISTS idx_sa_workspace_user  ON public.seat_assignments(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sa_seat            ON public.seat_assignments(seat_id);
CREATE INDEX IF NOT EXISTS idx_sa_user_product    ON public.seat_assignments(user_id, product_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sa_workspace_active
  ON public.seat_assignments(workspace_id, product_id, is_active)
  WHERE is_active = TRUE;

-- =====================================================
-- 6. MODULE ENTITLEMENTS
--    First-class free access tiers — not workarounds.
--    Internal workspaces, partners, close customers, pilots.
--    The access check hits this BEFORE checking seat_assignments.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.module_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id)            ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,

  -- What kind of free access is this?
  entitlement_type public.entitlement_type NOT NULL,

  -- Seat limit (NULL = unlimited — good for internal and partners)
  granted_seats INTEGER CHECK (granted_seats IS NULL OR granted_seats >= 1),

  -- Time-bound entitlements (NULL = never expires)
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Mandatory: who approved this and why
  granted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  reason     TEXT NOT NULL,

  -- State (can be revoked without deletion — preserves audit trail)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at   TIMESTAMPTZ,
  revoked_by   UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  revoke_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active entitlement per workspace per product
  CONSTRAINT me_workspace_product_active_unique
    UNIQUE (workspace_id, product_id)
);

COMMENT ON TABLE public.module_entitlements IS
  'First-class free access grants. Types: free_internal (Leadgaze own workspaces), partner, close_customer, trial, promo. Access check: if a valid entitlement exists, skip seat check entirely. Every grant requires a reason for auditability.';

COMMENT ON COLUMN public.module_entitlements.granted_seats IS
  'NULL = unlimited seats for this entitlement. Use for internal and partner accounts. Set a number for time-limited pilots.';

CREATE INDEX IF NOT EXISTS idx_me_workspace_product
  ON public.module_entitlements(workspace_id, product_id)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_me_type
  ON public.module_entitlements(entitlement_type)
  WHERE is_active = TRUE;

-- =====================================================
-- 7. PAYMENT EVENTS LOG
--    Immutable ledger of payment provider webhooks/events.
--    Idempotent — provider_event_id is unique.
--    Source of truth for reconciliation and debugging.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  seat_id      UUID REFERENCES public.workspace_module_seats(id) ON DELETE SET NULL,

  -- Provider
  payment_provider public.payment_provider NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,  -- e.g. Stripe event ID evt_xxx
  event_type        VARCHAR(100) NOT NULL,  -- e.g. invoice.payment_succeeded

  -- Payload
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Processing state
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payment_events_provider_event_unique
    UNIQUE (payment_provider, provider_event_id)
);

COMMENT ON TABLE public.payment_events IS
  'Immutable log of payment provider webhook events. Used for reconciliation and debugging. provider_event_id uniqueness ensures idempotent webhook processing.';

CREATE INDEX IF NOT EXISTS idx_pe_workspace   ON public.payment_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pe_seat        ON public.payment_events(seat_id);
CREATE INDEX IF NOT EXISTS idx_pe_provider    ON public.payment_events(payment_provider, event_type);
CREATE INDEX IF NOT EXISTS idx_pe_unprocessed
  ON public.payment_events(created_at)
  WHERE processed_at IS NULL;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- 8a. updated_at maintenance
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'subscription_products',
    'product_module_map',
    'workspace_module_seats',
    'seat_assignments',
    'module_entitlements'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
       CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- 8b. Maintain seats_used on workspace_module_seats
--     Fires after any insert/update/delete on seat_assignments.
CREATE OR REPLACE FUNCTION public.sync_seats_used()
RETURNS TRIGGER AS $$
DECLARE
  v_seat_id UUID;
BEGIN
  v_seat_id := COALESCE(NEW.seat_id, OLD.seat_id);

  UPDATE public.workspace_module_seats
  SET seats_used = (
    SELECT COUNT(*)::INTEGER
    FROM public.seat_assignments
    WHERE seat_id = v_seat_id
      AND is_active = TRUE
  ),
  updated_at = NOW()
  WHERE id = v_seat_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sa_seats_used_insert ON public.seat_assignments;
CREATE TRIGGER trg_sa_seats_used_insert
  AFTER INSERT ON public.seat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_seats_used();

DROP TRIGGER IF EXISTS trg_sa_seats_used_update ON public.seat_assignments;
CREATE TRIGGER trg_sa_seats_used_update
  AFTER UPDATE OF is_active, seat_id ON public.seat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_seats_used();

DROP TRIGGER IF EXISTS trg_sa_seats_used_delete ON public.seat_assignments;
CREATE TRIGGER trg_sa_seats_used_delete
  AFTER DELETE ON public.seat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_seats_used();

-- 8c. Guard: prevent over-assigning seats
--     Raises an error if assigning a seat would exceed seats_purchased.
--     Skipped if the workspace has an active entitlement with NULL granted_seats.
CREATE OR REPLACE FUNCTION public.guard_seat_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_purchased   INTEGER;
  v_used        INTEGER;
  v_has_unlimited_entitlement BOOLEAN;
BEGIN
  -- Check if this workspace has an unlimited entitlement for this product
  SELECT EXISTS (
    SELECT 1 FROM public.module_entitlements
    WHERE workspace_id = NEW.workspace_id
      AND product_id   = NEW.product_id
      AND is_active    = TRUE
      AND (valid_until IS NULL OR valid_until > NOW())
      AND granted_seats IS NULL
  ) INTO v_has_unlimited_entitlement;

  IF v_has_unlimited_entitlement THEN
    RETURN NEW;
  END IF;

  -- Check capacity against purchased seats
  SELECT seats_purchased, seats_used
  INTO v_purchased, v_used
  FROM public.workspace_module_seats
  WHERE id = NEW.seat_id;

  IF v_used >= v_purchased THEN
    RAISE EXCEPTION
      'Seat capacity exceeded: workspace has % seats purchased and all are in use. Purchase more seats to assign additional users.',
      v_purchased;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sa_guard_capacity ON public.seat_assignments;
CREATE TRIGGER trg_sa_guard_capacity
  BEFORE INSERT ON public.seat_assignments
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION public.guard_seat_capacity();

-- =====================================================
-- 9. HELPER FUNCTION — runtime access check
--    Call from application or RLS policies.
--    Returns TRUE if the user can access the product.
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_product_access(
  p_user_id      UUID,
  p_workspace_id UUID,
  p_product_key  VARCHAR
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Step 1: Check entitlements (free access bypasses seat check)
  SELECT EXISTS (
    SELECT 1
    FROM public.module_entitlements me
    JOIN public.subscription_products sp ON sp.id = me.product_id
    WHERE me.workspace_id = p_workspace_id
      AND sp.product_key  = p_product_key
      AND me.is_active    = TRUE
      AND (me.valid_until IS NULL OR me.valid_until > NOW())
  )
  -- Step 2: Check seat assignment
  OR EXISTS (
    SELECT 1
    FROM public.seat_assignments sa
    JOIN public.subscription_products sp ON sp.id = sa.product_id
    JOIN public.workspace_module_seats wms ON wms.id = sa.seat_id
    WHERE sa.workspace_id = p_workspace_id
      AND sa.user_id      = p_user_id
      AND sp.product_key  = p_product_key
      AND sa.is_active    = TRUE
      AND wms.status      IN ('active', 'trialing')
      AND (wms.current_period_end IS NULL OR wms.current_period_end > NOW())
  )
$$;

COMMENT ON FUNCTION public.user_has_product_access IS
  'Runtime check: returns TRUE if the user can access the given product key in the given workspace. Checks entitlements first (free access), then seat assignments. Call this from your API layer before allowing module access.';

GRANT EXECUTE ON FUNCTION public.user_has_product_access(UUID, UUID, VARCHAR)
  TO authenticated, service_role;

-- =====================================================
-- 10. RLS AND GRANTS
-- =====================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'subscription_products',
    'product_module_map',
    'workspace_module_seats',
    'seat_assignments',
    'module_entitlements',
    'payment_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_policy ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_policy ON public.%I
       FOR ALL TO authenticated, service_role, anon
       USING (true) WITH CHECK (true)',
      tbl, tbl
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role',
      tbl
    );
  END LOOP;
END $$;

-- =====================================================
-- 11. SEED SUBSCRIPTION PRODUCTS
--     Insert the four current Leadgaze products.
--     product_module_map rows added separately once you
--     confirm which crm_module keys map to each product.
-- =====================================================

INSERT INTO public.subscription_products
  (product_key, display_name, monthly_price_per_seat, yearly_price_per_seat, currency, description)
VALUES
  ('sales',         'Sales CRM',       NULL, NULL, 'USD', 'Leads, contacts, accounts, opportunities, and pipeline management'),
  ('hrms',          'HR Management',   NULL, NULL, 'USD', 'Employee management, attendance, leave, payroll, and recruitment'),
  ('inventory',     'Inventory',       NULL, NULL, 'USD', 'Products, warehouses, stock, purchase orders, and sales orders'),
  ('service_cloud', 'Service Cloud',   NULL, NULL, 'USD', 'Helpdesk, support tickets, and customer communication'),
  ('funds',         'Fundraising',     NULL, NULL, 'USD', 'Investor pipeline, funding rounds, and deal tracking')
ON CONFLICT (product_key) DO NOTHING;

-- =====================================================
-- 12. SEED product_module_map
--     Maps each product to the crm_module rows it unlocks.
--     Uses DO block so we can resolve UUIDs by module_key.
-- =====================================================

DO $$
DECLARE
  v_sales_id         UUID;
  v_hrms_id          UUID;
  v_inventory_id     UUID;
  v_service_cloud_id UUID;
  v_funds_id         UUID;

  v_mod_id UUID;
  v_module_key TEXT;
BEGIN
  SELECT id INTO v_sales_id         FROM public.subscription_products WHERE product_key = 'sales';
  SELECT id INTO v_hrms_id          FROM public.subscription_products WHERE product_key = 'hrms';
  SELECT id INTO v_inventory_id     FROM public.subscription_products WHERE product_key = 'inventory';
  SELECT id INTO v_service_cloud_id FROM public.subscription_products WHERE product_key = 'service_cloud';
  SELECT id INTO v_funds_id         FROM public.subscription_products WHERE product_key = 'funds';

  -- Sales CRM modules
  FOREACH v_module_key IN ARRAY ARRAY[
    'leads', 'contacts', 'accounts', 'opportunities', 'activities',
    'reports', 'settings', 'team_members', 'roles', 'audit_logs', 'emails'
  ]
  LOOP
    SELECT id INTO v_mod_id FROM public.crm_modules WHERE module_key = v_module_key;
    IF v_mod_id IS NOT NULL AND v_sales_id IS NOT NULL THEN
      INSERT INTO public.product_module_map (product_id, crm_module_id)
      VALUES (v_sales_id, v_mod_id)
      ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- HRMS modules
  FOREACH v_module_key IN ARRAY ARRAY[
    'hrms', 'hrms_employees', 'hrms_departments', 'hrms_attendance',
    'hrms_leave', 'hrms_payroll', 'hrms_settings', 'hrms_documents',
    'hrms_recruitment', 'hrms_separation', 'hrms_support_system'
  ]
  LOOP
    SELECT id INTO v_mod_id FROM public.crm_modules WHERE module_key = v_module_key;
    IF v_mod_id IS NOT NULL AND v_hrms_id IS NOT NULL THEN
      INSERT INTO public.product_module_map (product_id, crm_module_id)
      VALUES (v_hrms_id, v_mod_id)
      ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Inventory modules
  FOREACH v_module_key IN ARRAY ARRAY[
    'inventory', 'inventory_products', 'inventory_warehouses',
    'inventory_stock', 'inventory_purchases', 'inventory_customers',
    'inventory_sales', 'inventory_audits', 'inventory_reports'
  ]
  LOOP
    SELECT id INTO v_mod_id FROM public.crm_modules WHERE module_key = v_module_key;
    IF v_mod_id IS NOT NULL AND v_inventory_id IS NOT NULL THEN
      INSERT INTO public.product_module_map (product_id, crm_module_id)
      VALUES (v_inventory_id, v_mod_id)
      ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Service Cloud modules
  FOREACH v_module_key IN ARRAY ARRAY[
    'service_cloud', 'service_cloud_customers', 'service_cloud_tickets',
    'service_cloud_inboxes', 'service_cloud_teams',
    'service_cloud_time_tracking', 'service_cloud_reports', 'service_cloud_settings'
  ]
  LOOP
    SELECT id INTO v_mod_id FROM public.crm_modules WHERE module_key = v_module_key;
    IF v_mod_id IS NOT NULL AND v_service_cloud_id IS NOT NULL THEN
      INSERT INTO public.product_module_map (product_id, crm_module_id)
      VALUES (v_service_cloud_id, v_mod_id)
      ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Fundraising modules
  FOREACH v_module_key IN ARRAY ARRAY[
    'fundraising_investors', 'fundraising_rounds', 'fundraising_pipeline'
  ]
  LOOP
    SELECT id INTO v_mod_id FROM public.crm_modules WHERE module_key = v_module_key;
    IF v_mod_id IS NOT NULL AND v_funds_id IS NOT NULL THEN
      INSERT INTO public.product_module_map (product_id, crm_module_id)
      VALUES (v_funds_id, v_mod_id)
      ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;