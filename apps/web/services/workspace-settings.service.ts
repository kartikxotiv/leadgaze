import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

import type { WorkspaceCurrency } from './workspace-currencies.service';
import type { WorkspacePreferences } from './workspace-preferences.service';

// =====================================================
// Types
// =====================================================

export interface WorkspaceCompany {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  country?: string | null;
  billing_country?: string | null;
  logo_url?: string | null;
  tax_id?: string | null;
  invoice_address?: string | null;
  invoice_city?: string | null;
  invoice_postal_code?: string | null;
  invoice_state?: string | null;
}

export interface WorkspaceSettingsData {
  workspace: {
    id: string;
    name: string;
    slug: string;
    company_id: string | null;
    company: WorkspaceCompany | null;
  };
  /** Localization preferences */
  preferences: WorkspacePreferences;
  /** Active currencies enabled for this workspace */
  currencies: WorkspaceCurrency[];
}

export interface SaveGeneralSettingsPayload {
  workspaceId: string;
  workspaceName: string;
  companyId: string | null;
  company: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    postal_code?: string;
    country?: string;
    billing_country?: string;
    logo_url?: string | null;
    tax_id?: string | null;
    invoice_address?: string;
    invoice_city?: string;
    invoice_postal_code?: string;
    invoice_state?: string;
  };
}

// =====================================================
// GET /api/workspaces/settings?workspaceId=X
// Consolidated endpoint — replaces:
//   - Direct Supabase browser query in general-settings.tsx
//   - GET /workspaces/preferences (2 DB queries)
//   - GET /workspaces/currencies  (1 DB query)
// All resolved by a single RPC on the server.
// =====================================================

const getWorkspaceSettingsService = asyncHandlerClient(
  async (workspaceId: string): Promise<WorkspaceSettingsData | null> => {
    const response = await ApiClient.get(
      `/workspaces/settings?workspaceId=${workspaceId}`,
    );
    return (response.data?.data || null) as WorkspaceSettingsData | null;
  },
);

// =====================================================
// POST /api/workspaces/save-general
// Replaces two sequential calls:
//   - PATCH /api/companies/:id
//   - PATCH /api/workspaces/:id
// The server parallelises them for existing companies.
// =====================================================

const saveGeneralSettingsService = asyncHandlerClient(
  async (payload: SaveGeneralSettingsPayload) => {
    const response = await ApiClient.post('/workspaces/save-general', payload);
    return response.data?.data || null;
  },
);

export { getWorkspaceSettingsService, saveGeneralSettingsService };
