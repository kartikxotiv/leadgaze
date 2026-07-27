'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { PageBody, PageHeader } from '@kit/ui/page';
import { PageHeaderActions } from '@kit/ui/page';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { DownloadReportButton } from '@kit/ui/download-report-button';

import { DashboardDemo } from '~/home/_components/dashboard-demo';
import { ModuleSwitcher } from '~/home/_components/module-switcher';
import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getDashboardMetricsService } from '~/services/dashboard.service';

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

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      
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
      doc.text(`${portalName} Dashboard Report`, 14, 22);

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
          ['Total Leads', metrics.leads.total.toString()],
          ['Contacts', metrics.contacts.total.toString()],
          ['Accounts', metrics.accounts.total.toString()],
          ['Pipeline Opportunities', metrics.opportunities.count.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [78, 172, 255] },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      // Pipeline Table
      const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 50;
      doc.text('Lead Pipeline', 14, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Stage', 'Count']],
        body: [
          ['New Leads', metrics.pipeline.newLeads.toString()],
          ['Contacted', metrics.pipeline.contacted.toString()],
          ['Qualified', metrics.pipeline.qualified.toString()],
          ['Proposal Sent', metrics.pipeline.proposalSent.toString()],
          ['Won', metrics.pipeline.won.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [62, 189, 147] },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      // Upcoming Tasks
      const finalY2 = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || finalY + 20;

      if (metrics.upcomingTasks?.length > 0) {
        if (finalY2 > 230) {
          doc.addPage();
          doc.text('Upcoming Tasks', 14, 22);
          autoTable(doc, {
            startY: 27,
            head: [['Task', 'Entity', 'Due Date']],
            body: metrics.upcomingTasks.map((t: any) => [
              t.title,
              t.entityName || '-',
              new Date(t.dueDate).toLocaleDateString(),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 11, cellPadding: 5 },
          });
        } else {
          doc.text('Upcoming Tasks', 14, finalY2 + 15);
          autoTable(doc, {
            startY: finalY2 + 20,
            head: [['Task', 'Entity', 'Due Date']],
            body: metrics.upcomingTasks.map((t: any) => [
              t.title,
              t.entityName || '-',
              new Date(t.dueDate).toLocaleDateString(),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 11, cellPadding: 5 },
          });
        }
      }

      doc.save('dashboard-report.pdf');
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
    </WorkspaceCheckWrapper>
  );
}

