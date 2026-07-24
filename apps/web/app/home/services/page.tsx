'use client';

import { useState } from 'react';
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
import {
  createBrandedReport,
  finalizeReport,
  drawSectionHeading,
  addBrandedPage,
  PDF_BRAND,
} from '~/lib/pdf/pdf-report-utils';

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

      const orgName = currentWorkspace?.name ?? 'Organization';

      // Build info line
      let infoLine = 'Timeframe: All Time';
      if (computedDates?.from || computedDates?.to) {
        infoLine = `Timeframe: ${
          computedDates.from ? new Date(computedDates.from).toLocaleDateString() : 'Start'
        } – ${computedDates.to ? new Date(computedDates.to).toLocaleDateString() : 'Now'}`;
      }

      // Create the branded report document
      const { doc, startY, logoBase64 } = await createBrandedReport({
        org: {
          name: orgName,
          logoUrl: currentWorkspace?.company_logo_url,
        },
        title: 'Service Cloud Dashboard Report',
        infoLine,
      });

      // ── Overview Section ────────────────────────────────────────────
      let y = drawSectionHeading(doc, 'Overview', startY, PDF_BRAND.primary);

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Total']],
        body: [
          ['Total Tickets', String(metrics.totalTickets ?? 0)],
          ['Open Tickets', String(metrics.openTickets ?? 0)],
          ['Customers', String(metrics.customers ?? 0)],
          ['Organizations', String(metrics.organizations ?? 0)],
          ['Logged Time', formatHours(metrics.totalLoggedSeconds ?? 0)],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: PDF_BRAND.primary,
          textColor: PDF_BRAND.white,
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 5,
        },
        alternateRowStyles: { fillColor: PDF_BRAND.lightGray },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 14, right: 14 },
      });

      // ── Priority Pressure Section ────────────────────────────────────
      const priorityBreakdown = (metrics.reports?.priorityBreakdown as any[]) ?? [];
      if (priorityBreakdown.length > 0) {
        const finalY1 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 10;
        y = drawSectionHeading(doc, 'Priority Pressure', finalY1 + 12, PDF_BRAND.amber);

        autoTable(doc, {
          startY: y,
          head: [['Priority', 'Tickets', 'Open']],
          body: priorityBreakdown.map((p) => [p.name, String(p.count), String(p.openCount)]),
          theme: 'grid',
          headStyles: {
            fillColor: PDF_BRAND.amber,
            textColor: PDF_BRAND.white,
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 5,
          },
          alternateRowStyles: { fillColor: PDF_BRAND.lightGray },
          styles: { fontSize: 10, cellPadding: 5 },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Customer Pressure Section ────────────────────────────────────
      const customerBreakdown = (metrics.reports?.customerBreakdown as any[]) ?? [];
      if (customerBreakdown.length > 0) {
        const finalY2 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 10;

        let custY: number;
        if (finalY2 > 220) {
          custY = await addBrandedPage(
            doc,
            { name: orgName, logoUrl: currentWorkspace?.company_logo_url },
            'Service Cloud Dashboard Report',
            logoBase64,
          );
          custY = drawSectionHeading(doc, 'Customer Pressure', custY, PDF_BRAND.accent);
        } else {
          custY = drawSectionHeading(doc, 'Customer Pressure', finalY2 + 12, PDF_BRAND.accent);
        }

        autoTable(doc, {
          startY: custY,
          head: [['Customer', 'Total Tickets', 'Open Tickets', 'Logged Time']],
          body: customerBreakdown.slice(0, 10).map((c) => [
            c.name,
            String(c.totalTickets),
            String(c.openTickets),
            formatHours(c.loggedSeconds),
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: PDF_BRAND.accent,
            textColor: PDF_BRAND.white,
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 5,
          },
          alternateRowStyles: { fillColor: PDF_BRAND.lightGray },
          styles: { fontSize: 10, cellPadding: 5 },
          margin: { left: 14, right: 14 },
        });
      }

      // Finalize (adds footers to every page)
      finalizeReport(doc, orgName);

      doc.save(`${orgName.replace(/\s+/g, '-')}-service-cloud-report.pdf`);
      toast.success('Report downloaded successfully');
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
