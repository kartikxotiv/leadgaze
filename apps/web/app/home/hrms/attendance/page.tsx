'use client';

import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';

import { ModuleSwitcher } from '~/home/_components/module-switcher';

export default function HrmsAttendancePage() {
  return (
    <>
      <PageHeader
        title="Attendance"
        description="Workspace attendance context."
      >
        <PageHeaderActions>
          <ModuleSwitcher value="hrms" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <div className="text-muted-foreground rounded-lg border p-6 text-sm">
          Attendance APIs should be mounted under `/api/hrms/attendance`.
        </div>
      </PageBody>
    </>
  );
}
