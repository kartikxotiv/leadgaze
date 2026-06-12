'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudResourcePage, StatusBadge } from '../_components/resource-page';

export function ServiceCloudSettingsPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canManageStatuses = canAccess(SERVICE_CLOUD_MODULE_KEYS.settings, SERVICE_CLOUD_FEATURE_KEYS.manageStatuses);
  const canManagePriorities = canAccess(SERVICE_CLOUD_MODULE_KEYS.settings, SERVICE_CLOUD_FEATURE_KEYS.managePriorities);
  const canManageCategories = canAccess(SERVICE_CLOUD_MODULE_KEYS.settings, SERVICE_CLOUD_FEATURE_KEYS.manageCategories);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canManageStatuses && !canManagePriorities && !canManageCategories) return <ServiceCloudAccessDenied label="Service Cloud settings" />;

  return (
    <Tabs defaultValue="statuses" className="space-y-4">
      <TabsList className="mb-0">
        <TabsTrigger value="statuses">Statuses</TabsTrigger>
        <TabsTrigger value="priorities">Priorities</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
      </TabsList>
      <TabsContent value="statuses">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="ticket-statuses"
          title="Ticket Statuses"
          description="Configure support ticket workflow states."
          canCreate={canManageStatuses}
          canEdit={canManageStatuses}
          canDelete={canManageStatuses}
          defaults={{ lifecycle: 'open', display_order: 0 }}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'status_key', label: 'Key', required: true },
            { key: 'lifecycle', label: 'Lifecycle', type: 'select', options: ['new', 'open', 'in_progress', 'waiting', 'resolved', 'closed'].map((value) => ({ label: value, value })) },
            { key: 'color', label: 'Color', type: 'color' },
            { key: 'display_order', label: 'Display Order', type: 'number' },
          ]}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (status) => (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                    style={{ backgroundColor: status.color || '#64748b' }}
                  />
                  <span className="font-medium">{status.name}</span>
                </div>
              ),
            },
            { key: 'status_key', label: 'Key' },
            { key: 'lifecycle', label: 'Lifecycle', render: (status) => <StatusBadge value={status.lifecycle} /> },
            { key: 'display_order', label: 'Order' },
          ]}
        />
      </TabsContent>
      <TabsContent value="priorities">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="ticket-priorities"
          title="Ticket Priorities"
          description="Configure urgency and SLA hints."
          canCreate={canManagePriorities}
          canEdit={canManagePriorities}
          canDelete={canManagePriorities}
          defaults={{ severity_order: 0 }}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'priority_key', label: 'Key', required: true },
            { key: 'severity_order', label: 'Severity Order', type: 'number' },
            { key: 'response_due_minutes', label: 'Response Due Minutes', type: 'number' },
            { key: 'resolution_due_minutes', label: 'Resolution Due Minutes', type: 'number' },
            { key: 'color', label: 'Color', type: 'color' },
          ]}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (priority) => (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                    style={{ backgroundColor: priority.color || '#64748b' }}
                  />
                  <span className="font-medium">{priority.name}</span>
                </div>
              ),
            },
            { key: 'priority_key', label: 'Key' },
            { key: 'severity_order', label: 'Severity' },
            { key: 'response_due_minutes', label: 'Response SLA' },
          ]}
        />
      </TabsContent>
      <TabsContent value="categories">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="ticket-categories"
          title="Ticket Categories"
          description="Classify support issues for reporting and routing."
          canCreate={canManageCategories}
          canEdit={canManageCategories}
          canDelete={canManageCategories}
          defaults={{ display_order: 0 }}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'category_key', label: 'Key', required: true },
            { key: 'description', label: 'Description' },
            { key: 'display_order', label: 'Display Order', type: 'number' },
          ]}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'category_key', label: 'Key' },
            { key: 'description', label: 'Description' },
            { key: 'display_order', label: 'Order' },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
