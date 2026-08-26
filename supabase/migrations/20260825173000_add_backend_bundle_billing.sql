/*
 * Backend-owned Sales + Service bundle billing.
 *
 * This migration is additive: previous migrations remain unchanged. Razorpay
 * still only collects payment; bundle eligibility, prices, periods, seats,
 * discounts, and activation are controlled by the Leadgaze database.
 */

BEGIN;

ALTER TABLE public.backend_billing_invoices
  ADD COLUMN bundle_id UUID REFERENCES public.bundles(id) ON DELETE RESTRICT;

ALTER TABLE public.backend_seat_changes
  ADD COLUMN change_group_id UUID;

ALTER TABLE public.backend_billing_invoices
  DROP CONSTRAINT IF EXISTS backend_billing_invoices_purpose_check;

ALTER TABLE public.backend_billing_invoices
  ADD CONSTRAINT backend_billing_invoices_purpose_check CHECK (
    purpose IN (
      'initial_purchase', 'plan_upgrade', 'module_add', 'seat_increase',
      'renewal', 'manual_adjustment', 'bundle_purchase', 'bundle_upgrade',
      'bundle_seat_increase', 'bundle_renewal'
    )
  );

ALTER TABLE public.backend_billing_invoice_items
  DROP CONSTRAINT IF EXISTS backend_billing_invoice_items_item_type_check;

ALTER TABLE public.backend_billing_invoice_items
  ADD CONSTRAINT backend_billing_invoice_items_item_type_check CHECK (
    item_type IN (
      'plan_seats', 'seat_increase', 'renewal', 'discount', 'tax',
      'adjustment', 'bundle_seats', 'bundle_seat_increase', 'bundle_renewal'
    )
  );

ALTER TABLE public.backend_billing_invoices
  ADD CONSTRAINT backend_billing_invoices_bundle_shape_check CHECK (
    bundle_id IS NULL OR module_id IS NULL
  );

CREATE INDEX backend_billing_invoices_bundle_idx
  ON public.backend_billing_invoices(workspace_id, bundle_id, created_at DESC)
  WHERE bundle_id IS NOT NULL;

CREATE INDEX backend_seat_changes_group_idx
  ON public.backend_seat_changes(change_group_id)
  WHERE change_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_paid_backend_bundle_invoice(
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
  bundle_record public.bundles%ROWTYPE;
  module_record RECORD;
  existing_seat_id UUID;
  module_subscription_id UUID;
  previous_plan_id UUID;
  period_end_value TIMESTAMPTZ;
  module_count INTEGER;
  required_module_count INTEGER;
BEGIN
  SELECT * INTO invoice_record
  FROM public.backend_billing_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backend billing invoice % was not found', p_invoice_id;
  END IF;

  IF invoice_record.bundle_id IS NULL OR invoice_record.plan_id IS NULL THEN
    RAISE EXCEPTION 'Invoice % is not a bundle invoice', p_invoice_id;
  END IF;

  IF invoice_record.status = 'paid' THEN
    RETURN FALSE;
  END IF;

  IF invoice_record.status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'Backend billing invoice % cannot be paid from status %',
      p_invoice_id, invoice_record.status;
  END IF;

  SELECT * INTO bundle_record
  FROM public.bundles
  WHERE id = invoice_record.bundle_id
    AND plan_id = invoice_record.plan_id
    AND is_active
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % points to an inactive or mismatched bundle', p_invoice_id;
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (
           WHERE product.product_key IN ('sales', 'service_cloud')
             AND product.is_active
         )
    INTO module_count, required_module_count
  FROM public.bundle_modules mapping
  JOIN public.subscription_products product ON product.id = mapping.module_id
  WHERE mapping.bundle_id = invoice_record.bundle_id;

  IF module_count <> 2 OR required_module_count <> 2 THEN
    RAISE EXCEPTION 'Bundle % must contain exactly active Sales and Service modules',
      invoice_record.bundle_id;
  END IF;

  SELECT * INTO workspace_subscription_record
  FROM public.workspace_subscriptions
  WHERE workspace_id = invoice_record.workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace % has no explicit subscription', invoice_record.workspace_id;
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

  FOR module_record IN
    SELECT product.id, product.product_key
    FROM public.bundle_modules mapping
    JOIN public.subscription_products product ON product.id = mapping.module_id
    WHERE mapping.bundle_id = invoice_record.bundle_id
      AND product.is_active
    ORDER BY product.product_key
  LOOP
    SELECT subscription.id, subscription.plan_id
      INTO module_subscription_id, previous_plan_id
    FROM public.workspace_module_subscriptions subscription
    WHERE subscription.workspace_id = invoice_record.workspace_id
      AND subscription.module_id = module_record.id;

    INSERT INTO public.workspace_module_subscriptions (
      workspace_subscription_id, workspace_id, module_id, plan_id, status,
      monthly_amount, annual_amount, bundle_id, started_at, cancelled_at
    ) VALUES (
      workspace_subscription_record.id,
      invoice_record.workspace_id,
      module_record.id,
      invoice_record.plan_id,
      'active',
      bundle_record.monthly_price / module_count,
      bundle_record.annual_price / module_count,
      invoice_record.bundle_id,
      p_paid_at,
      NULL
    )
    ON CONFLICT (workspace_id, module_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        monthly_amount = EXCLUDED.monthly_amount,
        annual_amount = EXCLUDED.annual_amount,
        bundle_id = EXCLUDED.bundle_id,
        cancelled_at = NULL,
        updated_at = NOW()
    RETURNING id INTO module_subscription_id;

    IF invoice_record.purpose IN ('bundle_purchase', 'bundle_upgrade') THEN
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
        CASE WHEN previous_plan_id IS NULL THEN 'module_add' ELSE 'plan_upgrade' END,
        previous_plan_id,
        invoice_record.plan_id,
        p_paid_at,
        'applied',
        invoice_record.created_by,
        p_paid_at,
        'Applied as part of paid bundle invoice ' || invoice_record.invoice_number
      );
    END IF;

    SELECT id INTO existing_seat_id
    FROM public.workspace_module_seats
    WHERE workspace_id = invoice_record.workspace_id
      AND product_id = module_record.id
    FOR UPDATE;

    IF existing_seat_id IS NULL THEN
      INSERT INTO public.workspace_module_seats (
        workspace_id, product_id, seats_purchased, status, billing_cycle,
        current_period_start, current_period_end, payment_provider,
        provider_metadata, created_by, updated_by
      ) VALUES (
        invoice_record.workspace_id,
        module_record.id,
        invoice_record.seats_after,
        'active',
        invoice_record.billing_cycle,
        COALESCE(invoice_record.period_start, p_paid_at),
        period_end_value,
        'razorpay',
        jsonb_build_object(
          'last_backend_invoice_id', invoice_record.id,
          'bundle_id', invoice_record.bundle_id
        ),
        invoice_record.created_by,
        invoice_record.created_by
      )
      RETURNING id INTO existing_seat_id;
    ELSIF invoice_record.purpose = 'bundle_seat_increase' THEN
      UPDATE public.workspace_module_seats
      SET seats_purchased = invoice_record.seats_after,
          status = 'active',
          payment_provider = 'razorpay',
          provider_customer_id = NULL,
          provider_subscription_id = NULL,
          provider_metadata = COALESCE(provider_metadata, '{}'::JSONB)
            || jsonb_build_object(
              'last_backend_invoice_id', invoice_record.id,
              'bundle_id', invoice_record.bundle_id
            ),
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
            || jsonb_build_object(
              'last_backend_invoice_id', invoice_record.id,
              'bundle_id', invoice_record.bundle_id
            ),
          updated_by = invoice_record.created_by,
          updated_at = NOW()
      WHERE id = existing_seat_id;
    END IF;
  END LOOP;

  UPDATE public.backend_seat_changes
  SET status = 'applied',
      applied_at = p_paid_at,
      processing_error = NULL,
      updated_at = NOW()
  WHERE invoice_id = p_invoice_id
    AND status = 'awaiting_payment';

  IF invoice_record.purpose = 'bundle_seat_increase' THEN
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

REVOKE ALL ON FUNCTION public.apply_paid_backend_bundle_invoice(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_paid_backend_bundle_invoice(UUID, TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON COLUMN public.backend_billing_invoices.bundle_id IS
  'Bundle purchased by this invoice. Bundle invoices have no single module_id.';
COMMENT ON COLUMN public.backend_seat_changes.change_group_id IS
  'Groups the per-module seat changes belonging to one atomic bundle request.';
COMMENT ON FUNCTION public.apply_paid_backend_bundle_invoice(UUID, TEXT, TIMESTAMPTZ) IS
  'Idempotently activates every module and seat row in a paid backend bundle invoice.';

CREATE OR REPLACE FUNCTION public.assign_backend_bundle_user(
  p_workspace_id UUID,
  p_bundle_id UUID,
  p_user_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  module_record RECORD;
  configured_modules INTEGER;
  active_modules INTEGER;
  changed BOOLEAN := FALSE;
BEGIN
  SELECT COUNT(*) INTO configured_modules
  FROM public.bundle_modules
  WHERE bundle_id = p_bundle_id;

  SELECT COUNT(*) INTO active_modules
  FROM public.workspace_module_subscriptions
  WHERE workspace_id = p_workspace_id
    AND bundle_id = p_bundle_id
    AND status = 'active';

  IF configured_modules < 2 OR active_modules <> configured_modules THEN
    RAISE EXCEPTION 'Workspace % does not have every module in bundle % active',
      p_workspace_id, p_bundle_id;
  END IF;

  FOR module_record IN
    SELECT module_id
    FROM public.bundle_modules
    WHERE bundle_id = p_bundle_id
    ORDER BY module_id
  LOOP
    changed := public.assign_backend_module_user(
      p_workspace_id,
      module_record.module_id,
      p_user_id,
      p_actor_id
    ) OR changed;
  END LOOP;

  RETURN changed;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_backend_bundle_user(
  p_workspace_id UUID,
  p_bundle_id UUID,
  p_user_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_rows INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_module_subscriptions
    WHERE workspace_id = p_workspace_id
      AND bundle_id = p_bundle_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Workspace % does not have bundle % active',
      p_workspace_id, p_bundle_id;
  END IF;

  UPDATE public.workspace_module_users
  SET status = 'removed',
      removed_at = NOW(),
      updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND module_id IN (
      SELECT module_id FROM public.bundle_modules WHERE bundle_id = p_bundle_id
    )
    AND status = 'active';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;

  UPDATE public.seat_assignments
  SET is_active = FALSE,
      revoked_at = NOW(),
      revoked_by = p_actor_id,
      updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND product_id IN (
      SELECT module_id FROM public.bundle_modules WHERE bundle_id = p_bundle_id
    )
    AND is_active;

  RETURN changed_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_backend_bundle_user(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_backend_bundle_user(UUID, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_backend_bundle_user(UUID, UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_backend_bundle_user(UUID, UUID, UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.assign_backend_bundle_user(UUID, UUID, UUID, UUID) IS
  'Atomically assigns a bundled user to every module in the active bundle.';
COMMENT ON FUNCTION public.remove_backend_bundle_user(UUID, UUID, UUID, UUID) IS
  'Atomically removes a bundled user from every module in the active bundle.';

COMMIT;
