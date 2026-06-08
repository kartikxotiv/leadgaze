'use client';

import { SelfServicePage } from '@kit/hrms';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function HrmsSelfServicePage() {
  const { currentWorkspace } = useRBAC();

  return (
    <WorkspaceCheckWrapper>
      <PageHeader
        title="Self Service"
        description={
          currentWorkspace
            ? `${currentWorkspace.name} employee self-service`
            : 'Employee self-service'
        }
      >
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody className="flex min-h-0 flex-1 flex-col">
        <SelfServicePage />
      </PageBody>
    </WorkspaceCheckWrapper>
  );
}
