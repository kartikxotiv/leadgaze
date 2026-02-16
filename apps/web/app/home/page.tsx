import { Label } from 'recharts';

import { PageBody, PageHeader } from '@kit/ui/page';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';

export default function HomePage() {
  return (
    <WorkspaceCheckWrapper>
      <PageHeader title="Dashboard" description={'Your SaaS at a glance'} />
      <PageBody>
        <DashboardDemo />
      </PageBody>
    </WorkspaceCheckWrapper>
  );
}
