'use client';

import { HrmsDashboardHome } from '@kit/hrms';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function HrmsHomePage() {
  const { currentWorkspace } = useRBAC();

  return (
    <WorkspaceCheckWrapper>
      <div className="flex min-h-[100dvh] flex-col">
        <PageHeader
          title="HRMS"
          description={
            currentWorkspace
              ? `${currentWorkspace.name} people operations`
              : 'People operations'
          }
        >
          <PageHeaderActions>
            <ModuleSwitcher value="hrms" />
          </PageHeaderActions>
        </PageHeader>

        <PageBody>
          <HrmsDashboardHome workspaceName={currentWorkspace?.name} />
        </PageBody>
      </div>
    </WorkspaceCheckWrapper>
  );
}
