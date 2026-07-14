'use client';

import { PageBody, PageHeader } from '@kit/ui/page';
import { PageHeaderActions } from '@kit/ui/page';

import { ListToolBar } from '@kit/ui/list-toolbar';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';

export default function HomePage() {
  const { dateRange, setDateRange, computedDates } = useDateRangeFilter();

  return (
    <WorkspaceCheckWrapper>
      <PageHeader title="Dashboard" description="Your SaaS at a glance">
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
          <ModuleSwitcher value="leadgaze" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <DashboardDemo dateFilter={computedDates} />
      </PageBody>
    </WorkspaceCheckWrapper>
  );
}

