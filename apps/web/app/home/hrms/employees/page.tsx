'use client';

import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';

export default function HrmsEmployeesPage() {
  return (
    <>
      <PageHeader
        title="Employees"
        description="Employee profiles will use the active Leadgaze workspace."
      >
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <div className="text-muted-foreground rounded-lg border p-6 text-sm">
          HRMS employee records are mounted under the Leadgaze shell. The data
          layer should target the `hrms` schema and `public.workspaces`.
        </div>
      </PageBody>
    </>
  );
}
