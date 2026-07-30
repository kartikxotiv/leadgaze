/**
 * TypeScript types for the Google Ads Lead Forms integration.
 */

/** OAuth connection stored in core.integration_connections */
export interface GoogleAdsConnection {
  id: string;
  workspace_id: string;
  provider: 'google_ads';
  status: 'active' | 'inactive' | 'error';
  config: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    email?: string;
    customer_accounts?: GoogleAdsCustomerAccount[];
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/** A Google Ads Customer account */
export interface GoogleAdsCustomerAccount {
  customer_id: string;
  account_name: string;
  currency_code?: string;
  time_zone?: string;
}

/** A Google Ads campaign */
export interface GoogleAdsCampaign {
  campaign_id: string;
  campaign_name: string;
  customer_id: string;
}

/** A Google Ads lead form extension */
export interface GoogleAdsLeadForm {
  form_id: string;
  form_name: string;
  campaign_id: string;
  campaign_name: string;
  customer_id: string;
}

/** Stored form configuration in marketing.google_ads_forms */
export interface GoogleAdsFormConfig {
  id: string;
  workspace_id: string;
  connection_id: string;
  customer_id: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id: string;
  form_name: string;
  default_pipeline_id?: string;
  default_stage_id?: string;
  default_owner_id?: string;
  tags: string[];
  account_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Represents a row in core.integration_accounts for Google Ads */
export interface GoogleAdsAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  external_account_id: string; // The Google account ID/email
  email: string;
  display_name?: string;
  metadata: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    customer_accounts?: GoogleAdsCustomerAccount[];
  };
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

/** Field mapping stored in marketing.google_ads_field_mappings */
export interface GoogleAdsFieldMapping {
  id: string;
  workspace_id: string;
  form_id: string;
  google_field: string;
  leadgaze_field: string;
  created_at: string;
}

/** Sync log entry in marketing.google_ads_sync_logs */
export interface GoogleAdsSyncLog {
  id: string;
  workspace_id: string;
  customer_id: string;
  form_id: string;
  lead_id: string;
  status: 'success' | 'duplicate' | 'failed' | 'invalid';
  error_message?: string;
  payload: Record<string, unknown>;
  crm_lead_id?: string;
  created_at: string;
}

/** Google Ads webhook payload (contains only identifiers, not lead data) */
export interface GoogleAdsWebhookPayload {
  lead_id: string;
  form_id: string;
  customer_id: string;
  campaign_id?: string;
  ad_group_id?: string;
  ad_id?: string;
  gclid?: string;
}

/** Response shape for the GET /workspaces/[id]/google-ads endpoint */
export interface GoogleAdsSettingsData {
  connection: GoogleAdsConnection | null;
  accounts: GoogleAdsAccount[];
  forms: GoogleAdsFormConfig[];
  mappings: GoogleAdsFieldMapping[];
  recentLogs: GoogleAdsSyncLog[];
}
