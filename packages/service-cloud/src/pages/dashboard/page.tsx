'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock3, Ticket, Users, Building2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import { getServiceCloudDashboardService } from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';

function formatHours(seconds: number) {
  return `${Math.round((seconds / 3600) * 10) / 10}h`;
}

export function ServiceCloudDashboardPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading: isPermissionLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.dashboard, SERVICE_CLOUD_FEATURE_KEYS.view);

  const { data, isLoading } = useQuery({
    queryKey: ['service-cloud', 'dashboard', workspaceId],
    queryFn: () => getServiceCloudDashboardService(workspaceId),
    enabled: Boolean(workspaceId && canView),
  });

  if (isPermissionLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="Service Cloud" />;

  const cards = [
    { label: 'Total Tickets', value: data?.totalTickets ?? 0, icon: Ticket },
    { label: 'Open Tickets', value: data?.openTickets ?? 0, icon: Ticket },
    { label: 'Customers', value: data?.customers ?? 0, icon: Users },
    { label: 'Organizations', value: data?.organizations ?? 0, icon: Building2 },
    { label: 'Logged Time', value: formatHours(data?.totalLoggedSeconds ?? 0), icon: Clock3 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{isLoading ? '...' : card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Tickets</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.recentTickets ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              data.recentTickets.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">#{ticket.ticket_number} {ticket.subject}</div>
                    <div className="text-muted-foreground text-sm">{ticket.source} · {new Date(ticket.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
