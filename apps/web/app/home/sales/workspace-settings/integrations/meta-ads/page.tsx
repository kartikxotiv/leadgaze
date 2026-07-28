'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { MetaAdsSettingsPage } from '@kit/integration-meta-ads/pages';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getMetaAdsSettingsService,
  getMetaAdsAuthUrlService,
  disconnectMetaAdsPageService,
  saveMetaAdsFormsService,
  fetchMetaAdsLeadFormsService,
  subscribeMetaAdsPageService,
} from '~/services/meta-ads.service';

export default function MetaAdsIntegrationRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  // Handle OAuth redirect results
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'true') {
      toast.success('Facebook account connected successfully!');
      router.replace('/home/sales/workspace-settings/integrations/meta-ads');
    } else if (error) {
      const messages: Record<string, string> = {
        oauth_denied: 'Facebook authorization was denied.',
        invalid_state: 'OAuth state was invalid. Please try again.',
        missing_workspace: 'Workspace not found. Please try again.',
        auth_failed: 'Authentication failed. Please try again.',
        db_error: 'Failed to save connection. Please try again.',
        missing_params: 'Missing OAuth parameters. Please try again.',
      };
      toast.error(messages[error] ?? 'An error occurred during Facebook connection.');
      router.replace('/home/sales/workspace-settings/integrations/meta-ads');
    }
  }, [searchParams, router]);

  return (
    <MetaAdsSettingsPage
      workspaceId={workspaceId!}
      onNavigateBack={() =>
        router.push('/home/sales/workspace-settings')
      }
      onLoadData={getMetaAdsSettingsService}
      onGetAuthUrl={getMetaAdsAuthUrlService}
      onDisconnect={disconnectMetaAdsPageService}
      onSaveForms={saveMetaAdsFormsService}
      onFetchLeadForms={fetchMetaAdsLeadFormsService}
      onSubscribePage={subscribeMetaAdsPageService}
    />
  );
}
