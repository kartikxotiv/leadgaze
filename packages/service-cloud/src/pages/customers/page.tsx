'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudResourcePage } from '../_components/resource-page';

export function ServiceCloudCustomersPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.customers, SERVICE_CLOUD_FEATURE_KEYS.view);
  const canCreate = canAccess(SERVICE_CLOUD_MODULE_KEYS.customers, SERVICE_CLOUD_FEATURE_KEYS.create);
  const canEdit = canAccess(SERVICE_CLOUD_MODULE_KEYS.customers, SERVICE_CLOUD_FEATURE_KEYS.edit);
  const canDelete = canAccess(SERVICE_CLOUD_MODULE_KEYS.customers, SERVICE_CLOUD_FEATURE_KEYS.delete);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="customers" />;

  return (
    <Tabs defaultValue="customers" className="space-y-4">
      <TabsList>
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
      </TabsList>
      <TabsContent value="customers">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="customers"
          title="Customers"
          description="People who contact support."
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
            { key: 'job_title', label: 'Job Title' },
          ]}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'job_title', label: 'Job Title' },
          ]}
        />
      </TabsContent>
      <TabsContent value="organizations">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="organizations"
          title="Organizations"
          description="Companies and customer accounts supported by the team."
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'website', label: 'Website' },
            { key: 'industry', label: 'Industry' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
          ]}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'website', label: 'Website' },
            { key: 'industry', label: 'Industry' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
