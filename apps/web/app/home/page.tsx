import { Label } from 'recharts';

import { PageBody, PageHeader } from '@kit/ui/page';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';

export default function HomePage() {
  return (
    <WorkspaceCheckWrapper>
      <div className="flex h-[100dvh] flex-col">
        <PageHeader title="Dashboard" description={'Your SaaS at a glance'} />
        <PageBody className="flex-1 overflow-hidden">
          <DashboardDemo />
        </PageBody>
      </div>
    </WorkspaceCheckWrapper>
  );
}
