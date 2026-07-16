'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { WebsiteConnectorDetailPage } from '@kit/integration-website';
import type { Connector } from '@kit/integration-website';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getConnectorsService,
  updateConnectorService,
  updateConnectorFormService,
  runConnectorSandboxService,
  getConnectorLogsService,
  rotateConnectorApiKeyService,
} from '~/services/connectors.service';

export default function WebsiteConnectorDetailRoute() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const connectorId = params?.id;

  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  const supabase = getSupabaseBrowserClient() as any;
  const queryClient = useQueryClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'https://app.leadgaze.com');

  const { data: connectors = [], isLoading: isConnectorsLoading } = useQuery({
    queryKey: ['connectors', workspaceId],
    queryFn: () => getConnectorsService(workspaceId!),
    enabled: !!workspaceId,
  });

  const activeConnector =
    (connectors as Connector[]).find((c: Connector) => c.id === connectorId) ?? null;

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['connector-logs', connectorId],
    queryFn: () => getConnectorLogsService(connectorId!),
    enabled: !!connectorId,
  });

  return (
    <WebsiteConnectorDetailPage
      connector={activeConnector}
      isLoading={isConnectorsLoading}
      logs={logs}
      onRefetchLogs={refetchLogs}
      siteUrl={siteUrl}
      workspaceId={workspaceId!}
      supabase={supabase}
      onUpdateConnector={async (id, payload) => {
        const updated = await updateConnectorService(id, payload);
        queryClient.invalidateQueries({ queryKey: ['connectors', workspaceId] });
        return updated;
      }}
      onUpdateConnectorForm={updateConnectorFormService}
      onRunSandbox={runConnectorSandboxService}
      onRotateKey={rotateConnectorApiKeyService}
      onNavigateBack={() =>
        router.push('/home/sales/workspace-settings/integrations/website-connector')
      }
    />
  );
}
