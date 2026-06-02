'use client';

import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';

export default function HrmsPayrollPage() {
  return (
    <>
      <PageHeader title="Payroll" description="Workspace payroll operations.">
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <div className="text-muted-foreground rounded-lg border p-6 text-sm">
          Payroll data belongs in `hrms` and should only reference Leadgaze
          accounts/workspaces.
        </div>
      </PageBody>
    </>
  );
}
