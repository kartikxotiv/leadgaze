/*
 * -------------------------------------------------------
 * Migration: Create Companies Table & Add Workspace Onboarding Columns
 * Date: 2026-07-01
 * Description:
 *   1. Creates the `companies` table to store company/organization details
 *      collected during the onboarding flow.
 *   2. Alters the `workspaces` table to add:
 *      - product_preferences       (JSONB)
 *      - is_subscribed_for_updates (BOOLEAN)
 *      - is_onboarding_finished      (BOOLEAN)
 *      - company_id        (FK → companies)
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. CREATE companies TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Branding
  logo_url    VARCHAR(1000),

  -- Identity (mandatory)
  name        VARCHAR(255) NOT NULL,

  -- Location (mandatory)
  billing_country     VARCHAR(100) NOT NULL,

  -- Discovery (optional, multi-select stored as text array)
  heard_about_us      TEXT[] DEFAULT '{}'::text[],

  -- Metadata
  created_by          UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.companies                      IS 'Stores company/organization details captured during the onboarding flow.';
COMMENT ON COLUMN public.companies.logo_url     IS 'Optional URL to the company logo image.';
COMMENT ON COLUMN public.companies.name         IS 'Official name of the company (required).';
COMMENT ON COLUMN public.companies.billing_country      IS 'Country used for billing purposes (required).';
COMMENT ON COLUMN public.companies.heard_about_us       IS 'Array of sources through which the user heard about the product (multi-select).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_name     ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_billing_country  ON public.companies(billing_country);

-- =====================================================
-- 2. ROW LEVEL SECURITY — companies
-- =====================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Broad open policy (mirrors pattern used in workspaces / workspace_roles)
CREATE POLICY companies_policy ON public.companies
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Scoped read policy for authenticated users
CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (true);

-- Writes restricted to service_role
CREATE POLICY companies_insert ON public.companies FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY companies_update ON public.companies FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY companies_delete ON public.companies FOR DELETE TO service_role USING (true);

-- Grants
REVOKE ALL ON public.companies FROM authenticated, service_role;
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL    ON public.companies TO service_role, anon, authenticated;

-- =====================================================
-- 3. ALTER workspaces — add onboarding & company columns
-- =====================================================

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS company_id                  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_preferences                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_subscribed_for_updates BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_onboarding_finished      BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.workspaces.company_id                  IS 'FK to the companies table; links a workspace to its company profile created during onboarding.';
COMMENT ON COLUMN public.workspaces.product_preferences                 IS 'Workspace-level user preferences stored as JSON (e.g. theme, language, notifications).';
COMMENT ON COLUMN public.workspaces.is_subscribed_for_updates IS 'Whether the workspace owner has opted-in to product update emails. Defaults to TRUE.';
COMMENT ON COLUMN public.workspaces.is_onboarding_finished      IS 'Flag indicating whether the onboarding flow has been completed. Defaults to FALSE.';

-- Index for quick lookup of workspaces that have not finished onboarding
CREATE INDEX IF NOT EXISTS idx_workspaces_onboarding_pending
  ON public.workspaces(is_onboarding_finished)
  WHERE is_onboarding_finished = FALSE;

-- Index for company FK
CREATE INDEX IF NOT EXISTS idx_workspaces_company_id
  ON public.workspaces(company_id);

-- 5. Storage Bucket for companies logo

INSERT INTO storage.buckets (id, name, public)

VALUES ('companies-logo', 'companies-logo', true)

ON CONFLICT (id) DO NOTHING;

-- Storage bucket for companies logo

CREATE POLICY "companies-logo_public_policy"
ON storage.objects FOR ALL TO anon, authenticated, service_role
USING (bucket_id = 'companies-logo')
WITH CHECK (bucket_id = 'companies-logo');