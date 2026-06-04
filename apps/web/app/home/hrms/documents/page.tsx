'use client';

import { DocumentsPage } from '@kit/hrms';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function HrmsDocumentsPage() {
  const { currentWorkspace } = useRBAC();

  return (
    <WorkspaceCheckWrapper>
      <PageHeader
        title="Documents"
        description={
          currentWorkspace
            ? `${currentWorkspace.name} employee documents`
            : 'Employee documents'
        }
      >
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody className="flex min-h-0 flex-1 flex-col">
        <DocumentsPage />
      </PageBody>
    </WorkspaceCheckWrapper>
  );
}
