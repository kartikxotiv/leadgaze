'use client';

import { CoreEmailPage } from '@kit/core/pages';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';

export function ServiceCloudEmailSettingsPage({ workspace }: { workspace: any }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspace?.id);
  const canViewInbox = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.inboxes,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );
  const canManageSettings = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.settings,
    SERVICE_CLOUD_FEATURE_KEYS.manageStatuses,
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  }

  if (!canViewInbox && !canManageSettings) {
    return <ServiceCloudAccessDenied label="email settings" />;
  }

  return (
    <CoreEmailPage
      workspace={workspace}
      permissions={{
        viewInbox: canViewInbox,
        sendEmails: canAccess(
          SERVICE_CLOUD_MODULE_KEYS.tickets,
          SERVICE_CLOUD_FEATURE_KEYS.reply,
        ),
        manageTemplates: canManageSettings,
        manageVariables: canManageSettings,
      }}
      templateContext={{
        module_name: 'Service Cloud',
        workspace_name: workspace?.name ?? '',
      }}
    />
  );
}

