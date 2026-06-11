'use client';

import { PageBody, PageHeader } from '@kit/ui/page';
import { PageHeaderActions } from '@kit/ui/page';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';

export default function HomePage() {
  return (
    <WorkspaceCheckWrapper>
      <PageHeader title="Dashboard" description="Your SaaS at a glance">
        <PageHeaderActions>
          <ModuleSwitcher value="leadgaze" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <DashboardDemo />
      </PageBody>
    </WorkspaceCheckWrapper>
  );
}

