'use client';

import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';

export default function HrmsDepartmentsPage() {
  return (
    <>
      <PageHeader title="Departments" description="Workspace-scoped HR teams.">
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <div className="text-muted-foreground rounded-lg border p-6 text-sm">
          Department management is reserved for the HRMS schema migration pass.
        </div>
      </PageBody>
    </>
  );
}
