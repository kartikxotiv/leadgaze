'use client';

import React, { type ReactNode, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';

import { SummaryMetricCard } from '../../components/dashboard/hrms-module-primitives';
import { useRbac } from '../../components/rbac/rbac-context';
import type { ConfirmDialogProps } from '../../components/separation/ConfirmRemarkDialog';
import { SeparationDialogs } from '../../components/separation/SeparationDialogs';
import { SeparationOperationsTabs } from '../../components/separation/SeparationOperationsTabs';
import { useSeparationData } from '../../hooks/use-separation-data';
import type {
  AssetClearanceOption,
  ExitChecklistItemOption,
  ExitChecklistOption,
  ExitLetterOption,
  FnfSettlementOption,
  ResignationOption,
  SeparationDialogKey,
  SeparationItem,
} from '../../types/separation.type';
import { getSeparationMetricCards } from '../../utils/separation-metrics';
import type { SeparationTableData } from '../../utils/separation-table-rows';
import { NONE, employeeName, formatDate } from '../../utils/separation-utils';
import { separationTabDefinitions } from './page.data';

export function SeparationPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const router = useRouter();
  const { hasPermission, snapshot } = useRbac();
  const canViewResignations = hasPermission(
    'separation',
    'view_resignation',
    'own',
  );
  const canCreateResignation = hasPermission(
    'separation',
    'create_resignation',
    'own',
  );
  const canManageResignations = hasPermission(
    'separation',
    'manage_resignation',
    'team',
  );
  const canViewChecklist = hasPermission(
    'separation',
    'view_checklist',
    'team',
  );
  const canManageChecklist = hasPermission(
    'separation',
    'manage_checklist',
    'team',
  );
  const canViewAssets = hasPermission('separation', 'view_assets', 'team');
  const canManageAssets = hasPermission('separation', 'manage_assets', 'team');
  const canViewFnF = hasPermission('separation', 'view_fnf', 'team');
  const canManageFnF = hasPermission('separation', 'manage_fnf', 'team');
  const canViewLetters = hasPermission('separation', 'view_letters', 'team');
  const canManageLetters = hasPermission(
    'separation',
    'manage_letters',
    'team',
  );
  const dataOptions = useMemo(
    () => ({
      canLoadAssetClearances: canViewAssets || canManageAssets,
      canLoadChecklists: canViewChecklist || canManageChecklist,
      canLoadEmployees:
        canManageResignations ||
        canManageChecklist ||
        canManageAssets ||
        canManageFnF ||
        canManageLetters,
      canLoadExitLetters: canViewLetters || canManageLetters,
      canLoadFnfSettlements: canViewFnF || canManageFnF,
      canLoadPayrollRuns: canManageFnF,
      currentEmployeeId: snapshot?.employeeId ?? null,
    }),
    [
      canManageAssets,
      canManageChecklist,
      canManageFnF,
      canManageLetters,
      canManageResignations,
      canViewAssets,
      canViewChecklist,
      canViewFnF,
      canViewLetters,
      snapshot?.employeeId,
    ],
  );
  const {
    employees,
    noticeEmployees,
    resignations,
    exitChecklists,
    exitChecklistItems,
    assetClearances,
    fnfSettlements,
    payrollRuns,
    letters,
    currentEmployeeId,
    refresh,
  } = useSeparationData(dataOptions);
  const [openDialog, setOpenDialog] = useState<SeparationDialogKey | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogProps>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingResignation, setEditingResignation] =
    useState<ResignationOption | null>(null);
  const [editingChecklist, setEditingChecklist] =
    useState<ExitChecklistOption | null>(null);
  const [editingChecklistItem, setEditingChecklistItem] =
    useState<ExitChecklistItemOption | null>(null);
  const [editingAsset, setEditingAsset] = useState<AssetClearanceOption | null>(
    null,
  );
  const [editingFnf, setEditingFnf] = useState<FnfSettlementOption | null>(
    null,
  );
  const [editingLetter, setEditingLetter] = useState<ExitLetterOption | null>(
    null,
  );
  const filteredTabs = useMemo(
    () =>
      separationTabDefinitions.filter((tab) => {
        if (tab.key === 'resignation') {
          return (
            canViewResignations || canCreateResignation || canManageResignations
          );
        }
        if (tab.key === 'exit_checklist' || tab.key === 'employee_checklist') {
          return canViewChecklist || canManageChecklist;
        }
        if (tab.key === 'asset_clearance')
          return canViewAssets || canManageAssets;
        if (tab.key === 'fnf_settlement') return canViewFnF || canManageFnF;
        if (tab.key === 'letters') return canViewLetters || canManageLetters;
        return false;
      }),
    [
      canCreateResignation,
      canManageAssets,
      canManageChecklist,
      canManageFnF,
      canManageLetters,
      canManageResignations,
      canViewAssets,
      canViewChecklist,
      canViewFnF,
      canViewLetters,
      canViewResignations,
    ],
  );
  const defaultTabKey = filteredTabs[0]?.key ?? 'resignation';
  const [activeTab, setActiveTab] = useState(defaultTabKey);
  const selectedTabKey = filteredTabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : defaultTabKey;
  const separationCards = useMemo(
    () => getSeparationMetricCards({ resignations, exitChecklists }),
    [resignations, exitChecklists],
  );
  const resignationOptions = useMemo(
    () =>
      resignations.map((resignation) => ({
        id: resignation.id,
        label: `${employeeName(resignation.employee)} - ${formatDate(resignation.resignation_date)}`,
      })),
    [resignations],
  );
  const resignationEmployees = useMemo(() => {
    const byId = new Map<string, (typeof employees)[number]>();
    for (const employee of [...employees, ...noticeEmployees]) {
      byId.set(employee.id, employee);
    }
    return Array.from(byId.values());
  }, [employees, noticeEmployees]);
  const hasCurrentEmployeeActiveResignation = useMemo(
    () =>
      Boolean(
        currentEmployeeId &&
          resignations.some(
            (resignation) =>
              resignation.employee_id === currentEmployeeId &&
              resignation.status !== 'RETRACTED',
          ),
      ),
    [currentEmployeeId, resignations],
  );
  const tableData = useMemo<SeparationTableData>(
    () => ({
      resignations,
      exitChecklists,
      exitChecklistItems,
      assetClearances,
      fnfSettlements,
      letters,
    }),
    [
      assetClearances,
      exitChecklistItems,
      exitChecklists,
      fnfSettlements,
      letters,
      resignations,
    ],
  );
  const actionPermissions = useMemo(
    () => ({
      canManageAssets,
      canManageChecklist,
      canManageFnF,
      canManageLetters,
      canManageResignations,
    }),
    [
      canManageAssets,
      canManageChecklist,
      canManageFnF,
      canManageLetters,
      canManageResignations,
    ],
  );
  const closeDialog = () => {
    setOpenDialog(null);
    setEditingResignation(null);
    setEditingChecklist(null);
    setEditingChecklistItem(null);
    setEditingAsset(null);
    setEditingFnf(null);
    setEditingLetter(null);
  };
  const fetchResignationIdForEmployee = async (employeeId: string) => {
    const found = resignations.find(
      (resignation) =>
        resignation.employee_id === employeeId &&
        resignation.status === 'ACCEPTED',
    );

    return found?.id || NONE;
  };
  const updateStatus = async (
    path: string,
    status: string,
    remark?: string,
    successMsg?: string,
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(path, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(remark ? { remarks: remark } : {}),
        }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      toast.success(successMsg || 'Status updated successfully');
      await refresh();
      router.refresh();
      setConfirmDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };
  const deleteResignation = async (resignationId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/hrms/separation/resignations/${resignationId}`,
        {
          method: 'DELETE',
        },
      );
      const json = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok)
        throw new Error(json?.message || 'Failed to remove resignation');
      toast.success(json?.message || 'Resignation removed successfully');
      await refresh();
      router.refresh();
      setConfirmDialog(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove resignation',
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const openEditDialog = (item: SeparationItem, type: SeparationDialogKey) => {
    if (type === 'resignation')
      setEditingResignation(item as ResignationOption);
    if (type === 'exit_checklist')
      setEditingChecklistItem(item as ExitChecklistItemOption);
    if (type === 'employee_checklist')
      setEditingChecklist(item as ExitChecklistOption);
    if (type === 'asset_clearance')
      setEditingAsset(item as AssetClearanceOption);
    if (type === 'fnf_settlement') setEditingFnf(item as FnfSettlementOption);
    if (type === 'letters') setEditingLetter(item as ExitLetterOption);
    setOpenDialog(type);
  };
  const canCreateForTab = (key: string) => {
    if (key === 'resignation') {
      return (
        canCreateResignation &&
        (canManageResignations || !hasCurrentEmployeeActiveResignation)
      );
    }
    if (key === 'exit_checklist') return canManageChecklist;
    if (key === 'employee_checklist') return canManageChecklist;
    if (key === 'asset_clearance') return canManageAssets;
    if (key === 'fnf_settlement') return canManageFnF;
    if (key === 'letters') return canManageLetters;
    return false;
  };
  const activeCreateActionTab = filteredTabs.find(
    (tab) => tab.key === selectedTabKey && canCreateForTab(tab.key),
  );
  const activeCount = getSeparationTabCount(selectedTabKey, tableData);

  return (
    <section className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col overflow-hidden">
        <PageHeader
          title={`Separation (${activeCount})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} separation operations`
              : 'Separation operations'
          }
        >
          {props.headerActions}
        </PageHeader>

        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {filteredTabs.map((tab) => (
              <TableStatusMetricTab
                key={tab.key}
                id={tab.key}
                color={getSeparationTabColor(tab.key)}
                statusName={tab.label}
                count={getSeparationTabCount(tab.key, tableData)}
                isSelected={selectedTabKey === tab.key}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </div>

        {activeCreateActionTab ? (
          <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
            <ListToolBar
              actions={[
                {
                  key: 'add',
                  label:
                    activeCreateActionTab.key === 'resignation' &&
                    !canManageResignations
                      ? 'Apply Resignation'
                      : activeCreateActionTab.addLabel,
                  icon: Plus,
                  onClick: () => {
                    closeDialog();
                    setOpenDialog(activeCreateActionTab.key);
                  },
                  show: true,
                  buttonVariant: 'default',
                },
              ]}
            />
          </div>
        ) : null}
      </div>

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-3">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {separationCards.map((card) => (
              <SummaryMetricCard
                key={card.title}
                title={card.title}
                value={card.value}
                hint={card.hint}
                accent={card.accent}
              />
            ))}
          </div>

          <SeparationOperationsTabs
            tabs={filteredTabs}
            selectedTabKey={selectedTabKey}
            onTabChange={(value) => setActiveTab(value as SeparationDialogKey)}
            tableData={tableData}
            currentEmployeeId={currentEmployeeId}
            isSubmitting={isSubmitting}
            permissions={actionPermissions}
            onEdit={openEditDialog}
            onConfirmDialog={setConfirmDialog}
            onUpdateStatus={updateStatus}
            onDeleteResignation={deleteResignation}
          />
        </div>
      </PageBody>

      <SeparationDialogs
        openDialog={openDialog}
        confirmDialog={confirmDialog}
        isSubmitting={isSubmitting}
        editingResignation={editingResignation}
        editingChecklist={editingChecklist}
        editingChecklistItem={editingChecklistItem}
        editingAsset={editingAsset}
        editingFnf={editingFnf}
        editingLetter={editingLetter}
        employees={employees}
        checklistItems={exitChecklistItems}
        noticeEmployees={noticeEmployees}
        resignationEmployees={resignationEmployees}
        payrollRuns={payrollRuns}
        resignationOptions={resignationOptions}
        currentEmployeeId={currentEmployeeId}
        canManageResignations={canManageResignations}
        onClose={closeDialog}
        onSuccess={refresh}
        onCloseConfirm={() => setConfirmDialog(null)}
        fetchResignationIdForEmployee={fetchResignationIdForEmployee}
      />
    </section>
  );
}

function getSeparationTabCount(key: string, data: SeparationTableData) {
  if (key === 'resignation') {
    return data.resignations.length;
  }

  if (key === 'exit_checklist') {
    return data.exitChecklistItems.length;
  }

  if (key === 'employee_checklist') {
    return data.exitChecklists.length;
  }

  if (key === 'asset_clearance') {
    return data.assetClearances.length;
  }

  if (key === 'fnf_settlement') {
    return data.fnfSettlements.length;
  }

  if (key === 'letters') {
    return data.letters.length;
  }

  return 0;
}

function getSeparationTabColor(key: string) {
  const colors: Record<string, string> = {
    asset_clearance: '#f59e0b',
    employee_checklist: '#8b5cf6',
    exit_checklist: '#6366f1',
    fnf_settlement: '#22c55e',
    letters: '#0ea5e9',
    resignation: '#4eacff',
  };

  return colors[key] ?? '#4eacff';
}
