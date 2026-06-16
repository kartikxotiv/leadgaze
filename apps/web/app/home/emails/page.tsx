'use client';

import { CoreEmailPage } from '@kit/core/pages';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function EmailsPage() {
  const { currentWorkspace, canAccess } = useRBAC();
  const canManageEmail = canAccess('emails', 'manage_email');

  return (
    <CoreEmailPage
      workspace={currentWorkspace}
      permissions={{
        viewInbox: canManageEmail,
        manageTemplates: canManageEmail,
        manageVariables: canManageEmail,
      }}
    />
  );
}
