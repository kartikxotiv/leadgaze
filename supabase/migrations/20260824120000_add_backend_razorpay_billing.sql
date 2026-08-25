/*
 * Backend-owned billing with Razorpay as a payment collection provider only.
 *
 * This migration is intentionally additive. It does not alter the contents of
 * any previous migration file and it does not create Razorpay subscriptions or
 * plans. Prices, discounts, periods, seat changes, and expiry remain owned by
 * the Leadgaze database.
 */

BEGIN;

CREATE TABLE public.billing_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  discount_type VARCHAR(20) NOT NULL
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  currency CHAR(3) CHECK (currency IS NULL OR currency = UPPER(currency)),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  maximum_redemptions INTEGER CHECK (maximum_redemptions IS NULL OR maximum_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_discounts_period_check CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  ),
  CONSTRAINT billing_discounts_value_check CHECK (
    discount_type <> 'percentage' OR discount_value <= 100
  )
);

CREATE TABLE public.workspace_billing_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES public.billing_discounts(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.subscription_products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  maximum_uses INTEGER CHECK (maximum_uses IS NULL OR maximum_uses > 0),
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_billing_discounts_period_check CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  ),
  CONSTRAINT workspace_billing_discounts_unique
    UNIQUE (workspace_id, discount_id, module_id, plan_id)
);

CREATE TABLE public.backend_billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(60) NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
  workspace_module_subscription_id UUID,
  purpose VARCHAR(30) NOT NULL CHECK (
    purpose IN (
      'initial_purchase', 'plan_upgrade', 'module_add', 'seat_increase',
      'renewal', 'manual_adjustment'
    )
  ),
  status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'issued', 'paid', 'expired', 'cancelled', 'failed')
  ),
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  seats_before INTEGER NOT NULL DEFAULT 0 CHECK (seats_before >= 0),
  seats_after INTEGER NOT NULL CHECK (seats_after >= 1),
  currency CHAR(3) NOT NULL CHECK (currency = UPPER(currency)),
  unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor >= 0),
  subtotal_amount_minor BIGINT NOT NULL CHECK (subtotal_amount_minor >= 0),
  discount_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
  tax_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
  total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor >= 0),
  discount_id UUID REFERENCES public.billing_discounts(id) ON DELETE SET NULL,
  workspace_discount_id UUID REFERENCES public.workspace_billing_discounts(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  razorpay_invoice_id VARCHAR(255) UNIQUE,
  razorpay_payment_id VARCHAR(255),
  payment_url TEXT,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT backend_billing_invoices_module_subscription_fkey
    FOREIGN KEY (workspace_module_subscription_id, workspace_id)
    REFERENCES public.workspace_module_subscriptions(id, workspace_id) ON DELETE SET NULL,
  CONSTRAINT backend_billing_invoices_amount_check CHECK (
    subtotal_amount_minor - discount_amount_minor + tax_amount_minor = total_amount_minor
  ),
  CONSTRAINT backend_billing_invoices_period_check CHECK (
    period_end IS NULL OR (period_start IS NOT NULL AND period_end > period_start)
  ),
  CONSTRAINT backend_billing_invoices_paid_shape_check CHECK (
    (status = 'paid' AND paid_at IS NOT NULL) OR status <> 'paid'
  )
);

CREATE TABLE public.backend_billing_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.backend_billing_invoices(id) ON DELETE CASCADE,
  item_type VARCHAR(24) NOT NULL CHECK (
    item_type IN ('plan_seats', 'seat_increase', 'renewal', 'discount', 'tax', 'adjustment')
  ),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount_minor BIGINT NOT NULL,
  total_amount_minor BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.backend_seat_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE RESTRICT,
  seat_id UUID REFERENCES public.workspace_module_seats(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.backend_billing_invoices(id) ON DELETE SET NULL,
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('increase', 'decrease')),
  seats_before INTEGER NOT NULL CHECK (seats_before >= 0),
  seats_after INTEGER NOT NULL CHECK (seats_after >= 1),
  status VARCHAR(24) NOT NULL CHECK (
    status IN ('awaiting_payment', 'scheduled', 'applied', 'cancelled', 'failed')
  ),
  effective_at TIMESTAMPTZ NOT NULL,
  applied_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  processing_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT backend_seat_changes_direction_check CHECK (
    (change_type = 'increase' AND seats_after > seats_before)
    OR (change_type = 'decrease' AND seats_after < seats_before)
  ),
  CONSTRAINT backend_seat_changes_status_dates_check CHECK (
    (status = 'applied' AND applied_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND applied_at IS NULL)
    OR (status IN ('awaiting_payment', 'scheduled', 'failed') AND applied_at IS NULL AND cancelled_at IS NULL)
  )
);

CREATE INDEX backend_billing_invoices_workspace_created_idx
  ON public.backend_billing_invoices(workspace_id, created_at DESC);
CREATE INDEX backend_billing_invoices_due_idx
  ON public.backend_billing_invoices(due_at)
  WHERE status IN ('draft', 'issued');
CREATE INDEX backend_billing_invoices_razorpay_idx
  ON public.backend_billing_invoices(razorpay_invoice_id)
  WHERE razorpay_invoice_id IS NOT NULL;
CREATE INDEX backend_seat_changes_due_idx
  ON public.backend_seat_changes(effective_at)
  WHERE status = 'scheduled';
CREATE UNIQUE INDEX backend_seat_changes_one_open_idx
  ON public.backend_seat_changes(workspace_id, module_id)
  WHERE status IN ('awaiting_payment', 'scheduled');
CREATE INDEX workspace_billing_discounts_lookup_idx
  ON public.workspace_billing_discounts(workspace_id, module_id, plan_id)
  WHERE is_active;

CREATE TRIGGER billing_discounts_updated_at
BEFORE UPDATE ON public.billing_discounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER workspace_billing_discounts_updated_at
BEFORE UPDATE ON public.workspace_billing_discounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER backend_billing_invoices_updated_at
BEFORE UPDATE ON public.backend_billing_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER backend_seat_changes_updated_at
BEFORE UPDATE ON public.backend_seat_changes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.billing_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_billing_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backend_billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backend_billing_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backend_seat_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY backend_billing_invoices_member_read
ON public.backend_billing_invoices FOR SELECT TO authenticated
USING (public.current_user_can_view_workspace_subscription(workspace_id));

CREATE POLICY backend_billing_invoice_items_member_read
ON public.backend_billing_invoice_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.backend_billing_invoices invoice
    WHERE invoice.id = invoice_id
      AND public.current_user_can_view_workspace_subscription(invoice.workspace_id)
  )
);

CREATE POLICY backend_seat_changes_member_read
ON public.backend_seat_changes FOR SELECT TO authenticated
USING (public.current_user_can_view_workspace_subscription(workspace_id));

GRANT SELECT ON public.backend_billing_invoices,
  public.backend_billing_invoice_items,
  public.backend_seat_changes TO authenticated;

GRANT ALL ON public.billing_discounts,
  public.workspace_billing_discounts,
  public.backend_billing_invoices,
  public.backend_billing_invoice_items,
  public.backend_seat_changes TO service_role;

CREATE OR REPLACE FUNCTION public.apply_paid_backend_invoice(
  p_invoice_id UUID,
  p_provider_payment_id TEXT,
  p_paid_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  invoice_record public.backend_billing_invoices%ROWTYPE;
  workspace_subscription_record public.workspace_subscriptions%ROWTYPE;
  module_price_record public.module_plan_prices%ROWTYPE;
  existing_seat_id UUID;
  module_subscription_id UUID;
  previous_plan_id UUID;
  period_end_value TIMESTAMPTZ;
BEGIN
  SELECT * INTO invoice_record
  FROM public.backend_billing_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backend billing invoice % was not found', p_invoice_id;
  END IF;

  IF invoice_record.status = 'paid' THEN
    RETURN FALSE;
  END IF;

  IF invoice_record.status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'Backend billing invoice % cannot be paid from status %',
      p_invoice_id, invoice_record.status;
  END IF;

  UPDATE public.backend_billing_invoices
  SET status = 'paid',
      paid_at = p_paid_at,
      razorpay_payment_id = COALESCE(p_provider_payment_id, razorpay_payment_id),
      updated_at = NOW()
  WHERE id = p_invoice_id;

  IF invoice_record.discount_id IS NOT NULL THEN
    UPDATE public.billing_discounts
    SET redemption_count = redemption_count + 1,
        updated_at = NOW()
    WHERE id = invoice_record.discount_id;

    UPDATE public.workspace_billing_discounts
    SET use_count = use_count + 1,
        updated_at = NOW()
    WHERE id = invoice_record.workspace_discount_id;
  END IF;

  period_end_value := COALESCE(
    invoice_record.period_end,
    CASE invoice_record.billing_cycle
      WHEN 'yearly' THEN p_paid_at + INTERVAL '1 year'
      ELSE p_paid_at + INTERVAL '1 month'
    END
  );

  SELECT * INTO workspace_subscription_record
  FROM public.workspace_subscriptions
  WHERE workspace_id = invoice_record.workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace % has no explicit subscription', invoice_record.workspace_id;
  END IF;

  IF invoice_record.purpose IN ('initial_purchase', 'plan_upgrade', 'module_add') THEN
    IF invoice_record.module_id IS NULL OR invoice_record.plan_id IS NULL THEN
      RAISE EXCEPTION 'Invoice % is missing module or plan', p_invoice_id;
    END IF;

    SELECT * INTO module_price_record
    FROM public.module_plan_prices
    WHERE module_id = invoice_record.module_id
      AND plan_id = invoice_record.plan_id
      AND is_active;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice % points to an inactive module price', p_invoice_id;
    END IF;

    SELECT id, plan_id INTO module_subscription_id, previous_plan_id
    FROM public.workspace_module_subscriptions
    WHERE workspace_id = invoice_record.workspace_id
      AND module_id = invoice_record.module_id;

    INSERT INTO public.workspace_module_subscriptions (
      workspace_subscription_id, workspace_id, module_id, plan_id, status,
      monthly_amount, annual_amount, started_at, cancelled_at
    ) VALUES (
      workspace_subscription_record.id,
      invoice_record.workspace_id,
      invoice_record.module_id,
      invoice_record.plan_id,
      'active',
      module_price_record.monthly_price,
      module_price_record.annual_price,
      p_paid_at,
      NULL
    )
    ON CONFLICT (workspace_id, module_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        monthly_amount = EXCLUDED.monthly_amount,
        annual_amount = EXCLUDED.annual_amount,
        cancelled_at = NULL,
        updated_at = NOW()
    RETURNING id INTO module_subscription_id;

    UPDATE public.subscription_changes
    SET status = 'cancelled',
        cancelled_at = p_paid_at,
        updated_at = NOW()
    WHERE workspace_module_subscription_id = module_subscription_id
      AND status = 'pending';

    INSERT INTO public.subscription_changes (
      workspace_module_subscription_id, workspace_id, change_type,
      from_plan_id, to_plan_id, effective_at, status, created_by, applied_at,
      notes
    ) VALUES (
      module_subscription_id,
      invoice_record.workspace_id,
      CASE invoice_record.purpose
        WHEN 'module_add' THEN 'module_add'
        ELSE 'plan_upgrade'
      END,
      previous_plan_id,
      invoice_record.plan_id,
      p_paid_at,
      'applied',
      invoice_record.created_by,
      p_paid_at,
      'Applied after backend invoice ' || invoice_record.invoice_number || ' was paid'
    );
  END IF;

  IF invoice_record.module_id IS NOT NULL
     AND invoice_record.purpose IN (
       'initial_purchase', 'plan_upgrade', 'module_add', 'seat_increase', 'renewal'
     ) THEN
    SELECT id INTO existing_seat_id
    FROM public.workspace_module_seats
    WHERE workspace_id = invoice_record.workspace_id
      AND product_id = invoice_record.module_id
    FOR UPDATE;

    IF existing_seat_id IS NULL THEN
      INSERT INTO public.workspace_module_seats (
        workspace_id, product_id, seats_purchased, status, billing_cycle,
        current_period_start, current_period_end, payment_provider,
        provider_metadata, created_by, updated_by
      ) VALUES (
        invoice_record.workspace_id,
        invoice_record.module_id,
        invoice_record.seats_after,
        'active',
        invoice_record.billing_cycle,
        COALESCE(invoice_record.period_start, p_paid_at),
        period_end_value,
        'razorpay',
        jsonb_build_object('last_backend_invoice_id', invoice_record.id),
        invoice_record.created_by,
        invoice_record.created_by
      )
      RETURNING id INTO existing_seat_id;
    ELSIF invoice_record.purpose = 'seat_increase' THEN
      UPDATE public.workspace_module_seats
      SET seats_purchased = invoice_record.seats_after,
          status = 'active',
          payment_provider = 'razorpay',
          provider_customer_id = NULL,
          provider_subscription_id = NULL,
          provider_metadata = COALESCE(provider_metadata, '{}'::JSONB)
            || jsonb_build_object('last_backend_invoice_id', invoice_record.id),
          updated_by = invoice_record.created_by,
          updated_at = NOW()
      WHERE id = existing_seat_id;
    ELSE
      UPDATE public.workspace_module_seats
      SET seats_purchased = invoice_record.seats_after,
          status = 'active',
          billing_cycle = invoice_record.billing_cycle,
          current_period_start = COALESCE(invoice_record.period_start, p_paid_at),
          current_period_end = period_end_value,
          payment_provider = 'razorpay',
          provider_customer_id = NULL,
          provider_subscription_id = NULL,
          provider_metadata = COALESCE(provider_metadata, '{}'::JSONB)
            || jsonb_build_object('last_backend_invoice_id', invoice_record.id),
          updated_by = invoice_record.created_by,
          updated_at = NOW()
      WHERE id = existing_seat_id;
    END IF;
  END IF;

  UPDATE public.backend_seat_changes
  SET status = 'applied',
      seat_id = COALESCE(seat_id, existing_seat_id),
      applied_at = p_paid_at,
      processing_error = NULL,
      updated_at = NOW()
  WHERE invoice_id = p_invoice_id
    AND status = 'awaiting_payment';

  IF invoice_record.purpose = 'seat_increase' THEN
    UPDATE public.workspace_subscriptions
    SET subscription_status = 'active', updated_at = NOW()
    WHERE id = workspace_subscription_record.id;
  ELSE
    UPDATE public.workspace_subscriptions
    SET subscription_status = 'active',
        billing_cycle = invoice_record.billing_cycle,
        current_period_start = COALESCE(invoice_record.period_start, p_paid_at),
        current_period_end = period_end_value,
        updated_at = NOW()
    WHERE id = workspace_subscription_record.id;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_due_backend_seat_changes(
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (change_id UUID, workspace_id UUID, module_id UUID, seats_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  change_record public.backend_seat_changes%ROWTYPE;
BEGIN
  FOR change_record IN
    SELECT *
    FROM public.backend_seat_changes change
    WHERE change.status = 'scheduled'
      AND change.effective_at <= p_now
    ORDER BY change.effective_at, change.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.workspace_module_seats
    SET seats_purchased = change_record.seats_after,
        updated_by = change_record.created_by,
        updated_at = NOW()
    WHERE id = change_record.seat_id;

    UPDATE public.backend_seat_changes
    SET status = 'applied',
        applied_at = p_now,
        processing_error = NULL,
        updated_at = NOW()
    WHERE id = change_record.id;

    change_id := change_record.id;
    workspace_id := change_record.workspace_id;
    module_id := change_record.module_id;
    seats_after := change_record.seats_after;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_due_backend_invoices(
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (invoice_id UUID, workspace_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE public.backend_billing_invoices invoice
    SET status = 'expired', updated_at = NOW()
    WHERE invoice.status IN ('draft', 'issued')
      AND invoice.due_at < p_now
    RETURNING invoice.id, invoice.workspace_id
  ), failed_changes AS (
    UPDATE public.backend_seat_changes change
    SET status = 'failed',
        processing_error = 'Payment invoice expired',
        updated_at = NOW()
    WHERE change.invoice_id IN (SELECT expired.id FROM expired)
      AND change.status = 'awaiting_payment'
    RETURNING change.id
  )
  SELECT expired.id, expired.workspace_id FROM expired;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_backend_module_user(
  p_workspace_id UUID,
  p_module_id UUID,
  p_user_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  seat_record public.workspace_module_seats%ROWTYPE;
  entitlement_record public.module_entitlements%ROWTYPE;
  active_count INTEGER;
  allowed_seats INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'The user is not an accepted workspace member';
  END IF;

  SELECT * INTO entitlement_record
  FROM public.module_entitlements
  WHERE workspace_id = p_workspace_id
    AND product_id = p_module_id
    AND is_active
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until > NOW())
  FOR UPDATE;

  SELECT * INTO seat_record
  FROM public.workspace_module_seats
  WHERE workspace_id = p_workspace_id
    AND product_id = p_module_id
    AND status IN ('active', 'trialing')
  FOR UPDATE;

  IF entitlement_record.id IS NULL AND seat_record.id IS NULL THEN
    RAISE EXCEPTION 'No active seat allocation exists for this module';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_module_users
    WHERE workspace_id = p_workspace_id
      AND module_id = p_module_id
      AND user_id = p_user_id
      AND status = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*)::INTEGER INTO active_count
  FROM public.workspace_module_users
  WHERE workspace_id = p_workspace_id
    AND module_id = p_module_id
    AND status = 'active';

  allowed_seats := CASE
    WHEN entitlement_record.id IS NOT NULL THEN entitlement_record.granted_seats
    ELSE seat_record.seats_purchased
  END;

  IF allowed_seats IS NOT NULL AND active_count >= allowed_seats THEN
    RAISE EXCEPTION 'All % module seats are assigned', allowed_seats;
  END IF;

  INSERT INTO public.workspace_module_users (
    workspace_id, module_id, user_id, status, assigned_by, assigned_at,
    removed_at
  ) VALUES (
    p_workspace_id, p_module_id, p_user_id, 'active', p_actor_id, NOW(), NULL
  )
  ON CONFLICT (workspace_id, user_id, module_id) DO UPDATE
  SET status = 'active',
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = NOW(),
      removed_at = NULL,
      updated_at = NOW();

  IF seat_record.id IS NOT NULL THEN
    INSERT INTO public.seat_assignments (
      seat_id, workspace_id, user_id, product_id, is_active, assigned_at,
      assigned_by, revoked_at, revoked_by
    ) VALUES (
      seat_record.id, p_workspace_id, p_user_id, p_module_id, TRUE, NOW(),
      p_actor_id, NULL, NULL
    )
    ON CONFLICT (workspace_id, user_id, product_id) DO UPDATE
    SET seat_id = EXCLUDED.seat_id,
        is_active = TRUE,
        assigned_at = NOW(),
        assigned_by = EXCLUDED.assigned_by,
        revoked_at = NULL,
        revoked_by = NULL,
        updated_at = NOW();
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_legacy_seat_assignment_to_module_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.workspace_module_users
    SET status = 'removed',
        removed_at = NOW(),
        updated_at = NOW()
    WHERE workspace_id = OLD.workspace_id
      AND module_id = OLD.product_id
      AND user_id = OLD.user_id;
    RETURN OLD;
  ELSIF NOT NEW.is_active THEN
    UPDATE public.workspace_module_users
    SET status = 'removed',
        removed_at = COALESCE(NEW.revoked_at, NOW()),
        updated_at = NOW()
    WHERE workspace_id = NEW.workspace_id
      AND module_id = NEW.product_id
      AND user_id = NEW.user_id;
  ELSE
    INSERT INTO public.workspace_module_users (
      workspace_id, module_id, user_id, status, assigned_by, assigned_at,
      removed_at
    ) VALUES (
      NEW.workspace_id, NEW.product_id, NEW.user_id, 'active', NEW.assigned_by,
      NEW.assigned_at, NULL
    )
    ON CONFLICT (workspace_id, user_id, module_id) DO UPDATE
    SET status = 'active',
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = EXCLUDED.assigned_at,
        removed_at = NULL,
        updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_legacy_seat_assignment_to_module_user
AFTER INSERT OR UPDATE OF is_active, seat_id OR DELETE
ON public.seat_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_seat_assignment_to_module_user();

REVOKE ALL ON FUNCTION public.apply_paid_backend_invoice(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_due_backend_seat_changes(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_due_backend_invoices(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_backend_module_user(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_legacy_seat_assignment_to_module_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.apply_paid_backend_invoice(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_due_backend_seat_changes(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_due_backend_invoices(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_backend_module_user(UUID, UUID, UUID, UUID) TO service_role;

COMMENT ON TABLE public.backend_billing_invoices IS
  'Leadgaze-owned invoice ledger. Razorpay IDs and payment URLs are collection references only.';
COMMENT ON TABLE public.backend_seat_changes IS
  'Paid seat increases and period-end seat reductions. Seat reductions never call Razorpay.';
COMMENT ON TABLE public.billing_discounts IS
  'Backend-managed discounts. Razorpay receives only the already-discounted invoice total.';

COMMIT;
