-- Migration: Fix Service Cloud Function Permissions
-- Date: 2026-06-12
-- Description: Redeclare account_display_name with SECURITY DEFINER to bypass RLS, and grant execute permissions on service_cloud schema functions.

CREATE OR REPLACE FUNCTION service_cloud.account_display_name(p_account_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_label TEXT;
BEGIN
  IF p_account_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(a.name, ''), NULLIF(a.email, ''), a.id::TEXT)
  INTO v_label
  FROM public.accounts a
  WHERE a.id = p_account_id;

  RETURN COALESCE(v_label, p_account_id::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions on functions in service_cloud schema to authenticated, service_role, anon
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA service_cloud TO authenticated, service_role, anon;
