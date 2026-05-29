'use client';

import { useSearchParams } from 'next/navigation';

import { PageBody, PageHeader } from '@kit/ui/page';
import { PageHeaderActions } from '@kit/ui/page';

import { HrmsSamplePanel } from '@kit/hrms';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';

export default function HomePage() {
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get('module') === 'hrms' ? 'hrms' : 'leadgaze';

  return (
    <WorkspaceCheckWrapper>
      <div className="flex h-[100dvh] flex-col">
        <PageHeader
          title={moduleKey === 'hrms' ? 'HRMS' : 'Dashboard'}
          description={
            moduleKey === 'hrms'
              ? 'Leadgaze shell with the HRMS module preview'
              : 'Your SaaS at a glance'
          }
        >
          <PageHeaderActions>
            <ModuleSwitcher />
          </PageHeaderActions>
        </PageHeader>
        <PageBody className="flex-1 overflow-hidden">
          {moduleKey === 'hrms' ? <HrmsSamplePanel /> : <DashboardDemo />}
        </PageBody>
      </div>
    </WorkspaceCheckWrapper>
  );
}
