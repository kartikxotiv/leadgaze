import { PageBody, PageHeader } from '@kit/ui/page';

import { HrmsDashboardHome } from '../../components/dashboard/hrms-dashboard-home';

export default function HomePage() {
  return (
    <>
      <PageHeader />
      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-3">
        <HrmsDashboardHome />
      </PageBody>
    </>
  );
}
