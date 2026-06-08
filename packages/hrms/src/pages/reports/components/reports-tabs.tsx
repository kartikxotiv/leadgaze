import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

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
        <TabsList className="h-auto flex-wrap justify-start">
          {REPORT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="text-muted-foreground text-sm">
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
