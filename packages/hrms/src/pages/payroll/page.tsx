'use client';

import { type ReactNode, useState } from 'react';

import { Plus, ShieldAlert } from 'lucide-react';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { Tabs } from '@kit/ui/tabs';

import { CreatePayrollRunDialog } from '../../components/payroll/create-payroll-run-dialog';
import { EmployeeCompensationFormDialog } from '../../components/payroll/employee-compensation-form-dialog';
import { EmployeePayItemFormDialog } from '../../components/payroll/employee-pay-item-form-dialog';
import { PayrollCompensationTab } from '../../components/payroll/payroll-compensation-tab';
import { PayrollPayItemsTab } from '../../components/payroll/payroll-pay-items-tab';
import { PayrollPayslipsTab } from '../../components/payroll/payroll-payslips-tab';
import { PayrollRunsTab } from '../../components/payroll/payroll-runs-tab';
import { PayrollSetupTab } from '../../components/payroll/payroll-setup-tab';
import { PayrollSummaryCards } from '../../components/payroll/payroll-summary-cards';
import { PayslipDetailsDialog } from '../../components/payroll/payslip-details-dialog';
import { SalaryComponentFormDialog } from '../../components/payroll/salary-component-form-dialog';
import { SalaryStructureComponentsDialog } from '../../components/payroll/salary-structure-components-dialog';
import { SalaryStructureFormDialog } from '../../components/payroll/salary-structure-form-dialog';
import { useRbac } from '../../components/rbac/rbac-context';
import { usePayrollPage } from '../../hooks/use-payroll-page';

type PayrollTab = 'compensation' | 'pay-items' | 'payslips' | 'runs' | 'setup';

const payrollTabs: Array<{ label: string; value: PayrollTab }> = [
  { label: 'Setup', value: 'setup' },
  { label: 'Compensation', value: 'compensation' },
  { label: 'Pay Items', value: 'pay-items' },
  { label: 'Payroll Runs', value: 'runs' },
  { label: 'Generated Payslips', value: 'payslips' },
];

export function PayrollPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const page = usePayrollPage();
  const { hasPermission, isLoading: isRbacLoading } = useRbac();
  const [activeTab, setActiveTab] = useState<PayrollTab>('setup');

  const canView = hasPermission('payroll', 'view', 'own');
  const canProcess = hasPermission('payroll', 'process', 'team');
  const canEdit = hasPermission('payroll', 'edit', 'team');
  const canApprove = hasPermission('payroll', 'approve', 'team');
  const activeCount = getPayrollTabCount(activeTab, page);

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Payroll (${activeCount})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} payroll operations`
              : 'Workspace payroll operations'
          }
        >
          {props.headerActions}
        </PageHeader>
        </div>

        {!isRbacLoading && canView ? (
          <>
            <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {payrollTabs.map((tab) => (
                  <TableStatusMetricTab
                    key={tab.value}
                    id={tab.value}
                    color={getPayrollTabColor(tab.value)}
                    statusName={tab.label}
                    count={getPayrollTabCount(tab.value, page)}
                    isSelected={activeTab === tab.value}
                    onClick={() => setActiveTab(tab.value)}
                  />
                ))}
              </div>
            </div>

            {canProcess ? (
              <div className="w-full max-w-full min-w-0 shrink-0 border-b">
                <ListToolBar
                  actions={[
                    {
                      key: 'run',
                      label: 'Create Run',
                      icon: Plus,
                      onClick: () => page.setIsCreateRunDialogOpen(true),
                      show: true,
                      buttonVariant: 'default',
                    },
                  ]}
                />
              </div>
            ) : null}
          </>
        ) : null}
      

      <PageBody className="sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 overflow-y-auto">
          {!isRbacLoading && !canView ? (
            <CardWidgetContainer
              title="Payroll access is restricted"
              desc="Ask an administrator to grant payroll permissions for your role."
              contentClassName="hidden"
              icon2={<ShieldAlert className="text-leadgaze-muted h-5 w-5" />}
            >
              <div />
            </CardWidgetContainer>
          ) : page.dashboardQuery.isLoading || isRbacLoading ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-[440px] rounded-xl" />
            </>
          ) : page.dashboardQuery.isError ? (
            <CardWidgetContainer
              title="Unable to load payroll"
              desc={
                (page.dashboardQuery.error as Error)?.message ??
                'Something went wrong while loading payroll.'
              }
              contentClassName="hidden"
            >
              <div />
            </CardWidgetContainer>
          ) : (
            <>
              <PayrollSummaryCards items={page.metricsItems} />

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as PayrollTab)}
              >
                <PayrollSetupTab
                  salaryComponents={page.componentsQuery.data?.data ?? []}
                  salaryStructures={page.dashboardData?.salaryStructures ?? []}
                  onCreateComponent={() => {
                    page.setEditingComponent(null);
                    page.setIsCreateComponentDialogOpen(true);
                  }}
                  onCreateStructure={() => {
                    page.setEditingStructure(null);
                    page.setIsCreateStructureDialogOpen(true);
                  }}
                  onConfigureStructure={page.handleOpenConfig}
                  onEditComponent={(component) => {
                    page.setEditingComponent(component);
                    page.setIsCreateComponentDialogOpen(true);
                  }}
                  onDeleteComponent={(id) =>
                    page.deleteComponentMutation.mutate(id)
                  }
                  onEditStructure={(structure) => {
                    page.setEditingStructure(structure);
                    page.setIsCreateStructureDialogOpen(true);
                  }}
                  onDeleteStructure={(id) =>
                    page.deleteStructureMutation.mutate(id)
                  }
                  canEdit={canEdit}
                />

                <PayrollCompensationTab
                  employeeAssignments={
                    page.dashboardData?.employeeAssignments ?? []
                  }
                  onCreateAssignment={() => {
                    page.setEditingAssignment(null);
                    page.setIsCreateCompensationDialogOpen(true);
                  }}
                  onEditAssignment={(assignment) => {
                    page.setEditingAssignment(assignment);
                    page.setIsCreateCompensationDialogOpen(true);
                  }}
                  onDeleteAssignment={(id) =>
                    page.deleteAssignmentMutation.mutate(id)
                  }
                  canEdit={canEdit}
                />

                <PayrollPayItemsTab
                  payItems={page.dashboardData?.payItems ?? []}
                  onCreateItem={() => {
                    page.setEditingPayItem(null);
                    page.setIsPayItemDialogOpen(true);
                  }}
                  onEditItem={(item) => {
                    page.setEditingPayItem(item);
                    page.setIsPayItemDialogOpen(true);
                  }}
                  onDeleteItem={(id) => page.deletePayItemMutation.mutate(id)}
                  canEdit={canEdit}
                />

                <PayrollRunsTab
                  payrollRuns={page.dashboardData?.payrollRuns ?? []}
                  onApproveRun={page.handleApproveRun}
                  canApprove={canApprove}
                />

                <PayrollPayslipsTab
                  onViewDetails={(payslip) => {
                    page.setSelectedPayslip(payslip);
                    page.setIsPayslipDetailsDialogOpen(true);
                  }}
                />
              </Tabs>
            </>
          )}
        </div>
      </PageBody>

      <SalaryStructureFormDialog
        open={page.isCreateStructureDialogOpen}
        onOpenChange={page.setIsCreateStructureDialogOpen}
        initialData={page.editingStructure}
      />
      <SalaryComponentFormDialog
        open={page.isCreateComponentDialogOpen}
        onOpenChange={page.setIsCreateComponentDialogOpen}
        initialData={page.editingComponent}
      />
      <EmployeeCompensationFormDialog
        open={page.isCreateCompensationDialogOpen}
        onOpenChange={page.setIsCreateCompensationDialogOpen}
        initialData={page.editingAssignment}
      />
      <EmployeePayItemFormDialog
        open={page.isPayItemDialogOpen}
        onOpenChange={page.setIsPayItemDialogOpen}
        initialData={page.editingPayItem}
      />
      <PayslipDetailsDialog
        open={page.isPayslipDetailsDialogOpen}
        onOpenChange={page.setIsPayslipDetailsDialogOpen}
        payslip={page.selectedPayslip}
      />
      <SalaryStructureComponentsDialog
        open={page.isStructureConfigDialogOpen}
        onOpenChange={page.setIsStructureConfigDialogOpen}
        structure={page.selectedStructure}
      />
      <CreatePayrollRunDialog
        open={page.isCreateRunDialogOpen}
        onOpenChange={page.setIsCreateRunDialogOpen}
        form={page.createRunForm}
        onFormChange={(field, value) =>
          page.setCreateRunForm((current) => ({ ...current, [field]: value }))
        }
        onSubmit={page.handleCreateRun}
        isPending={page.createRunMutation.isPending}
      />
    </>
  );
}

function getPayrollTabCount(
  tab: PayrollTab,
  page: ReturnType<typeof usePayrollPage>,
) {
  if (tab === 'setup') {
    return (
      (page.componentsQuery.data?.data.length ?? 0) +
      (page.dashboardData?.salaryStructures.length ?? 0)
    );
  }

  if (tab === 'compensation') {
    return page.dashboardData?.employeeAssignments.length ?? 0;
  }

  if (tab === 'pay-items') {
    return page.dashboardData?.payItems.length ?? 0;
  }

  if (tab === 'runs') {
    return page.dashboardData?.payrollRuns.length ?? 0;
  }

  return page.dashboardData?.payslipSnapshots.length ?? 0;
}

function getPayrollTabColor(tab: PayrollTab) {
  const colors = {
    compensation: '#22c55e',
    'pay-items': '#f59e0b',
    payslips: '#8b5cf6',
    runs: '#6366f1',
    setup: '#4eacff',
  } as const;

  return colors[tab];
}
