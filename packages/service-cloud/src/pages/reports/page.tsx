'use client';

import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import { getServiceCloudDashboardService } from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';

export function ServiceCloudReportsPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading: isPermissionLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.reports, SERVICE_CLOUD_FEATURE_KEYS.view);
  const { data } = useQuery({
    queryKey: ['service-cloud', 'reports', workspaceId],
    queryFn: () => getServiceCloudDashboardService(workspaceId),
    enabled: Boolean(workspaceId && canView),
  });

  if (isPermissionLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="reports" />;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Ticket Volume</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">{data?.totalTickets ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Open Workload</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">{data?.openTickets ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Logged Hours</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">{Math.round(((data?.totalLoggedSeconds ?? 0) / 3600) * 10) / 10}</CardContent>
      </Card>
    </div>
  );
}
