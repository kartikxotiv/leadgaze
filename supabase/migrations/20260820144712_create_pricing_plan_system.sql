/*
 * Pricing and subscription plan foundation.
 *
 * This migration is additive. Legacy seat billing tables remain unchanged.
 * This is the prerequisite for all later plan-pricing migrations.
 */

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.subscription_products') IS NULL
     OR to_regclass('public.workspaces') IS NULL
     OR to_regclass('public.accounts') IS NULL THEN
    RAISE EXCEPTION 'Pricing foundation prerequisites are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_products WHERE product_key = 'sales'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscription_products WHERE product_key = 'service_cloud'
  ) THEN
    RAISE EXCEPTION 'Sales and Service Cloud subscription products must exist';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Pricing catalog
-- ---------------------------------------------------------------------------

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key VARCHAR(40) NOT NULL UNIQUE,
  plan_name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  parent_plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  is_trial_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plans_key_format CHECK (plan_key ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT plans_not_own_parent CHECK (parent_plan_id IS NULL OR parent_plan_id <> id)
);

CREATE TABLE public.module_plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  monthly_price NUMERIC(12, 2) CHECK (monthly_price IS NULL OR monthly_price >= 0),
  annual_price NUMERIC(12, 2) CHECK (annual_price IS NULL OR annual_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency = UPPER(currency)),
  billing_unit VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT module_plan_prices_billing_unit_check CHECK (
    billing_unit IN ('per_user_per_month', 'per_user_per_year', 'free')
  ),
  CONSTRAINT module_plan_prices_module_plan_unique UNIQUE (module_id, plan_id)
);

CREATE TABLE public.feature_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(80) NOT NULL UNIQUE,
  feature_name VARCHAR(150) NOT NULL,
  feature_category VARCHAR(80),
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  description TEXT,
  data_type VARCHAR(20) NOT NULL,
  usage_metric VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_catalog_key_format CHECK (
    feature_key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
  ),
  CONSTRAINT feature_catalog_data_type_check CHECK (
    data_type IN ('boolean', 'numeric', 'enum')
  ),
  CONSTRAINT feature_catalog_usage_metric_check CHECK (
    usage_metric IS NULL OR usage_metric IN ('records', 'connections', 'credits', 'bytes')
  ),
  CONSTRAINT feature_catalog_id_module_unique UNIQUE (id, module_id)
);

CREATE TABLE public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  limit_value INTEGER CHECK (limit_value IS NULL OR limit_value >= 0),
  limit_type VARCHAR(20) NOT NULL,
  enum_value VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_entitlements_feature_module_fkey
    FOREIGN KEY (feature_id, module_id)
    REFERENCES public.feature_catalog(id, module_id) ON DELETE CASCADE,
  CONSTRAINT plan_entitlements_limit_type_check CHECK (
    limit_type IN ('boolean', 'numeric', 'enum')
  ),
  CONSTRAINT plan_entitlements_value_shape_check CHECK (
    (limit_type = 'enum' AND limit_value IS NULL)
    OR (limit_type <> 'enum' AND enum_value IS NULL)
  ),
  CONSTRAINT plan_entitlements_module_plan_feature_unique
    UNIQUE (module_id, plan_id, feature_id)
);

CREATE TABLE public.bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_key VARCHAR(80) NOT NULL UNIQUE,
  bundle_name VARCHAR(150) NOT NULL,
  description TEXT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  monthly_price NUMERIC(12, 2) CHECK (monthly_price IS NULL OR monthly_price >= 0),
  annual_price NUMERIC(12, 2) CHECK (annual_price IS NULL OR annual_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency = UPPER(currency)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bundles_key_format CHECK (bundle_key ~ '^[a-z][a-z0-9_]*$')
);

CREATE TABLE public.bundle_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bundle_modules_bundle_module_unique UNIQUE (bundle_id, module_id)
);

-- ---------------------------------------------------------------------------
-- Workspace subscriptions and provider ownership
-- ---------------------------------------------------------------------------

CREATE TABLE public.workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_status VARCHAR(30) NOT NULL DEFAULT 'free',
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_subscriptions_status_check CHECK (
    subscription_status IN (
      'free', 'trial_active', 'trial_expired', 'active', 'past_due',
      'cancelled', 'suspended', 'expired', 'payment_failed'
    )
  ),
  CONSTRAINT workspace_subscriptions_trial_dates_check CHECK (
    trial_end_date IS NULL OR (
      trial_start_date IS NOT NULL AND trial_end_date > trial_start_date
    )
  ),
  CONSTRAINT workspace_subscriptions_period_dates_check CHECK (
    current_period_end IS NULL OR (
      current_period_start IS NOT NULL AND current_period_end > current_period_start
    )
  ),
  CONSTRAINT workspace_subscriptions_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE public.workspace_module_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_subscription_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  monthly_amount NUMERIC(12, 2) CHECK (monthly_amount IS NULL OR monthly_amount >= 0),
  annual_amount NUMERIC(12, 2) CHECK (annual_amount IS NULL OR annual_amount >= 0),
  bundle_id UUID REFERENCES public.bundles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_module_subscriptions_workspace_fkey
    FOREIGN KEY (workspace_subscription_id, workspace_id)
    REFERENCES public.workspace_subscriptions(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT workspace_module_subscriptions_status_check CHECK (
    status IN ('active', 'cancelled', 'trial', 'suspended')
  ),
  CONSTRAINT workspace_module_subscriptions_workspace_module_unique
    UNIQUE (workspace_id, module_id),
  CONSTRAINT workspace_module_subscriptions_id_workspace_unique
    UNIQUE (id, workspace_id)
);

CREATE TABLE public.workspace_module_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  assigned_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_module_users_status_check CHECK (status IN ('active', 'removed')),
  CONSTRAINT workspace_module_users_removed_at_check CHECK (
    (status = 'active' AND removed_at IS NULL)
    OR (status = 'removed' AND removed_at IS NOT NULL)
  ),
  CONSTRAINT workspace_module_users_workspace_user_module_unique
    UNIQUE (workspace_id, user_id, module_id)
);

CREATE TABLE public.subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_module_subscription_id UUID,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_type VARCHAR(30) NOT NULL,
  from_plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
  to_plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
  effective_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_changes_module_subscription_fkey
    FOREIGN KEY (workspace_module_subscription_id, workspace_id)
    REFERENCES public.workspace_module_subscriptions(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT subscription_changes_type_check CHECK (
    change_type IN (
      'plan_upgrade', 'plan_downgrade', 'module_cancel', 'module_add',
      'subscription_cancel'
    )
  ),
  CONSTRAINT subscription_changes_status_check CHECK (
    status IN ('pending', 'applied', 'cancelled')
  ),
  CONSTRAINT subscription_changes_status_dates_check CHECK (
    (status = 'pending' AND applied_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'applied' AND applied_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND applied_at IS NULL)
  )
);

CREATE TABLE public.workspace_billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  provider_customer_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_billing_accounts_workspace_provider_unique
    UNIQUE (workspace_id, provider),
  CONSTRAINT workspace_billing_accounts_provider_customer_unique
    UNIQUE (provider, provider_customer_id),
  CONSTRAINT workspace_billing_accounts_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE public.workspace_billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workspace_subscription_id UUID NOT NULL,
  billing_account_id UUID NOT NULL,
  provider_subscription_id VARCHAR(255) NOT NULL,
  provider_status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_billing_subscriptions_workspace_subscription_fkey
    FOREIGN KEY (workspace_subscription_id, workspace_id)
    REFERENCES public.workspace_subscriptions(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT workspace_billing_subscriptions_billing_account_fkey
    FOREIGN KEY (billing_account_id, workspace_id)
    REFERENCES public.workspace_billing_accounts(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT workspace_billing_subscriptions_provider_subscription_unique
    UNIQUE (billing_account_id, provider_subscription_id),
  CONSTRAINT workspace_billing_subscriptions_period_dates_check CHECK (
    current_period_end IS NULL OR (
      current_period_start IS NOT NULL AND current_period_end > current_period_start
    )
  )
);

-- ---------------------------------------------------------------------------
-- Usage and provider-price mappings
-- ---------------------------------------------------------------------------

CREATE TABLE public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  feature_id UUID NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0 CHECK (current_usage >= 0),
  limit_value INTEGER CHECK (limit_value IS NULL OR limit_value >= 0),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_counters_feature_module_fkey
    FOREIGN KEY (feature_id, module_id)
    REFERENCES public.feature_catalog(id, module_id) ON DELETE CASCADE,
  CONSTRAINT usage_counters_workspace_module_feature_unique
    UNIQUE (workspace_id, module_id, feature_id)
);

CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  feature_id UUID NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity <> 0),
  resource_id UUID,
  resource_type VARCHAR(50),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT usage_events_feature_module_fkey
    FOREIGN KEY (feature_id, module_id)
    REFERENCES public.feature_catalog(id, module_id) ON DELETE CASCADE,
  CONSTRAINT usage_events_type_check CHECK (
    event_type IN ('created', 'deleted', 'imported', 'bulk_deleted')
  )
);

CREATE TABLE public.billing_provider_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_ref_type VARCHAR(20) NOT NULL,
  price_ref_id UUID NOT NULL,
  billing_cycle public.billing_cycle NOT NULL,
  provider public.payment_provider NOT NULL,
  provider_product_id VARCHAR(255),
  provider_price_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_provider_prices_ref_type_check CHECK (
    price_ref_type IN ('module_plan', 'bundle')
  ),
  CONSTRAINT billing_provider_prices_reference_unique
    UNIQUE (price_ref_type, price_ref_id, billing_cycle, provider),
  CONSTRAINT billing_provider_prices_provider_price_unique
    UNIQUE (provider, provider_price_id)
);

COMMENT ON TABLE public.billing_provider_prices IS
  'Maps catalog prices and bundles to payment-provider prices. It never stores workspace customer or subscription IDs.';

COMMENT ON TABLE public.workspace_billing_accounts IS
  'Provider customer identity owned by one workspace.';

COMMENT ON TABLE public.workspace_billing_subscriptions IS
  'Provider subscription identity linked to a provider-agnostic workspace subscription.';

-- ---------------------------------------------------------------------------
-- Indexes and integrity triggers
-- ---------------------------------------------------------------------------

CREATE INDEX plans_active_order_idx
  ON public.plans(display_order) WHERE is_active;
CREATE INDEX plans_parent_idx ON public.plans(parent_plan_id);
CREATE INDEX module_plan_prices_active_idx
  ON public.module_plan_prices(module_id, plan_id) WHERE is_active;
CREATE INDEX feature_catalog_module_active_idx
  ON public.feature_catalog(module_id, feature_key) WHERE is_active;
CREATE INDEX plan_entitlements_resolution_idx
  ON public.plan_entitlements(plan_id, feature_id);
CREATE INDEX bundles_plan_active_idx
  ON public.bundles(plan_id) WHERE is_active;
CREATE INDEX bundle_modules_module_idx ON public.bundle_modules(module_id);

CREATE INDEX workspace_subscriptions_status_idx
  ON public.workspace_subscriptions(subscription_status);
CREATE INDEX workspace_subscriptions_trial_expiry_idx
  ON public.workspace_subscriptions(trial_end_date)
  WHERE subscription_status = 'trial_active';
CREATE INDEX workspace_module_subscriptions_workspace_status_idx
  ON public.workspace_module_subscriptions(workspace_id, status);
CREATE INDEX workspace_module_subscriptions_plan_idx
  ON public.workspace_module_subscriptions(plan_id);
CREATE INDEX workspace_module_users_workspace_module_active_idx
  ON public.workspace_module_users(workspace_id, module_id, user_id)
  WHERE status = 'active';
CREATE INDEX workspace_module_users_user_active_idx
  ON public.workspace_module_users(user_id, module_id)
  WHERE status = 'active';
CREATE INDEX subscription_changes_pending_idx
  ON public.subscription_changes(effective_at)
  WHERE status = 'pending';
CREATE INDEX subscription_changes_workspace_idx
  ON public.subscription_changes(workspace_id, created_at DESC);
CREATE INDEX workspace_billing_accounts_customer_idx
  ON public.workspace_billing_accounts(provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;
CREATE INDEX workspace_billing_subscriptions_workspace_idx
  ON public.workspace_billing_subscriptions(workspace_id);

CREATE INDEX usage_counters_lookup_idx
  ON public.usage_counters(workspace_id, feature_id);
CREATE INDEX usage_events_workspace_feature_time_idx
  ON public.usage_events(workspace_id, feature_id, occurred_at DESC);
CREATE INDEX usage_events_resource_idx
  ON public.usage_events(resource_type, resource_id)
  WHERE resource_id IS NOT NULL;
CREATE INDEX billing_provider_prices_lookup_idx
  ON public.billing_provider_prices(provider, billing_cycle, price_ref_type, price_ref_id)
  WHERE is_active;

CREATE OR REPLACE FUNCTION public.validate_plan_parent_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.parent_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT p.id, p.parent_plan_id, ARRAY[p.id] AS path
      FROM public.plans p
      WHERE p.id = NEW.parent_plan_id

      UNION ALL

      SELECT parent.id,
             parent.parent_plan_id,
             child.path || parent.id
      FROM ancestors child
      JOIN public.plans parent ON parent.id = child.parent_plan_id
      WHERE NOT parent.id = ANY(child.path)
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Plan inheritance cannot contain a cycle'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER trg_plans_validate_parent_chain
BEFORE INSERT OR UPDATE OF parent_plan_id
ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.validate_plan_parent_chain();

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'plans',
    'module_plan_prices',
    'feature_catalog',
    'plan_entitlements',
    'bundles',
    'workspace_subscriptions',
    'workspace_module_subscriptions',
    'workspace_module_users',
    'subscription_changes',
    'workspace_billing_accounts',
    'workspace_billing_subscriptions',
    'billing_provider_prices'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      'trg_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.validate_billing_provider_price_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.price_ref_type = 'module_plan' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.module_plan_prices WHERE id = NEW.price_ref_id
    ) THEN
      RAISE EXCEPTION 'Unknown module plan price reference: %', NEW.price_ref_id
        USING ERRCODE = '23503';
    END IF;
  ELSIF NEW.price_ref_type = 'bundle' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bundles WHERE id = NEW.price_ref_id
    ) THEN
      RAISE EXCEPTION 'Unknown bundle reference: %', NEW.price_ref_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER trg_billing_provider_prices_validate_reference
BEFORE INSERT OR UPDATE OF price_ref_type, price_ref_id
ON public.billing_provider_prices
FOR EACH ROW EXECUTE FUNCTION public.validate_billing_provider_price_reference();

-- ---------------------------------------------------------------------------
-- Workspace access helpers and RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_is_workspace_member(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_workspace_admin(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.workspace_roles wr ON wr.id = wm.role_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'accepted'
      AND wr.role_key = 'admin'
      AND wr.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_workspace_subscription(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = auth.uid()
        OR public.current_user_is_workspace_member(p_workspace_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_workspace_subscription(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = auth.uid()
        OR public.current_user_is_workspace_admin(p_workspace_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_workspace_billing_owner(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_view_workspace_subscription(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_can_manage_workspace_subscription(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_workspace_billing_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_workspace_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_workspace_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_member(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_admin(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_workspace_subscription(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_workspace_subscription(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_workspace_billing_owner(UUID)
  TO authenticated, service_role;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'plans',
    'module_plan_prices',
    'feature_catalog',
    'plan_entitlements',
    'bundles',
    'bundle_modules',
    'workspace_subscriptions',
    'workspace_module_subscriptions',
    'workspace_module_users',
    'subscription_changes',
    'workspace_billing_accounts',
    'workspace_billing_subscriptions',
    'usage_counters',
    'usage_events',
    'billing_provider_prices'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END
$$;

GRANT SELECT ON
  public.plans,
  public.module_plan_prices,
  public.feature_catalog,
  public.plan_entitlements,
  public.bundles,
  public.bundle_modules
TO anon, authenticated;

GRANT SELECT ON
  public.workspace_subscriptions,
  public.workspace_module_subscriptions,
  public.workspace_module_users,
  public.subscription_changes,
  public.workspace_billing_accounts,
  public.workspace_billing_subscriptions,
  public.usage_counters,
  public.usage_events
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.workspace_module_users TO authenticated;
GRANT INSERT ON public.usage_events TO authenticated;

CREATE POLICY plans_public_read ON public.plans
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY module_plan_prices_public_read ON public.module_plan_prices
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY feature_catalog_public_read ON public.feature_catalog
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY plan_entitlements_public_read ON public.plan_entitlements
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY bundles_public_read ON public.bundles
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY bundle_modules_public_read ON public.bundle_modules
  FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY workspace_subscriptions_member_read ON public.workspace_subscriptions
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_workspace_subscription(workspace_id));
CREATE POLICY workspace_module_subscriptions_member_read
  ON public.workspace_module_subscriptions
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_workspace_subscription(workspace_id));
CREATE POLICY workspace_module_users_member_read ON public.workspace_module_users
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_workspace_subscription(workspace_id));
CREATE POLICY workspace_module_users_admin_insert ON public.workspace_module_users
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_manage_workspace_subscription(workspace_id));
CREATE POLICY workspace_module_users_admin_update ON public.workspace_module_users
  FOR UPDATE TO authenticated
  USING (public.current_user_can_manage_workspace_subscription(workspace_id))
  WITH CHECK (public.current_user_can_manage_workspace_subscription(workspace_id));
CREATE POLICY workspace_module_users_admin_delete ON public.workspace_module_users
  FOR DELETE TO authenticated
  USING (public.current_user_can_manage_workspace_subscription(workspace_id));
CREATE POLICY subscription_changes_member_read ON public.subscription_changes
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_workspace_subscription(workspace_id));
CREATE POLICY workspace_billing_accounts_owner_read ON public.workspace_billing_accounts
  FOR SELECT TO authenticated
  USING (public.current_user_is_workspace_billing_owner(workspace_id));
CREATE POLICY workspace_billing_subscriptions_owner_read
  ON public.workspace_billing_subscriptions
  FOR SELECT TO authenticated
  USING (public.current_user_is_workspace_billing_owner(workspace_id));
CREATE POLICY usage_counters_member_read ON public.usage_counters
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_workspace_subscription(workspace_id));
CREATE POLICY usage_events_member_read ON public.usage_events
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_workspace_subscription(workspace_id));
CREATE POLICY usage_events_member_insert ON public.usage_events
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_view_workspace_subscription(workspace_id));

-- ---------------------------------------------------------------------------
-- Entitlement functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_effective_plan_entitlement(
  p_plan_id UUID,
  p_feature_id UUID
)
RETURNS TABLE (
  is_enabled BOOLEAN,
  limit_value INTEGER,
  limit_type VARCHAR,
  enum_value VARCHAR,
  resolved_from_plan_key VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH RECURSIVE plan_chain AS (
    SELECT p.id, p.plan_key, p.parent_plan_id, 0 AS depth, ARRAY[p.id] AS path
    FROM public.plans p
    WHERE p.id = p_plan_id

    UNION ALL

    SELECT parent.id,
           parent.plan_key,
           parent.parent_plan_id,
           child.depth + 1,
           child.path || parent.id
    FROM plan_chain child
    JOIN public.plans parent ON parent.id = child.parent_plan_id
    WHERE NOT parent.id = ANY(child.path)
  )
  SELECT pe.is_enabled,
         pe.limit_value,
         pe.limit_type,
         pe.enum_value,
         pc.plan_key AS resolved_from_plan_key
  FROM plan_chain pc
  JOIN public.plan_entitlements pe
    ON pe.plan_id = pc.id
   AND pe.feature_id = p_feature_id
  ORDER BY pc.depth
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_entitlement_context(
  p_workspace_id UUID,
  p_module_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  module_subscription RECORD;
  feature_context JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.current_user_can_view_workspace_subscription(p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace access denied' USING ERRCODE = '42501';
  END IF;

  SELECT wms.module_id,
         wms.plan_id,
         wms.status AS module_status,
         ws.subscription_status,
         ws.billing_cycle,
         ws.trial_end_date,
         ws.current_period_start,
         ws.current_period_end,
         p.plan_key,
         p.plan_name
  INTO module_subscription
  FROM public.workspace_module_subscriptions wms
  JOIN public.workspace_subscriptions ws
    ON ws.id = wms.workspace_subscription_id
   AND ws.workspace_id = wms.workspace_id
  JOIN public.subscription_products sp ON sp.id = wms.module_id
  JOIN public.plans p ON p.id = wms.plan_id
  WHERE wms.workspace_id = p_workspace_id
    AND sp.product_key = p_module_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      fc.feature_key,
      jsonb_build_object(
        'is_enabled', COALESCE(effective.is_enabled, FALSE),
        'limit_value', effective.limit_value,
        'limit_type', COALESCE(effective.limit_type, fc.data_type),
        'enum_value', effective.enum_value,
        'current_usage', COALESCE(uc.current_usage, 0),
        'percentage_used', CASE
          WHEN effective.limit_type <> 'numeric' OR effective.limit_value IS NULL THEN NULL
          WHEN effective.limit_value = 0 THEN 100
          ELSE ROUND(
            (COALESCE(uc.current_usage, 0)::NUMERIC / effective.limit_value::NUMERIC) * 100,
            2
          )
        END,
        'is_near_limit', CASE
          WHEN effective.limit_type = 'numeric' AND effective.limit_value IS NOT NULL
            THEN COALESCE(uc.current_usage, 0) >= CEIL(effective.limit_value * 0.8)
          ELSE FALSE
        END,
        'is_at_limit', CASE
          WHEN effective.limit_type = 'numeric' AND effective.limit_value IS NOT NULL
            THEN COALESCE(uc.current_usage, 0) >= effective.limit_value
          ELSE FALSE
        END,
        'resolved_from_plan_key', effective.resolved_from_plan_key
      )
      ORDER BY fc.feature_key
    ),
    '{}'::jsonb
  )
  INTO feature_context
  FROM public.feature_catalog fc
  LEFT JOIN LATERAL public.get_effective_plan_entitlement(
    module_subscription.plan_id,
    fc.id
  ) effective ON TRUE
  LEFT JOIN public.usage_counters uc
    ON uc.workspace_id = p_workspace_id
   AND uc.module_id = fc.module_id
   AND uc.feature_id = fc.id
  WHERE fc.module_id = module_subscription.module_id
    AND fc.is_active;

  RETURN jsonb_build_object(
    'workspace_id', p_workspace_id,
    'module_key', p_module_key,
    'plan', jsonb_build_object(
      'plan_key', module_subscription.plan_key,
      'plan_name', module_subscription.plan_name,
      'subscription_status', module_subscription.subscription_status,
      'module_status', module_subscription.module_status,
      'billing_cycle', module_subscription.billing_cycle,
      'trial_end_date', module_subscription.trial_end_date,
      'current_period_start', module_subscription.current_period_start,
      'current_period_end', module_subscription.current_period_end
    ),
    'features', feature_context
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.try_consume_entitlement(
  p_workspace_id UUID,
  p_feature_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  counter_row RECORD;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.current_user_can_view_workspace_subscription(p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace access denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.usage_counters
  SET current_usage = current_usage + p_quantity,
      last_updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND feature_id = p_feature_id
    AND (limit_value IS NULL OR current_usage + p_quantity <= limit_value)
  RETURNING current_usage, limit_value INTO counter_row;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'remaining', CASE
        WHEN counter_row.limit_value IS NULL THEN NULL
        ELSE counter_row.limit_value - counter_row.current_usage
      END,
      'current_usage', counter_row.current_usage,
      'limit', counter_row.limit_value
    );
  END IF;

  SELECT current_usage, limit_value
  INTO counter_row
  FROM public.usage_counters
  WHERE workspace_id = p_workspace_id
    AND feature_id = p_feature_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'counter_not_initialized',
      'remaining', 0,
      'current_usage', 0,
      'limit', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', FALSE,
    'reason', 'limit_exceeded',
    'remaining', GREATEST(counter_row.limit_value - counter_row.current_usage, 0),
    'current_usage', counter_row.current_usage,
    'limit', counter_row.limit_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_entitlement(
  p_workspace_id UUID,
  p_feature_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.current_user_can_view_workspace_subscription(p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace access denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.usage_counters
  SET current_usage = GREATEST(current_usage - p_quantity, 0),
      last_updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND feature_id = p_feature_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_plan_entitlement(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_workspace_entitlement_context(UUID, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_consume_entitlement(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_entitlement(UUID, UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_effective_plan_entitlement(UUID, UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_workspace_entitlement_context(UUID, VARCHAR)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.try_consume_entitlement(UUID, UUID, INTEGER)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_entitlement(UUID, UUID, INTEGER)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Plan, price, feature, and bundle seeds
-- ---------------------------------------------------------------------------

INSERT INTO public.plans (
  plan_key,
  plan_name,
  description,
  display_order,
  is_paid,
  is_trial_eligible
)
VALUES
  ('free_forever', 'Free Forever', 'Core features for small teams getting started.', 0, FALSE, FALSE),
  ('launch', 'Launch', 'Essential tools for growing teams.', 1, TRUE, FALSE),
  ('growth', 'Growth', 'Advanced capabilities for established teams.', 2, TRUE, TRUE),
  ('scale', 'Scale', 'Maximum limits, controls, and support.', 3, TRUE, FALSE)
ON CONFLICT (plan_key) DO UPDATE
SET plan_name = EXCLUDED.plan_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_paid = EXCLUDED.is_paid,
    is_trial_eligible = EXCLUDED.is_trial_eligible,
    is_active = TRUE,
    updated_at = NOW();

UPDATE public.plans child
SET parent_plan_id = parent.id,
    updated_at = NOW()
FROM public.plans parent
WHERE (child.plan_key, parent.plan_key) IN (
  ('launch', 'free_forever'),
  ('growth', 'launch'),
  ('scale', 'growth')
);

WITH price_seed(module_key, plan_key, monthly_price, annual_price, billing_unit) AS (
  VALUES
    ('sales', 'free_forever', 0.00::NUMERIC, 0.00::NUMERIC, 'free'),
    ('sales', 'launch', NULL::NUMERIC, NULL::NUMERIC, 'per_user_per_month'),
    ('sales', 'growth', 49.00::NUMERIC, 470.40::NUMERIC, 'per_user_per_month'),
    ('sales', 'scale', NULL::NUMERIC, NULL::NUMERIC, 'per_user_per_month'),
    ('service_cloud', 'free_forever', 0.00::NUMERIC, 0.00::NUMERIC, 'free'),
    ('service_cloud', 'launch', NULL::NUMERIC, NULL::NUMERIC, 'per_user_per_month'),
    ('service_cloud', 'growth', 49.00::NUMERIC, 470.40::NUMERIC, 'per_user_per_month'),
    ('service_cloud', 'scale', NULL::NUMERIC, NULL::NUMERIC, 'per_user_per_month')
)
INSERT INTO public.module_plan_prices (
  module_id,
  plan_id,
  monthly_price,
  annual_price,
  currency,
  billing_unit
)
SELECT sp.id,
       p.id,
       seed.monthly_price,
       seed.annual_price,
       'USD',
       seed.billing_unit
FROM price_seed seed
JOIN public.subscription_products sp ON sp.product_key = seed.module_key
JOIN public.plans p ON p.plan_key = seed.plan_key
ON CONFLICT (module_id, plan_id) DO UPDATE
SET monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    currency = EXCLUDED.currency,
    billing_unit = EXCLUDED.billing_unit,
    is_active = TRUE,
    updated_at = NOW();

WITH feature_seed(
  module_key,
  feature_key,
  feature_name,
  feature_category,
  data_type,
  usage_metric,
  description
) AS (
  VALUES
    ('sales', 'sales.leads', 'Leads', 'limits', 'numeric', 'records', 'Maximum active leads.'),
    ('sales', 'sales.contacts', 'Contacts', 'limits', 'numeric', 'records', 'Maximum active contacts.'),
    ('sales', 'sales.opportunities', 'Opportunities', 'limits', 'numeric', 'records', 'Maximum active opportunities.'),
    ('sales', 'sales.email_accounts', 'Email Accounts', 'integrations', 'numeric', 'connections', 'Connected email accounts.'),
    ('sales', 'sales.zoom_accounts', 'Zoom Accounts', 'integrations', 'numeric', 'connections', 'Connected Zoom accounts.'),
    ('sales', 'sales.meet_accounts', 'Google Meet Accounts', 'integrations', 'numeric', 'connections', 'Connected Google Meet accounts.'),
    ('sales', 'sales.website_forms', 'Website Forms', 'integrations', 'numeric', 'connections', 'Connected website forms.'),
    ('sales', 'sales.custom_fields', 'Custom Fields', 'customization', 'numeric', 'records', 'Custom fields available to the Sales workspace.'),
    ('sales', 'sales.currencies', 'Currencies', 'customization', 'numeric', 'records', 'Configured workspace currencies.'),
    ('sales', 'sales.docs_per_lead', 'Documents per Lead', 'limits', 'numeric', 'records', 'Documents attachable to each lead.'),
    ('sales', 'sales.notes_per_lead', 'Notes per Lead', 'limits', 'numeric', 'records', 'Notes attachable to each lead.'),
    ('sales', 'sales.email_integration', 'Email Integration', 'integrations', 'boolean', NULL, 'Email synchronization and sending.'),
    ('sales', 'sales.import_export', 'Import and Export', 'access', 'boolean', NULL, 'Bulk import and export tools.'),
    ('sales', 'sales.meta_ads', 'Meta Ads', 'integrations', 'boolean', NULL, 'Meta Ads lead integration.'),
    ('sales', 'sales.zapier', 'Zapier', 'integrations', 'boolean', NULL, 'Zapier automation integration.'),
    ('sales', 'sales.advanced_reports', 'Advanced Reports', 'reports', 'boolean', NULL, 'Advanced Sales reporting.'),
    ('sales', 'sales.audit_logs', 'Audit Logs', 'security', 'boolean', NULL, 'Detailed Sales audit history.'),
    ('sales', 'sales.priority_support', 'Priority Support', 'support', 'boolean', NULL, 'Priority support access.'),
    ('sales', 'sales.custom_onboarding', 'Custom Onboarding', 'support', 'boolean', NULL, 'Guided custom onboarding.'),
    ('sales', 'sales.role_customization', 'Role Customization', 'access', 'boolean', NULL, 'Customize workspace roles.'),
    ('sales', 'sales.advanced_roles', 'Advanced Roles', 'access', 'boolean', NULL, 'Advanced role and hierarchy controls.'),
    ('service_cloud', 'service.tickets', 'Tickets', 'limits', 'numeric', 'records', 'Maximum active support tickets.'),
    ('service_cloud', 'service.customers', 'Customers', 'limits', 'numeric', 'records', 'Maximum Service customers.'),
    ('service_cloud', 'service.email_accounts', 'Email Accounts', 'integrations', 'numeric', 'connections', 'Connected support email accounts.'),
    ('service_cloud', 'service.docs_per_ticket', 'Documents per Ticket', 'limits', 'numeric', 'records', 'Documents attachable to each ticket.'),
    ('service_cloud', 'service.notes_per_ticket', 'Notes per Ticket', 'limits', 'numeric', 'records', 'Notes attachable to each ticket.'),
    ('service_cloud', 'service.email_to_ticket', 'Email to Ticket', 'integrations', 'boolean', NULL, 'Create and update tickets by email.'),
    ('service_cloud', 'service.sla_basic', 'Basic SLA', 'access', 'boolean', NULL, 'Basic service-level agreements.'),
    ('service_cloud', 'service.sla_advanced', 'Advanced SLA', 'access', 'boolean', NULL, 'Advanced service-level agreements.'),
    ('service_cloud', 'service.advanced_reports', 'Advanced Reports', 'reports', 'boolean', NULL, 'Advanced Service reporting.'),
    ('service_cloud', 'service.audit_logs', 'Audit Logs', 'security', 'boolean', NULL, 'Detailed Service audit history.'),
    ('service_cloud', 'service.priority_support', 'Priority Support', 'support', 'boolean', NULL, 'Priority support access.'),
    ('service_cloud', 'service.custom_onboarding', 'Custom Onboarding', 'support', 'boolean', NULL, 'Guided custom onboarding.'),
    ('service_cloud', 'service.role_customization', 'Role Customization', 'access', 'boolean', NULL, 'Customize Service roles.'),
    ('service_cloud', 'service.advanced_roles', 'Advanced Roles', 'access', 'boolean', NULL, 'Advanced Service role controls.'),
    ('service_cloud', 'service.time_logs', 'Time Logs', 'access', 'boolean', NULL, 'Track time spent on tickets.')
)
INSERT INTO public.feature_catalog (
  module_id,
  feature_key,
  feature_name,
  feature_category,
  data_type,
  usage_metric,
  description
)
SELECT sp.id,
       seed.feature_key,
       seed.feature_name,
       seed.feature_category,
       seed.data_type,
       seed.usage_metric,
       seed.description
FROM feature_seed seed
JOIN public.subscription_products sp ON sp.product_key = seed.module_key
ON CONFLICT (feature_key) DO UPDATE
SET module_id = EXCLUDED.module_id,
    feature_name = EXCLUDED.feature_name,
    feature_category = EXCLUDED.feature_category,
    data_type = EXCLUDED.data_type,
    usage_metric = EXCLUDED.usage_metric,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();

-- Entitlement rows store only Free defaults and changes from each parent plan.
WITH entitlement_seed(
  module_key,
  plan_key,
  feature_key,
  is_enabled,
  limit_value
) AS (
  VALUES
    -- Free Forever: Sales defaults.
    ('sales', 'free_forever', 'sales.leads', TRUE, 250),
    ('sales', 'free_forever', 'sales.contacts', TRUE, 250),
    ('sales', 'free_forever', 'sales.opportunities', TRUE, 250),
    ('sales', 'free_forever', 'sales.email_accounts', TRUE, 0),
    ('sales', 'free_forever', 'sales.zoom_accounts', TRUE, 0),
    ('sales', 'free_forever', 'sales.meet_accounts', TRUE, 0),
    ('sales', 'free_forever', 'sales.website_forms', TRUE, 0),
    ('sales', 'free_forever', 'sales.custom_fields', TRUE, 5),
    ('sales', 'free_forever', 'sales.currencies', TRUE, 1),
    ('sales', 'free_forever', 'sales.docs_per_lead', TRUE, 0),
    ('sales', 'free_forever', 'sales.notes_per_lead', TRUE, NULL),
    ('sales', 'free_forever', 'sales.email_integration', FALSE, NULL),
    ('sales', 'free_forever', 'sales.import_export', FALSE, NULL),
    ('sales', 'free_forever', 'sales.meta_ads', FALSE, NULL),
    ('sales', 'free_forever', 'sales.zapier', FALSE, NULL),
    ('sales', 'free_forever', 'sales.advanced_reports', FALSE, NULL),
    ('sales', 'free_forever', 'sales.audit_logs', FALSE, NULL),
    ('sales', 'free_forever', 'sales.priority_support', FALSE, NULL),
    ('sales', 'free_forever', 'sales.custom_onboarding', FALSE, NULL),
    ('sales', 'free_forever', 'sales.role_customization', FALSE, NULL),
    ('sales', 'free_forever', 'sales.advanced_roles', FALSE, NULL),

    -- Free Forever: Service defaults.
    ('service_cloud', 'free_forever', 'service.tickets', TRUE, 250),
    ('service_cloud', 'free_forever', 'service.customers', TRUE, 500),
    ('service_cloud', 'free_forever', 'service.email_accounts', TRUE, 1),
    ('service_cloud', 'free_forever', 'service.docs_per_ticket', TRUE, 0),
    ('service_cloud', 'free_forever', 'service.notes_per_ticket', TRUE, 0),
    ('service_cloud', 'free_forever', 'service.email_to_ticket', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.sla_basic', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.sla_advanced', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.advanced_reports', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.audit_logs', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.priority_support', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.custom_onboarding', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.role_customization', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.advanced_roles', FALSE, NULL),
    ('service_cloud', 'free_forever', 'service.time_logs', FALSE, NULL),

    -- Launch overrides.
    ('sales', 'launch', 'sales.leads', TRUE, 1000),
    ('sales', 'launch', 'sales.contacts', TRUE, 1000),
    ('sales', 'launch', 'sales.opportunities', TRUE, 1000),
    ('sales', 'launch', 'sales.email_accounts', TRUE, 2),
    ('sales', 'launch', 'sales.website_forms', TRUE, 2),
    ('sales', 'launch', 'sales.custom_fields', TRUE, 20),
    ('sales', 'launch', 'sales.currencies', TRUE, 3),
    ('sales', 'launch', 'sales.docs_per_lead', TRUE, 5),
    ('sales', 'launch', 'sales.notes_per_lead', TRUE, 25),
    ('sales', 'launch', 'sales.email_integration', TRUE, NULL),
    ('sales', 'launch', 'sales.import_export', TRUE, NULL),
    ('sales', 'launch', 'sales.role_customization', TRUE, NULL),
    ('service_cloud', 'launch', 'service.tickets', TRUE, 5000),
    ('service_cloud', 'launch', 'service.customers', TRUE, 10000),
    ('service_cloud', 'launch', 'service.email_accounts', TRUE, 3),
    ('service_cloud', 'launch', 'service.docs_per_ticket', TRUE, 5),
    ('service_cloud', 'launch', 'service.notes_per_ticket', TRUE, 25),
    ('service_cloud', 'launch', 'service.email_to_ticket', TRUE, NULL),
    ('service_cloud', 'launch', 'service.sla_basic', TRUE, NULL),
    ('service_cloud', 'launch', 'service.role_customization', TRUE, NULL),
    ('service_cloud', 'launch', 'service.time_logs', TRUE, NULL),

    -- Growth overrides.
    ('sales', 'growth', 'sales.leads', TRUE, 5000),
    ('sales', 'growth', 'sales.contacts', TRUE, 5000),
    ('sales', 'growth', 'sales.opportunities', TRUE, 5000),
    ('sales', 'growth', 'sales.email_accounts', TRUE, 5),
    ('sales', 'growth', 'sales.zoom_accounts', TRUE, 2),
    ('sales', 'growth', 'sales.meet_accounts', TRUE, 2),
    ('sales', 'growth', 'sales.website_forms', TRUE, 5),
    ('sales', 'growth', 'sales.custom_fields', TRUE, 100),
    ('sales', 'growth', 'sales.currencies', TRUE, 5),
    ('sales', 'growth', 'sales.docs_per_lead', TRUE, 10),
    ('sales', 'growth', 'sales.notes_per_lead', TRUE, 100),
    ('sales', 'growth', 'sales.meta_ads', TRUE, NULL),
    ('sales', 'growth', 'sales.advanced_reports', TRUE, NULL),
    ('sales', 'growth', 'sales.priority_support', TRUE, NULL),
    ('service_cloud', 'growth', 'service.tickets', TRUE, 50000),
    ('service_cloud', 'growth', 'service.customers', TRUE, 100000),
    ('service_cloud', 'growth', 'service.email_accounts', TRUE, 5),
    ('service_cloud', 'growth', 'service.docs_per_ticket', TRUE, 10),
    ('service_cloud', 'growth', 'service.notes_per_ticket', TRUE, 100),
    ('service_cloud', 'growth', 'service.sla_advanced', TRUE, NULL),
    ('service_cloud', 'growth', 'service.advanced_reports', TRUE, NULL),
    ('service_cloud', 'growth', 'service.priority_support', TRUE, NULL),

    -- Scale overrides.
    ('sales', 'scale', 'sales.leads', TRUE, NULL),
    ('sales', 'scale', 'sales.contacts', TRUE, NULL),
    ('sales', 'scale', 'sales.opportunities', TRUE, NULL),
    ('sales', 'scale', 'sales.email_accounts', TRUE, 10),
    ('sales', 'scale', 'sales.zoom_accounts', TRUE, 5),
    ('sales', 'scale', 'sales.meet_accounts', TRUE, 5),
    ('sales', 'scale', 'sales.website_forms', TRUE, 10),
    ('sales', 'scale', 'sales.custom_fields', TRUE, NULL),
    ('sales', 'scale', 'sales.currencies', TRUE, 10),
    ('sales', 'scale', 'sales.docs_per_lead', TRUE, 50),
    ('sales', 'scale', 'sales.notes_per_lead', TRUE, NULL),
    ('sales', 'scale', 'sales.zapier', TRUE, NULL),
    ('sales', 'scale', 'sales.audit_logs', TRUE, NULL),
    ('sales', 'scale', 'sales.custom_onboarding', TRUE, NULL),
    ('sales', 'scale', 'sales.advanced_roles', TRUE, NULL),
    ('service_cloud', 'scale', 'service.tickets', TRUE, NULL),
    ('service_cloud', 'scale', 'service.customers', TRUE, NULL),
    ('service_cloud', 'scale', 'service.email_accounts', TRUE, 10),
    ('service_cloud', 'scale', 'service.docs_per_ticket', TRUE, 25),
    ('service_cloud', 'scale', 'service.notes_per_ticket', TRUE, 250),
    ('service_cloud', 'scale', 'service.audit_logs', TRUE, NULL),
    ('service_cloud', 'scale', 'service.custom_onboarding', TRUE, NULL),
    ('service_cloud', 'scale', 'service.advanced_roles', TRUE, NULL)
)
INSERT INTO public.plan_entitlements (
  module_id,
  plan_id,
  feature_id,
  is_enabled,
  limit_value,
  limit_type
)
SELECT sp.id,
       p.id,
       fc.id,
       seed.is_enabled,
       seed.limit_value,
       fc.data_type
FROM entitlement_seed seed
JOIN public.subscription_products sp ON sp.product_key = seed.module_key
JOIN public.plans p ON p.plan_key = seed.plan_key
JOIN public.feature_catalog fc
  ON fc.feature_key = seed.feature_key
 AND fc.module_id = sp.id
ON CONFLICT (module_id, plan_id, feature_id) DO UPDATE
SET is_enabled = EXCLUDED.is_enabled,
    limit_value = EXCLUDED.limit_value,
    limit_type = EXCLUDED.limit_type,
    enum_value = NULL,
    updated_at = NOW();

WITH bundle_seed(bundle_key, bundle_name, description, plan_key, monthly_price, annual_price) AS (
  VALUES
    (
      'sales_service_launch_bundle',
      'Sales + Service Launch',
      'Launch plan for Sales CRM and Service Cloud.',
      'launch',
      NULL::NUMERIC,
      NULL::NUMERIC
    ),
    (
      'sales_service_growth_bundle',
      'Sales + Service Growth',
      'Growth plan for Sales CRM and Service Cloud.',
      'growth',
      79.00::NUMERIC,
      758.40::NUMERIC
    ),
    (
      'sales_service_scale_bundle',
      'Sales + Service Scale',
      'Scale plan for Sales CRM and Service Cloud.',
      'scale',
      NULL::NUMERIC,
      NULL::NUMERIC
    )
)
INSERT INTO public.bundles (
  bundle_key,
  bundle_name,
  description,
  plan_id,
  monthly_price,
  annual_price,
  currency
)
SELECT seed.bundle_key,
       seed.bundle_name,
       seed.description,
       p.id,
       seed.monthly_price,
       seed.annual_price,
       'USD'
FROM bundle_seed seed
JOIN public.plans p ON p.plan_key = seed.plan_key
ON CONFLICT (bundle_key) DO UPDATE
SET bundle_name = EXCLUDED.bundle_name,
    description = EXCLUDED.description,
    plan_id = EXCLUDED.plan_id,
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    currency = EXCLUDED.currency,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.bundle_modules (bundle_id, module_id)
SELECT b.id, sp.id
FROM public.bundles b
CROSS JOIN public.subscription_products sp
WHERE b.bundle_key IN (
    'sales_service_launch_bundle',
    'sales_service_growth_bundle',
    'sales_service_scale_bundle'
  )
  AND sp.product_key IN ('sales', 'service_cloud')
ON CONFLICT (bundle_id, module_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subscription RBAC seeds
-- ---------------------------------------------------------------------------

INSERT INTO public.crm_modules (
  module_key,
  module_name,
  description,
  icon,
  display_order,
  is_system,
  is_active,
  product_key
)
VALUES (
  'subscription',
  'Subscription',
  'View and manage workspace plans, usage, module users, and billing.',
  'CreditCard',
  11,
  TRUE,
  TRUE,
  'common'
)
ON CONFLICT (module_key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    is_system = TRUE,
    is_active = TRUE,
    product_key = 'common';

WITH feature_seed(feature_key, feature_name, description, feature_type, display_order) AS (
  VALUES
    ('view', 'View Subscription', 'View plans, usage, trials, and pending changes.', 'view', 1),
    ('manage', 'Manage Subscription Users', 'Assign and remove users from subscribed modules.', 'action', 2),
    ('billing', 'Manage Billing', 'Purchase, change, or cancel plans and access invoices.', 'action', 3)
)
INSERT INTO public.crm_module_features (
  module_id,
  feature_key,
  feature_name,
  description,
  feature_type,
  display_order,
  is_system,
  is_active
)
SELECT module.id,
       seed.feature_key,
       seed.feature_name,
       seed.description,
       seed.feature_type::public.crm_feature_type,
       seed.display_order,
       TRUE,
       TRUE
FROM public.crm_modules module
CROSS JOIN feature_seed seed
WHERE module.module_key = 'subscription'
ON CONFLICT (module_id, feature_key) DO UPDATE
SET feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    display_order = EXCLUDED.display_order,
    is_system = TRUE,
    is_active = TRUE;

INSERT INTO public.product_module_map (product_id, crm_module_id, access_mode)
SELECT product.id, module.id, 'full'
FROM public.subscription_products product
CROSS JOIN public.crm_modules module
WHERE product.is_active
  AND module.module_key = 'subscription'
ON CONFLICT (product_id, crm_module_id) DO NOTHING;

INSERT INTO public.role_permissions (
  workspace_id,
  role_id,
  module_feature_id,
  can_access,
  access_level,
  can_view_sensitive_data,
  can_override_owner
)
SELECT role.workspace_id,
       role.id,
       feature.id,
       CASE
         WHEN feature.feature_key = 'view' THEN TRUE
         WHEN role.role_key = 'admin' THEN TRUE
         ELSE FALSE
       END,
       CASE
         WHEN feature.feature_key = 'view' THEN 'own'::public.permission_access_level
         WHEN role.role_key = 'admin' THEN 'all'::public.permission_access_level
         ELSE 'none'::public.permission_access_level
       END,
       role.role_key = 'admin',
       role.role_key = 'admin'
FROM public.workspace_roles role
CROSS JOIN public.crm_modules module
JOIN public.crm_module_features feature ON feature.module_id = module.id
WHERE module.module_key = 'subscription'
  AND feature.feature_key IN ('view', 'manage', 'billing')
ON CONFLICT (role_id, module_feature_id) DO UPDATE
SET can_access = EXCLUDED.can_access,
    access_level = EXCLUDED.access_level,
    can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
    can_override_owner = EXCLUDED.can_override_owner,
    updated_at = NOW();

COMMIT;
