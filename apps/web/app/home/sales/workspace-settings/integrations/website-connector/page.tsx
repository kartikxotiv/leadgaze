'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { WebsiteConnectorListPage } from '@kit/integration-website';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getConnectorsService,
  createConnectorService,
} from '~/services/connectors.service';

export default function WebsiteConnectorsListRoute() {
  const router = useRouter();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  const supabase = getSupabaseBrowserClient() as any;
  const queryClient = useQueryClient();

  const { data: connectors = [], isLoading: isConnectorsLoading } = useQuery({
    queryKey: ['connectors', workspaceId],
    queryFn: () => getConnectorsService(workspaceId!),
    enabled: !!workspaceId,
  });

  return (
    <WebsiteConnectorListPage
      workspaceId={workspaceId!}
      supabase={supabase}
      connectors={connectors}
      isConnectorsLoading={isConnectorsLoading}
      onNavigateToConnector={(id) =>
        router.push(`/home/sales/workspace-settings/integrations/website-connector/${id}`)
      }
      onNavigateBack={() =>
        router.push('/home/sales/workspace-settings')
      }
      onCreateConnector={createConnectorService}
      onConnectorCreated={() => {
        queryClient.invalidateQueries({ queryKey: ['connectors', workspaceId] });
      }}
    />
  );
}
