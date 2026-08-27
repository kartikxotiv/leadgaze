-- ============================================================
-- Workspace Settings Optimization
-- 1. get_workspace_settings RPC — consolidates workspace +
--    company + localization prefs + currencies into 1 call.
-- 2. update_workspace_default_currency RPC — atomic swap of
--    is_default flag across workspace_currencies rows.
-- ============================================================

-- ============================================================
-- 1. get_workspace_settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_workspace_settings(
  p_workspace_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_workspace  JSONB;
  v_prefs      JSONB;
  v_currencies JSONB;
BEGIN
  -- 1. Workspace row joined with company (one LEFT JOIN — single DB round-trip)
  SELECT jsonb_build_object(
    'id',         w.id,
    'name',       w.name,
    'slug',       w.slug,
    'company_id', w.company_id,
    'company', CASE
      WHEN c.id IS NOT NULL THEN jsonb_build_object(
        'id',                   c.id,
        'name',                 c.name,
        'email',                c.email,
        'phone',                c.phone,
        'address',              c.address,
        'postal_code',          c.postal_code,
        'country',              c.country,
        'billing_country',      c.billing_country,
        'logo_url',             c.logo_url,
        'tax_id',               c.tax_id,
        'invoice_address',      c.invoice_address,
        'invoice_city',         c.invoice_city,
        'invoice_postal_code',  c.invoice_postal_code,
        'invoice_state',        c.invoice_state
      )
      ELSE NULL
    END
  )
  INTO v_workspace
  FROM public.workspaces w
  LEFT JOIN public.companies c ON c.id = w.company_id
  WHERE w.id = p_workspace_id;

  -- 2. Localization preferences (core schema)
  SELECT COALESCE(
    to_jsonb(wp),
    jsonb_build_object(
      'workspace_id',    p_workspace_id,
      'timezone',        'UTC',
      'date_format',     'MM-DD-YYYY',
      'time_format',     '12h',
      'default_currency','USD'
    )
  )
  INTO v_prefs
  FROM core.workspace_preferences wp
  WHERE wp.workspace_id = p_workspace_id;

  -- Handle case where no prefs row exists yet
  IF v_prefs IS NULL THEN
    v_prefs := jsonb_build_object(
      'workspace_id',    p_workspace_id,
      'timezone',        'UTC',
      'date_format',     'MM-DD-YYYY',
      'time_format',     '12h',
      'default_currency','USD'
    );
  END IF;

  -- 3. Active currencies ordered by default first, then code
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',              wc.id,
        'workspace_id',    wc.workspace_id,
        'currency_code',   wc.currency_code,
        'currency_symbol', wc.currency_symbol,
        'is_default',      wc.is_default,
        'is_active',       wc.is_active,
        'created_at',      wc.created_at
      )
      ORDER BY wc.is_default DESC, wc.currency_code ASC
    ),
    '[]'::jsonb
  )
  INTO v_currencies
  FROM core.workspace_currencies wc
  WHERE wc.workspace_id = p_workspace_id
    AND wc.is_active = true;

  RETURN jsonb_build_object(
    'workspace',   COALESCE(v_workspace,  '{}'::jsonb),
    'preferences', COALESCE(v_prefs,      '{}'::jsonb),
    'currencies',  COALESCE(v_currencies, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_workspace_settings(UUID)
  TO authenticated, service_role;

-- ============================================================
-- 2. update_workspace_default_currency
--    Atomically swaps is_default flag and syncs workspace_preferences
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_workspace_default_currency(
  p_workspace_id UUID,
  p_currency_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_upper_code TEXT := UPPER(p_currency_code);
  v_result     JSONB;
BEGIN
  -- Clear all current defaults for this workspace in one statement
  UPDATE core.workspace_currencies
  SET    is_default = false
  WHERE  workspace_id = p_workspace_id
    AND  is_default   = true;

  -- Set the new default
  UPDATE core.workspace_currencies
  SET    is_default = true
  WHERE  workspace_id   = p_workspace_id
    AND  currency_code  = v_upper_code;

  -- Sync workspace_preferences.default_currency (upsert)
  INSERT INTO core.workspace_preferences (workspace_id, default_currency)
  VALUES (p_workspace_id, v_upper_code)
  ON CONFLICT (workspace_id)
  DO UPDATE SET
    default_currency = EXCLUDED.default_currency,
    updated_at       = NOW();

  -- Return updated preference row
  SELECT to_jsonb(wp)
  INTO   v_result
  FROM   core.workspace_preferences wp
  WHERE  wp.workspace_id = p_workspace_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.update_workspace_default_currency(UUID, TEXT)
  TO authenticated, service_role;
