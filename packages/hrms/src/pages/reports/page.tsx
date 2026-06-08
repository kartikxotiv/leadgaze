'use client';

import { Download, FileText } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Skeleton } from '@kit/ui/skeleton';

import { useReportsPage } from '../../hooks/use-reports-page';
import { ReportsAccessCard } from './components/reports-access-card';
import { ReportsFilterCard } from './components/reports-filter-card';
import { ReportsTabs } from './components/reports-tabs';

export function ReportsPage() {
  const page = useReportsPage();

  if (!page.isRbacLoading && !page.canViewReports) {
    return <ReportsAccessCard />;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        {page.canExport ? (
          <>
            <Button variant="outline" onClick={page.exportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={page.exportPdf}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </>
        ) : null}
      </div>

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
    </section>
  );
}
