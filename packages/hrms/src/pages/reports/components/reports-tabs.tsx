import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { Tabs, TabsContent } from '@kit/ui/tabs';

import type { ReportsPageController } from '../../../hooks/use-reports-page';
import { REPORT_TABS } from '../page.data';
import { ReportsAttendanceTab } from './reports-attendance-tab';
import { ReportsCustomTab } from './reports-custom-tab';
import { ReportsLeaveTab } from './reports-leave-tab';
import { ReportsPayrollTab } from './reports-payroll-tab';

export function ReportsTabs(props: { page: ReportsPageController }) {
  const { page } = props;

  if (!page.dashboardData) {
    return null;
  }

  return (
    <Tabs
      value={page.activeTab}
      onValueChange={(value) =>
        page.setActiveTab(value as typeof page.activeTab)
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {REPORT_TABS.map((tab) => (
            <TableStatusMetricTab
              key={tab.value}
              id={tab.value}
              color={getReportTabColor(tab.value)}
              statusName={tab.label}
              count={getReportTabCount(page, tab.value)}
              isSelected={page.activeTab === tab.value}
              onClick={() => page.setActiveTab(tab.value)}
            />
          ))}
        </div>

        <p className="text-muted-foreground px-1 text-sm">
          {REPORT_TABS.find((tab) => tab.value === page.activeTab)?.description}
        </p>
      </div>

      <TabsContent value="attendance" className="mt-6 space-y-6">
        <ReportsAttendanceTab data={page.dashboardData.attendance} />
      </TabsContent>

      <TabsContent value="leave" className="mt-6 space-y-6">
        <ReportsLeaveTab data={page.dashboardData.leave} />
      </TabsContent>

      <TabsContent value="payroll" className="mt-6 space-y-6">
        <ReportsPayrollTab data={page.dashboardData.payroll} />
      </TabsContent>

      <TabsContent value="custom" className="mt-6 space-y-6">
        <ReportsCustomTab data={page.dashboardData.custom} />
      </TabsContent>
    </Tabs>
  );
}

function getReportTabColor(value: (typeof REPORT_TABS)[number]['value']) {
  const colors = {
    attendance: '#4eacff',
    custom: '#8b5cf6',
    leave: '#22c55e',
    payroll: '#f59e0b',
  } as const;

  return colors[value];
}

function getReportTabCount(
  page: ReportsPageController,
  value: (typeof REPORT_TABS)[number]['value'],
) {
  if (!page.dashboardData) {
    return 0;
  }

  if (value === 'attendance') {
    return page.dashboardData.attendance.dailySummary.length;
  }

  if (value === 'leave') {
    return page.dashboardData.leave.balance.length;
  }

  if (value === 'payroll') {
    return page.dashboardData.payroll.payrollSummary.length;
  }

  return page.dashboardData.custom.workforceSnapshot.length;
}
