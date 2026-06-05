'use client';

import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@kit/ui/tabs';

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

export function PayrollPage() {
  const page = usePayrollPage();
  const { hasPermission, isLoading: isRbacLoading } = useRbac();

  const canView = hasPermission('payroll', 'view', 'own');
  const canProcess = hasPermission('payroll', 'process', 'team');
  const canEdit = hasPermission('payroll', 'edit', 'team');
  const canApprove = hasPermission('payroll', 'approve', 'team');

  if (!isRbacLoading && !canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll access is restricted</CardTitle>
          <CardDescription>
            Ask an administrator to grant payroll permissions for your role.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (page.dashboardQuery.isLoading || isRbacLoading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[440px] rounded-xl" />
      </section>
    );
  }

  if (page.dashboardQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load payroll</CardTitle>
          <CardDescription>
            {(page.dashboardQuery.error as Error)?.message ??
              'Something went wrong while loading payroll.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canProcess ? (
          <Button size="sm" onClick={() => page.setIsCreateRunDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Run
          </Button>
        ) : null}
      </div>

      <PayrollSummaryCards items={page.metricsItems} />

      <Tabs defaultValue="setup">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="pay-items">Pay Items</TabsTrigger>
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="payslips">Generated Payslips</TabsTrigger>
        </TabsList>

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
          onDeleteComponent={(id) => page.deleteComponentMutation.mutate(id)}
          onEditStructure={(structure) => {
            page.setEditingStructure(structure);
            page.setIsCreateStructureDialogOpen(true);
          }}
          onDeleteStructure={(id) => page.deleteStructureMutation.mutate(id)}
          canEdit={canEdit}
        />

        <PayrollCompensationTab
          employeeAssignments={page.dashboardData?.employeeAssignments ?? []}
          onCreateAssignment={() => {
            page.setEditingAssignment(null);
            page.setIsCreateCompensationDialogOpen(true);
          }}
          onEditAssignment={(assignment) => {
            page.setEditingAssignment(assignment);
            page.setIsCreateCompensationDialogOpen(true);
          }}
          onDeleteAssignment={(id) => page.deleteAssignmentMutation.mutate(id)}
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
    </section>
  );
}
