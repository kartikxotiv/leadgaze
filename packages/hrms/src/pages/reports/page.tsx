'use client';

import type { ReactNode } from 'react';

import { Download, FileText } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';

import { useReportsPage } from '../../hooks/use-reports-page';
import { ReportsAccessCard } from './components/reports-access-card';
import { ReportsFilterCard } from './components/reports-filter-card';
import { ReportsTabs } from './components/reports-tabs';

export function ReportsPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const page = useReportsPage();
  const totalEmployees =
    page.dashboardData?.filters.totalAccessibleEmployees ?? 0;
  const appliedEmployees =
    page.dashboardData?.filters.appliedEmployeeCount ?? 0;
  const departmentsCount = page.dashboardData?.options.departments.length ?? 0;
  const shiftsCount = page.dashboardData?.options.shifts.length ?? 0;

  return (
    <section className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <div className="bg-sidebar flex shrink-0 flex-col overflow-hidden">
        <PageHeader
          className="bg-sidebar shrink-0"
          title="Reports"
          description={
            props.workspaceName
              ? `${props.workspaceName} HRMS reporting`
              : 'HRMS reporting'
          }
        >
          {props.headerActions}
        </PageHeader>

        {!page.isRbacLoading && page.canViewReports ? (
          <>
            <div className="bg-sidebar w-full max-w-full min-w-0 overflow-x-auto pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <TableStatusMetricTab
                  id="employees"
                  color="#4eacff"
                  statusName="Accessible Employees"
                  count={totalEmployees}
                  isSelected
                />
                <TableStatusMetricTab
                  id="applied"
                  color="#22c55e"
                  statusName="In Report Scope"
                  count={appliedEmployees}
                  className="cursor-default"
                />
                <TableStatusMetricTab
                  id="departments"
                  color="#6366f1"
                  statusName="Departments"
                  count={departmentsCount}
                  className="cursor-default"
                />
                <TableStatusMetricTab
                  id="shifts"
                  color="#f59e0b"
                  statusName="Shifts"
                  count={shiftsCount}
                  className="cursor-default"
                />
              </div>
            </div>

            <div className="bg-sidebar w-full shrink-0 border-b pb-2">
              <ListToolBar
                actions={[
                  {
                    key: 'excel',
                    label: 'Export Excel',
                    icon: Download,
                    onClick: page.exportExcel,
                    show: page.canExport,
                    buttonVariant: 'outline',
                  },
                  {
                    key: 'pdf',
                    label: 'Export PDF',
                    icon: FileText,
                    onClick: page.exportPdf,
                    show: page.canExport,
                    buttonVariant: 'outline',
                  },
                ]}
              />
            </div>
          </>
        ) : null}
      </div>

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          {!page.isRbacLoading && !page.canViewReports ? (
            <ReportsAccessCard />
          ) : (
            <>
              <ReportsFilterCard page={page} />

              {page.dashboardQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : page.dashboardQuery.isError ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Unable to load reports</CardTitle>
                    <CardDescription>
                      {(page.dashboardQuery.error as Error)?.message ??
                        'Something went wrong while loading reports.'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : page.dashboardData ? (
                <ReportsTabs page={page} />
              ) : null}
            </>
          )}
        </div>
      </PageBody>
    </section>
  );
}
