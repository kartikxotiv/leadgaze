/**
 * @kit/integration-google-ads
 *
 * Google Ads Lead Forms integration package for Leadgaze.
 * Provides OAuth flow, lead form syncing, field mapping, and CRM lead ingestion.
 */

// Types
export type {
  GoogleAdsConnection,
  GoogleAdsCustomerAccount,
  GoogleAdsCampaign,
  GoogleAdsLeadForm,
  GoogleAdsFormConfig,
  GoogleAdsFieldMapping,
  GoogleAdsSyncLog,
  GoogleAdsWebhookPayload,
  GoogleAdsSettingsData,
} from './types';

// API Controllers
export {
  handleGetGoogleAdsSettings,
  handleMutateGoogleAdsSettings,
  handleGoogleAdsWebhook,
  handleGoogleAdsCallback,
} from './api-controllers';

// Provider utilities
export {
  buildGoogleAdsOAuthUrl,
  exchangeGoogleAdsCode,
  getGoogleAdsCustomerAccounts,
  fetchGoogleAdsLeadFormsByCampaign,
  fetchGoogleAdsLeadData,
} from './google-ads-provider';

// Pages
export * from './pages';

export const name = 'integration-google-ads';
