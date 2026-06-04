'use client';

import { CoreEmailInboxPage } from '@kit/core/pages';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudEmailToTicketAction } from './email-to-ticket-action';

export function ServiceCloudInboxesPage({ workspace }: { workspace: any }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspace?.id);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.inboxes, SERVICE_CLOUD_FEATURE_KEYS.view);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="support inboxes" />;

  return (
    <CoreEmailInboxPage
      workspace={workspace}
      embedded
      renderEmailActions={(email) => (
        <ServiceCloudEmailToTicketAction workspaceId={workspace.id} email={email} />
      )}
      permissions={{
        viewInbox: canView,
        sendEmails: canAccess(SERVICE_CLOUD_MODULE_KEYS.tickets, SERVICE_CLOUD_FEATURE_KEYS.reply),
      }}
    />
  );
}
