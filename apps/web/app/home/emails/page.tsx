'use client';

import { CoreEmailPage } from '@kit/core/pages';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function EmailsPage() {
  const { currentWorkspace, canAccess } = useRBAC();

  return (
    <CoreEmailPage
      workspace={currentWorkspace}
      permissions={{
        viewInbox: canAccess('emails', 'view_inbox'),
        manageTemplates: canAccess('emails', 'manage_templates'),
        manageVariables: canAccess('emails', 'manage_variables'),
      }}
    />
  );
}
