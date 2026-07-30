'use client';

import { useState } from 'react';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { PageBody, PageHeader } from '@kit/ui/page';
import { PageHeaderActions } from '@kit/ui/page';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { DownloadReportButton } from '@kit/ui/download-report-button';
import { Users, User, Building, Target, Info } from 'lucide-react';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getDashboardMetricsService } from '~/services/dashboard.service';
import {
  createBrandedReport,
  finalizeReport,
  drawSectionHeading,
  drawExecutiveSummary,
  drawKeyMetrics,
  loadImageAsBase64,
  addBrandedPage,
  getIconAsBase64,
  generateDonutChartBase64,
  PDF_BRAND,
} from '~/lib/pdf/pdf-report-utils';

export default function HomePage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  const { dateRange, setDateRange, computedDates } = useDateRangeFilter();
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleDownload = async () => {
    if (!workspaceId) return;

    try {
      setIsGenerating(true);

      // Try to get from cache first, otherwise fetch
      let metrics = queryClient.getQueryData<any>(['dashboard-metrics', workspaceId, computedDates]);
      if (!metrics) {
        metrics = await getDashboardMetricsService(workspaceId, computedDates);
      }

      if (!metrics) {
        toast.error('Data not available to generate report');
        return;
      }

      const getPortalName = (key?: string | null) => {
        switch (key) {
          case 'sales':
          case 'leadgaze': return 'Sales';
          case 'service_cloud': return 'Service Cloud';
          case 'hrms': return 'HRMS';
          case 'funds': return 'Funds';
          case 'inventory': return 'Inventory';
          default: return key ? key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Sales';
        }
      };

      const portalName = getPortalName(currentWorkspace?.currentProductKey);
      const orgName = currentWorkspace?.name ?? 'Organization';

      // Build info line
      let infoLine = 'Timeframe: All Time';
      if (computedDates?.from || computedDates?.to) {
        infoLine = `Timeframe: ${
          computedDates.from ? new Date(computedDates.from).toLocaleDateString() : 'Start'
        } – ${computedDates.to ? new Date(computedDates.to).toLocaleDateString() : 'Now'}`;
      }

      // Load graph image
      const graphImageUrl = window.location.origin + '/images/report_graph.png';
      const graphBase64 = await loadImageAsBase64(graphImageUrl);

      // Create the branded report document
      const { doc, startY, logoBase64 } = await createBrandedReport({
        org: {
          name: orgName,
          logoUrl: currentWorkspace?.company_logo_url,
        },
        title: `${portalName} Dashboard Report`,
      });

      // Load icons
      const iconInfo = await getIconAsBase64('pdf-icon-info');
      const iconLeads = await getIconAsBase64('pdf-icon-leads');
      const iconContacts = await getIconAsBase64('pdf-icon-contacts');
      const iconAccounts = await getIconAsBase64('pdf-icon-accounts');
      const iconOpp = await getIconAsBase64('pdf-icon-opportunities');

      // ── Executive Summary ───────────────────────────────────────────
      let y = drawExecutiveSummary(doc, startY, graphBase64, iconInfo);

      // ── Key Metrics ─────────────────────────────────────────────────
      y = drawKeyMetrics(doc, y, [
        { value: metrics.leads.total, label: 'Total Leads', color: PDF_BRAND.primary, iconBase64: iconLeads },
        { value: metrics.contacts.total, label: 'Contacts', color: PDF_BRAND.accent, iconBase64: iconContacts },
        { value: metrics.accounts.total, label: 'Accounts', color: [100, 107, 190], iconBase64: iconAccounts }, // Purple-ish
        { value: metrics.opportunities.count, label: 'Pipeline Opportunities', color: PDF_BRAND.amber, iconBase64: iconOpp },
      ]);

      // ── Overview Section ────────────────────────────────────────────
      y = drawSectionHeading(doc, 'Overview', y, PDF_BRAND.primary);

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Total']],
        body: [
          ['Total Leads', metrics.leads.total.toString()],
          ['Contacts', metrics.contacts.total.toString()],
          ['Accounts', metrics.accounts.total.toString()],
          ['Pipeline Opportunities', metrics.opportunities.count.toString()],
        ],
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

      // ── Lead Pipeline Section ────────────────────────────────────────
      const finalY1 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 10;
      const pipelineY = finalY1 + 12;

      y = drawSectionHeading(doc, 'Lead Pipeline', pipelineY, [91, 66, 154]);

      const totalPipeline = 
        metrics.pipeline.newLeads + 
        metrics.pipeline.contacted + 
        metrics.pipeline.qualified + 
        metrics.pipeline.proposalSent + 
        metrics.pipeline.won;
        
      const getPct = (val: number) => totalPipeline > 0 ? Math.round((val / totalPipeline) * 100) + '%' : '0%';

      const pipelineColors = {
        header: [91, 66, 154] as [number, number, number],
        newLeads: [91, 66, 154] as [number, number, number],
        contacted: [0, 119, 204] as [number, number, number],
        qualified: [238, 142, 60] as [number, number, number],
        proposal: [242, 94, 60] as [number, number, number],
        won: [225, 60, 120] as [number, number, number],
      };

      const chartData = [
        { label: 'New Leads', value: metrics.pipeline.newLeads, pct: getPct(metrics.pipeline.newLeads), color: 'rgb(91, 66, 154)', rgb: pipelineColors.newLeads },
        { label: 'Contacted', value: metrics.pipeline.contacted, pct: getPct(metrics.pipeline.contacted), color: 'rgb(0, 119, 204)', rgb: pipelineColors.contacted },
        { label: 'Qualified', value: metrics.pipeline.qualified, pct: getPct(metrics.pipeline.qualified), color: 'rgb(238, 142, 60)', rgb: pipelineColors.qualified },
        { label: 'Proposal Sent', value: metrics.pipeline.proposalSent, pct: getPct(metrics.pipeline.proposalSent), color: 'rgb(242, 94, 60)', rgb: pipelineColors.proposal },
        { label: 'Won', value: metrics.pipeline.won, pct: getPct(metrics.pipeline.won), color: 'rgb(225, 60, 120)', rgb: pipelineColors.won },
      ];

      autoTable(doc, {
        startY: y,
        head: [['Stage', 'Count', '% of Total']],
        body: chartData.map(d => [d.label, d.value.toString(), d.pct]),
        theme: 'grid',
        headStyles: {
          fillColor: pipelineColors.header,
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
      doc.addImage(chartBase64, 'PNG', rightCenterX - chartSize / 2, y, chartSize, chartSize, undefined, 'FAST');
      
      // Donut Center Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      const totalTextWidth = doc.getTextWidth(totalPipeline.toString());
      doc.text(totalPipeline.toString(), rightCenterX - totalTextWidth / 2, y + chartSize / 2 - 1);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const labelTextWidth = doc.getTextWidth('Total');
      doc.text('Total', rightCenterX - labelTextWidth / 2, y + chartSize / 2 + 3);

      // Draw Legend below chart
      let legendY = y + chartSize + 8;
      chartData.forEach((d) => {
        doc.setFillColor(...d.rgb);
        doc.circle(rightCenterX - 20, legendY - 1, 1.5, 'F');
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(`${d.label} (${d.pct})`, rightCenterX - 15, legendY);
        legendY += 5;
      });

      // ── Upcoming Tasks Section ────────────────────────────────────────
      if (metrics.upcomingTasks?.length > 0) {
        const finalY2 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 10;

        let tasksY: number;
        if (finalY2 > 220) {
          // Not enough room — start a new page
          tasksY = await addBrandedPage(doc, { name: orgName, logoUrl: currentWorkspace?.company_logo_url }, `${portalName} Dashboard Report`, logoBase64);
          tasksY = drawSectionHeading(doc, 'Upcoming Tasks', tasksY, PDF_BRAND.amber);
        } else {
          tasksY = drawSectionHeading(doc, 'Upcoming Tasks', finalY2 + 12, PDF_BRAND.amber);
        }

        autoTable(doc, {
          startY: tasksY,
          head: [['Task', 'Entity', 'Due Date']],
          body: metrics.upcomingTasks.map((t: any) => [
            t.title,
            t.entityName || '—',
            new Date(t.dueDate).toLocaleDateString(),
          ]),
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

      // Finalize (adds footers to every page)
      finalizeReport(doc, orgName);

      doc.save(`${orgName.replace(/\s+/g, '-')}-dashboard-report.pdf`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <WorkspaceCheckWrapper>
      <PageHeader title="Dashboard" description="Your SaaS at a glance">
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
          <ModuleSwitcher value="leadgaze" />
        </PageHeaderActions>
      </PageHeader>
      <PageBody>
        <DashboardDemo dateFilter={computedDates} dateRange={dateRange} />
      </PageBody>

      {/* Hidden icons for PDF generation */}
      <div id="pdf-icons-cache" className="hidden" style={{ display: 'none' }}>
        <Info id="pdf-icon-info" color="#3953E7" size={24} />
        <Users id="pdf-icon-leads" color="white" size={24} />
        <User id="pdf-icon-contacts" color="white" size={24} />
        <Building id="pdf-icon-accounts" color="white" size={24} />
        <Target id="pdf-icon-opportunities" color="white" size={24} />
      </div>
    </WorkspaceCheckWrapper>
  );
}
