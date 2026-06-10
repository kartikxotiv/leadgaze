'use client';

import { SeparationPage } from '@kit/hrms';
import { PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function HrmsSeparationPage() {
  const { currentWorkspace } = useRBAC();

  return (
    <WorkspaceCheckWrapper>
      <SeparationPage
        headerActions={
          <PageHeaderActions>
            <ModuleSwitcher value="hrms" />
          </PageHeaderActions>
        }
        workspaceName={currentWorkspace?.name}
      />
    </WorkspaceCheckWrapper>
  );
}
