'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { GoogleAdsSettingsPage } from '@kit/integration-google-ads/pages';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getGoogleAdsSettingsService,
  getGoogleAdsAuthUrlService,
  disconnectGoogleAdsService,
  saveGoogleAdsFormsService,
  fetchGoogleAdsAccountsService,
} from '~/services/google-ads.service';

export default function GoogleAdsIntegrationRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  // Handle OAuth redirect results
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'true') {
      toast.success('Google Ads account connected successfully!');
      // Clean up URL params
      router.replace('/home/sales/workspace-settings/integrations/google-ads');
    } else if (error) {
      const messages: Record<string, string> = {
        oauth_denied: 'Google Ads authorization was denied.',
        invalid_state: 'OAuth state was invalid. Please try again.',
        missing_workspace: 'Workspace not found. Please try again.',
        auth_failed: 'Authentication failed. Please try again.',
        db_error: 'Failed to save connection. Please try again.',
      };
      toast.error(messages[error] ?? 'An error occurred during Google Ads connection.');
      router.replace('/home/sales/workspace-settings/integrations/google-ads');
    }
  }, [searchParams, router]);

  return (
    <GoogleAdsSettingsPage
      workspaceId={workspaceId!}
      onNavigateBack={() =>
        router.push('/home/sales/workspace-settings')
      }
      onLoadData={getGoogleAdsSettingsService}
      onGetAuthUrl={getGoogleAdsAuthUrlService}
      onDisconnect={disconnectGoogleAdsService}
      onSaveForms={saveGoogleAdsFormsService}
      onFetchAccounts={fetchGoogleAdsAccountsService}
    />
  );
}
