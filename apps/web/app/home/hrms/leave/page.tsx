'use client';

import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';

export default function HrmsLeavePage() {
  return (
    <>
      <PageHeader title="Leave" description="Workspace leave operations.">
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <div className="text-muted-foreground rounded-lg border p-6 text-sm">
          Leave requests will share the Leadgaze session and workspace context.
        </div>
      </PageBody>
    </>
  );
}
