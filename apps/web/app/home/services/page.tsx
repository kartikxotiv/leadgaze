'use client';

import {
  ServiceCloudDashboardPage,
  ServiceCloudDashboardSkeleton,
} from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { PageHeader, PageHeaderActions, PageBody } from '@kit/ui/page';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';

export default function ServiceCloudDashboardRoute() {
  const { currentWorkspace, isLoading } = useRBAC();
  const { dateRange, setDateRange, computedDates } = useDateRangeFilter();

  if (isLoading) {
    return <ServiceCloudDashboardSkeleton />;
  }

  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;

  return (
    <>
      <PageHeader
        title="Service Cloud"
        description="Support operations, tickets, customers, inboxes, and performance."
      >
        <PageHeaderActions>
          <ListToolBar
            className="border-none bg-transparent shadow-none p-0"
            showFilter
            filterGroups={[
              {
                key: 'created_on',
                label: 'Timeframe',
                type: 'date',
                dateValue: dateRange,
                onDateChange: setDateRange,
              },
            ]}
            activeFilterCount={dateRange ? 1 : 0}
            onClearFilters={() => setDateRange(null)}
          />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <ServiceCloudDashboardPage
          workspaceId={workspaceId}
          dateFilter={computedDates}
        />
      </PageBody>
    </>
  );
}
