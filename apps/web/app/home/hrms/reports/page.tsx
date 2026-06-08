'use client';

import { ReportsPage } from '@kit/hrms';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function HrmsReportsPage() {
  const { currentWorkspace } = useRBAC();

  return (
    <WorkspaceCheckWrapper>
      <PageHeader
        title="Reports"
        description={
          currentWorkspace
            ? `${currentWorkspace.name} HRMS reporting`
            : 'HRMS reporting'
        }
      >
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody className="flex min-h-0 flex-1 flex-col">
        <ReportsPage />
      </PageBody>
    </WorkspaceCheckWrapper>
  );
}
