/**
 * TypeScript types for the Meta Ads Lead Forms integration.
 */

/** OAuth connection stored in core.integration_connections (provider = 'meta_ads') */
export interface MetaAdsConnection {
  id: string;
  workspace_id: string;
  provider: 'meta_ads';
  status: 'active' | 'inactive' | 'error';
  config: {
    user_access_token?: string;
    token_expires_at?: number;
    user_id?: string;
    user_name?: string;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/** A Meta Business returned by GET /me/businesses */
export interface MetaAdsBusiness {
  id: string;
  name: string;
}

/** A Facebook Page + its Page Access Token, stored in integration_accounts */
export interface MetaAdsPage {
  id: string;
  workspace_id: string;
  connection_id: string;
  external_account_id: string; // Facebook page_id
  display_name: string;        // Facebook page_name
  email?: string;
  metadata: {
    page_id: string;
    page_name: string;
    page_access_token?: string;
    category?: string;
    businesses?: MetaAdsBusiness[];
  };
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

/** A lead form retrieved from GET /{page-id}/leadgen_forms */
export interface MetaAdsLeadForm {
  id: string;
  name: string;
  status?: string;
  questions?: Array<{ key: string; label?: string; type: string }>;
}

/** A configured form row stored in core.meta_ads_forms */
export interface MetaAdsFormConfig {
  id: string;
  workspace_id: string;
  connection_id: string;
  account_id?: string;
  business_id?: string;
  business_name?: string;
  page_id: string;
  page_name?: string;
  form_id: string;
  form_name: string;
  default_pipeline_id?: string;
  default_stage_id?: string;
  default_owner_id?: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A field mapping row stored in core.meta_ads_field_mappings */
export interface MetaAdsFieldMapping {
  id: string;
  workspace_id: string;
  form_id: string;
  meta_field: string;
  leadgaze_field: string;
  created_at: string;
}

/** A sync log row stored in core.meta_ads_sync_logs */
export interface MetaAdsSyncLog {
  id: string;
  workspace_id: string;
  page_id: string;
  form_id: string;
  leadgen_id: string;
  status: 'success' | 'duplicate' | 'failed' | 'invalid';
  error_message?: string;
  payload: Record<string, unknown>;
  crm_lead_id?: string;
  created_at: string;
}

/** Meta webhook entry payload */
export interface MetaAdsWebhookEntry {
  id: string; // page_id
  changes: Array<{
    field: string; // 'leadgen'
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      adgroup_id?: string;
      ad_id?: string;
      created_time?: number;
    };
  }>;
}

/** Response shape for GET /workspaces/[id]/meta-ads */
export interface MetaAdsSettingsData {
  connection: MetaAdsConnection | null;
  pages: MetaAdsPage[];
  forms: MetaAdsFormConfig[];
  mappings: MetaAdsFieldMapping[];
  recentLogs: MetaAdsSyncLog[];
}
