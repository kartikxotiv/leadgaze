'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
  ServiceCloudDashboardPage,
  ServiceCloudDashboardSkeleton,
  getServiceCloudDashboardService,
} from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { PageHeader, PageHeaderActions, PageBody } from '@kit/ui/page';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { DownloadReportButton } from '@kit/ui/download-report-button';

function formatHours(seconds: number) {
  return `${Math.round((Number(seconds || 0) / 3600) * 10) / 10}h`;
}

export default function ServiceCloudDashboardRoute() {
  const { currentWorkspace, isLoading } = useRBAC();
  const { dateRange, setDateRange, computedDates } = useDateRangeFilter();
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading) {
    return <ServiceCloudDashboardSkeleton />;
  }

  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;

  const handleDownload = async () => {
    try {
      setIsGenerating(true);

      // Try to get from cache first, otherwise fetch
      let metrics = queryClient.getQueryData<any>(['service-cloud', 'dashboard', workspaceId, computedDates]);
      if (!metrics) {
        metrics = await getServiceCloudDashboardService(workspaceId, computedDates);
      }

      if (!metrics) {
        toast.error('Data not available to generate report');
        return;
      }

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Service Cloud Dashboard Report', 14, 22);

      // Filter Details
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      let dateText = 'Timeframe: All Time';
      if (computedDates?.from || computedDates?.to) {
        dateText = `Timeframe: ${
          computedDates.from ? new Date(computedDates.from).toLocaleDateString() : 'Start'
        } to ${computedDates.to ? new Date(computedDates.to).toLocaleDateString() : 'Now'}`;
      }
      doc.text(dateText, 14, 30);

      // Summary Table
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Overview', 14, 45);

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Total']],
        body: [
          ['Total Tickets', String(metrics.totalTickets ?? 0)],
          ['Open Tickets', String(metrics.openTickets ?? 0)],
          ['Customers', String(metrics.customers ?? 0)],
          ['Organizations', String(metrics.organizations ?? 0)],
          ['Logged Time', formatHours(metrics.totalLoggedSeconds ?? 0)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [78, 172, 255] },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      // Priority Breakdown Table
      const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 50;
      const priorityBreakdown = (metrics.reports?.priorityBreakdown as any[]) ?? [];

      if (priorityBreakdown.length > 0) {
        doc.text('Priority Pressure', 14, finalY + 15);
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Priority', 'Tickets', 'Open']],
          body: priorityBreakdown.map((p) => [
            p.name,
            String(p.count),
            String(p.openCount),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11] },
          styles: { fontSize: 11, cellPadding: 5 },
        });
      }

      // Customer Breakdown
      const finalY2 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || finalY + 20;
      const customerBreakdown = (metrics.reports?.customerBreakdown as any[]) ?? [];

      if (customerBreakdown.length > 0) {
        if (finalY2 > 230) {
          doc.addPage();
          doc.text('Customer Pressure', 14, 22);
          autoTable(doc, {
            startY: 27,
            head: [['Customer', 'Total Tickets', 'Open Tickets', 'Logged Time']],
            body: customerBreakdown.slice(0, 10).map((c) => [
              c.name,
              String(c.totalTickets),
              String(c.openTickets),
              formatHours(c.loggedSeconds),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [62, 189, 147] },
            styles: { fontSize: 11, cellPadding: 5 },
          });
        } else {
          doc.text('Customer Pressure', 14, finalY2 + 15);
          autoTable(doc, {
            startY: finalY2 + 20,
            head: [['Customer', 'Total Tickets', 'Open Tickets', 'Logged Time']],
            body: customerBreakdown.slice(0, 10).map((c) => [
              c.name,
              String(c.totalTickets),
              String(c.openTickets),
              formatHours(c.loggedSeconds),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [62, 189, 147] },
            styles: { fontSize: 11, cellPadding: 5 },
          });
        }
      }

      doc.save('service-dashboard-report.pdf');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Service Cloud"
        description="Support operations, tickets, customers, inboxes, and performance."
      >
        <PageHeaderActions>
          <DownloadReportButton 
            onDownload={handleDownload} 
            isGenerating={isGenerating} 
          />
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
          dateRange={dateRange}
        />
      </PageBody>
    </>
  );
}
