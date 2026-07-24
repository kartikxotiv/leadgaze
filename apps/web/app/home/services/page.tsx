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
import { Info, Ticket, AlertCircle, Users, Clock, Building } from 'lucide-react';

import {
  createBrandedReport,
  finalizeReport,
  drawSectionHeading,
  drawExecutiveSummary,
  drawKeyMetrics,
  addBrandedPage,
  getIconAsBase64,
  generateDonutChartBase64,
  loadImageAsBase64,
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

      // Load images & icons
      const graphBase64 = await loadImageAsBase64('/images/report_graph.png');
      const iconInfo = await getIconAsBase64('pdf-icon-info');
      const iconTickets = await getIconAsBase64('pdf-icon-tickets');
      const iconOpen = await getIconAsBase64('pdf-icon-open');
      const iconUsers = await getIconAsBase64('pdf-icon-users');
      const iconOrgs = await getIconAsBase64('pdf-icon-orgs');
      const iconClock = await getIconAsBase64('pdf-icon-clock');

      // ── Executive Summary ───────────────────────────────────────────
      let y = drawExecutiveSummary(doc, startY, graphBase64, iconInfo);

      // ── Key Metrics ─────────────────────────────────────────────────
      y = drawKeyMetrics(doc, y, [
        { value: metrics.totalTickets ?? 0, label: 'Total Tickets', color: PDF_BRAND.primary, iconBase64: iconTickets },
        { value: metrics.openTickets ?? 0, label: 'Open Tickets', color: PDF_BRAND.amber, iconBase64: iconOpen },
        { value: metrics.customers ?? 0, label: 'Customers', color: PDF_BRAND.accent, iconBase64: iconUsers },
        { value: metrics.organizations ?? 0, label: 'Organizations', color: [225, 60, 120], iconBase64: iconOrgs }, // Pink
        { value: formatHours(metrics.totalLoggedSeconds ?? 0), label: 'Logged Time', color: [100, 107, 190], iconBase64: iconClock }, // Purple
      ]);

      // ── Status Workload ──────────────────────────────────────────────
      const statusBreakdown = (metrics.reports?.statusBreakdown as any[]) ?? [];
      if (statusBreakdown.length > 0) {
        if (y > 200) y = await addBrandedPage(doc, { name: orgName, logoUrl: currentWorkspace?.company_logo_url }, 'Service Cloud Dashboard Report', logoBase64);
        y = drawSectionHeading(doc, 'Status Workload', y + 10, PDF_BRAND.primary);

        autoTable(doc, {
          startY: y,
          head: [['Status', 'Logged Time', 'Count']],
          body: statusBreakdown.map((s) => [s.name, formatHours(s.loggedSeconds), String(s.count)]),
          theme: 'grid',
          headStyles: {
            fillColor: PDF_BRAND.primary,
            textColor: PDF_BRAND.white,
            fontStyle: 'normal',
            fontSize: 9,
            cellPadding: 4,
          },
          styles: { fontSize: 9, cellPadding: 4 },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Priority Pressure Section ────────────────────────────────────
      const priorityBreakdown = (metrics.reports?.priorityBreakdown as any[]) ?? [];
      if (priorityBreakdown.length > 0) {
        let py = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 10;
        if (py > 170) py = await addBrandedPage(doc, { name: orgName, logoUrl: currentWorkspace?.company_logo_url }, 'Service Cloud Dashboard Report', logoBase64);
        
        py = drawSectionHeading(doc, 'Priority Pressure', py + 12, [91, 66, 154]);

        const priorityColors: Record<string, [number, number, number]> = {
          header: [91, 66, 154],
          High: [242, 94, 60],    // Red
          Medium: [238, 142, 60], // Amber
          Low: [0, 119, 204],     // Blue
          Critical: [225, 60, 120], // Pink
          default: [100, 107, 190],
        };

        const totalPriority = priorityBreakdown.reduce((sum, p) => sum + p.count, 0);
        const getPct = (val: number) => totalPriority > 0 ? Math.round((val / totalPriority) * 100) + '%' : '0%';

        const chartData = priorityBreakdown.map(p => {
           const rgb = (priorityColors[p.name] || priorityColors.default) as [number, number, number];
           return {
             label: p.name,
             value: p.count,
             pct: getPct(p.count),
             color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
             rgb
           };
        });

        autoTable(doc, {
          startY: py,
          head: [['Priority', 'Tickets', 'Open']],
          body: priorityBreakdown.map((p) => [p.name, String(p.count), String(p.openCount)]),
          theme: 'grid',
          headStyles: {
            fillColor: priorityColors.header,
            textColor: PDF_BRAND.white,
            fontStyle: 'normal',
            fontSize: 9,
            cellPadding: 4,
          },
          styles: { fontSize: 9, cellPadding: 4 },
          margin: { left: 14, right: doc.internal.pageSize.getWidth() / 2 + 5 },
        });

        // Draw Donut Chart on the right
        const rightCenterX = doc.internal.pageSize.getWidth() * 0.75;
        const chartBase64 = generateDonutChartBase64(chartData, 300, 0.6);
        
        const chartSize = 40;
        doc.addImage(chartBase64, 'PNG', rightCenterX - chartSize / 2, py, chartSize, chartSize, undefined, 'FAST');
        
        // Donut Center Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        const totalTextWidth = doc.getTextWidth(totalPriority.toString());
        doc.text(totalPriority.toString(), rightCenterX - totalTextWidth / 2, py + chartSize / 2 - 1);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const labelTextWidth = doc.getTextWidth('Total');
        doc.text('Total', rightCenterX - labelTextWidth / 2, py + chartSize / 2 + 3);

        // Draw Legend below chart
        let legendY = py + chartSize + 8;
        chartData.forEach((d) => {
          doc.setFillColor(...d.rgb);
          doc.circle(rightCenterX - 20, legendY - 1, 1.5, 'F');
          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);
          doc.text(`${d.label} (${d.pct})`, rightCenterX - 15, legendY);
          legendY += 5;
        });
      }

      // ── Customer Pressure Section ────────────────────────────────────
      const customerBreakdown = (metrics.reports?.customerBreakdown as any[]) ?? [];
      if (customerBreakdown.length > 0) {
        const finalY2 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 10;
        let custY = finalY2 > 190 ? await addBrandedPage(doc, { name: orgName, logoUrl: currentWorkspace?.company_logo_url }, 'Service Cloud Dashboard Report', logoBase64) : finalY2 + 12;
        custY = drawSectionHeading(doc, 'Customer Pressure', custY, PDF_BRAND.accent);

        autoTable(doc, {
          startY: custY,
          head: [['Customer', 'Total Tickets', 'Open Tickets', 'Logged Time']],
          body: customerBreakdown.slice(0, 10).map((c) => [c.name, String(c.totalTickets), String(c.openTickets), formatHours(c.loggedSeconds)]),
          theme: 'grid',
          headStyles: { fillColor: PDF_BRAND.accent, textColor: PDF_BRAND.white, fontStyle: 'normal', fontSize: 9, cellPadding: 4 },
          styles: { fontSize: 9, cellPadding: 4 },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Recent Tickets ────────────────────────────────────────────────
      const recentTickets = (metrics.recentTickets as any[]) ?? [];
      if (recentTickets.length > 0) {
        const finalY3 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 10;
        let recY = finalY3 > 220 ? await addBrandedPage(doc, { name: orgName, logoUrl: currentWorkspace?.company_logo_url }, 'Service Cloud Dashboard Report', logoBase64) : finalY3 + 12;
        recY = drawSectionHeading(doc, 'Recent Tickets', recY, [0, 119, 204]);

        autoTable(doc, {
          startY: recY,
          head: [['Ticket', 'Subject', 'Source', 'Emails', 'Created']],
          body: recentTickets.map((t) => [`#${t.ticket_number}`, t.subject, t.source, String(t.email_count ?? 0), new Date(t.created_at).toLocaleDateString()]),
          theme: 'grid',
          headStyles: { fillColor: [0, 119, 204], textColor: PDF_BRAND.white, fontStyle: 'normal', fontSize: 9, cellPadding: 4 },
          styles: { fontSize: 9, cellPadding: 4 },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Oldest Open Tickets ──────────────────────────────────────────
      const openTicketAging = (metrics.reports?.openTicketAging as any[]) ?? [];
      if (openTicketAging.length > 0) {
        const finalY4 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 10;
        let oldY = finalY4 > 220 ? await addBrandedPage(doc, { name: orgName, logoUrl: currentWorkspace?.company_logo_url }, 'Service Cloud Dashboard Report', logoBase64) : finalY4 + 12;
        oldY = drawSectionHeading(doc, 'Oldest Open Tickets', oldY, PDF_BRAND.amber);

        autoTable(doc, {
          startY: oldY,
          head: [['Ticket', 'Subject', 'Customer', 'Assignee', 'Days Open']],
          body: openTicketAging.map((t) => [`#${t.ticketNumber}`, t.subject, t.customer, t.assignee, `${t.daysOpen}d`]),
          theme: 'grid',
          headStyles: { fillColor: PDF_BRAND.amber, textColor: PDF_BRAND.white, fontStyle: 'normal', fontSize: 9, cellPadding: 4 },
          styles: { fontSize: 9, cellPadding: 4 },
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

        {/* Hidden Icons for PDF Generation */}
        <div style={{ display: 'none' }}>
          <Info id="pdf-icon-info" color="#ffffff" size={24} />
          <Ticket id="pdf-icon-tickets" color="#ffffff" size={24} />
          <AlertCircle id="pdf-icon-open" color="#ffffff" size={24} />
          <Users id="pdf-icon-users" color="#ffffff" size={24} />
          <Building id="pdf-icon-orgs" color="#ffffff" size={24} />
          <Clock id="pdf-icon-clock" color="#ffffff" size={24} />
        </div>
      </PageBody>
    </>
  );
}
