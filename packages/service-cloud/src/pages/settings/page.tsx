'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import {
  ServiceCloudResourcePage,
  StatusBadge,
} from '../_components/resource-page';

export function ServiceCloudSettingsPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canManageStatuses = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.settings,
    SERVICE_CLOUD_FEATURE_KEYS.manageStatuses,
  );
  const canManagePriorities = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.settings,
    SERVICE_CLOUD_FEATURE_KEYS.managePriorities,
  );
  const canManageCategories = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.settings,
    SERVICE_CLOUD_FEATURE_KEYS.manageCategories,
  );

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canManageStatuses && !canManagePriorities && !canManageCategories)
    return <ServiceCloudAccessDenied label="Service Cloud settings" />;

  const tabsSlot = (
    <TabsList className="mb-1 h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
      <TabsTrigger 
        value="statuses"
        className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
      >
        Statuses
      </TabsTrigger>
      <TabsTrigger 
        value="priorities"
        className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
      >
        Priorities
      </TabsTrigger>
      <TabsTrigger 
        value="categories"
        className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
      >
        Categories
      </TabsTrigger>
    </TabsList>
  );

  return (
    <Tabs
      defaultValue="statuses"
      className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col space-y-4"
    >
      <TabsContent
        value="statuses"
        className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 gap-2"
      >
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          pageHeaderTitle="Service Settings"
          resource="ticket-statuses"
          entityLabel="statuses"
          title="Ticket Statuses"
          createLabel="New Status"
          description="Configure support ticket workflow states."
          tabsSlot={tabsSlot}
          canCreate={canManageStatuses}
          canEdit={canManageStatuses}
          canDelete={canManageStatuses}
          defaults={{ lifecycle: 'open', display_order: 0 }}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'status_key', label: 'Key', required: true },
            {
              key: 'lifecycle',
              label: 'Lifecycle',
              type: 'select',
              options: [
                'new',
                'open',
                'in_progress',
                'waiting',
                'resolved',
                'closed',
              ].map((value) => ({ label: value, value })),
            },
            { key: 'color', label: 'Color', type: 'color' },
            { key: 'display_order', label: 'Display Order', type: 'number' },
          ]}
          uniqueFields={[{ key: 'display_order', label: 'Order' }]}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (status) => (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: status.color || '#64748b' }}
                  />
                  <span className="font-medium">{status.name}</span>
                </div>
              ),
            },
            { 
              key: 'status_key', 
              label: 'Key',
              render: (status) => (
                <span className="text-muted-foreground font-normal">
                  {status.status_key ? status.status_key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''}
                </span>
              )
            },
            {
              key: 'lifecycle',
              label: 'Lifecycle',
              render: (status) => (
                <span className="text-leadgaze-dark dark:text-white font-normal">
                  {status.lifecycle ? status.lifecycle.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''}
                </span>
              ),
            },
            { key: 'display_order', label: 'Order' },
          ]}
        />
      </TabsContent>
      <TabsContent
        value="priorities"
        className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 gap-2"
      >
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          pageHeaderTitle="Service Settings"
          resource="ticket-priorities"
          entityLabel="priorities"
          title="Ticket Priorities"
          createLabel="New Priority"
          description="Configure urgency and SLA hints."
          tabsSlot={tabsSlot}
          canCreate={canManagePriorities}
          canEdit={canManagePriorities}
          canDelete={canManagePriorities}
          defaults={{ severity_order: 0 }}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'priority_key', label: 'Key', required: true },
            { key: 'severity_order', label: 'Severity Order', type: 'number' },
            {
              key: 'resolution_due_minutes',
              label: 'Resolution Due Minutes',
              type: 'number',
            },
            { key: 'color', label: 'Color', type: 'color' },
          ]}
          uniqueFields={[{ key: 'severity_order', label: 'Severity' }]}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (priority) => (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: priority.color || '#64748b' }}
                  />
                  <span className="font-medium">{priority.name}</span>
                </div>
              ),
            },
            { key: 'priority_key', label: 'Key' },
            { key: 'severity_order', label: 'Severity' },
            { key: 'resolution_due_minutes', label: 'Resolution SLA' },
          ]}
        />
      </TabsContent>
      <TabsContent
        value="categories"
        className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 gap-2"
      >
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          pageHeaderTitle="Service Settings"
          resource="ticket-categories"
          entityLabel="categories"
          title="Ticket Categories"
          createLabel="New Category"
          description="Classify support issues for reporting and routing."
          tabsSlot={tabsSlot}
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
          uniqueFields={[{ key: 'display_order', label: 'Order' }]}
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
