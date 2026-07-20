'use client';

import { useRouter } from 'next/navigation';
import { ZapierSettingsPage } from '@kit/integration-zapier/pages';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getZapierSettingsService,
  toggleZapierStatusService,
  generateZapierKeyService,
  revokeZapierKeyService,
} from '~/services/zapier.service';

export default function ZapierIntegrationRoute() {
  const router = useRouter();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  return (
    <ZapierSettingsPage
      workspaceId={workspaceId!}
      onNavigateBack={() =>
        router.push('/home/sales/workspace-settings')
      }
      onLoadData={getZapierSettingsService}
      onToggleStatus={toggleZapierStatusService}
      onGenerateKey={generateZapierKeyService}
      onRevokeKey={revokeZapierKeyService}
    />
  );
}
