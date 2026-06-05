'use client';

import type {
  AssetClearanceOption,
  EmployeeOption,
  ExitChecklistItemOption,
  ExitChecklistOption,
  ExitLetterOption,
  FnfSettlementOption,
  PayrollRunOption,
  ResignationOption,
  SeparationDialogKey,
} from '../../types/separation.type';
import { AssetClearanceDialog } from './AssetClearanceDialog';
import { ChecklistItemDialog } from './ChecklistItemDialog';
import { ConfirmDialogProps, ConfirmRemarkDialog } from './ConfirmRemarkDialog';
import { ExitChecklistDialog } from './ExitChecklistDialog';
import { ExitLetterDialog } from './ExitLetterDialog';
import { FnFSettlementDialog } from './FnFSettlementDialog';
import { ResignationDialog } from './ResignationDialog';

type ResignationSelectOption = {
  id: string;
  label: string;
};

type SeparationDialogsProps = {
  openDialog: SeparationDialogKey | null;
  confirmDialog: ConfirmDialogProps;
  isSubmitting: boolean;
  editingResignation: ResignationOption | null;
  editingChecklist: ExitChecklistOption | null;
  editingChecklistItem: ExitChecklistItemOption | null;
  editingAsset: AssetClearanceOption | null;
  editingFnf: FnfSettlementOption | null;
  editingLetter: ExitLetterOption | null;
  employees: EmployeeOption[];
  checklistItems: ExitChecklistItemOption[];
  noticeEmployees: EmployeeOption[];
  resignationEmployees: EmployeeOption[];
  payrollRuns: PayrollRunOption[];
  resignationOptions: ResignationSelectOption[];
  currentEmployeeId: string | null;
  canManageResignations: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onCloseConfirm: () => void;
  fetchResignationIdForEmployee: (employeeId: string) => Promise<string>;
};

export function SeparationDialogs({
  openDialog,
  confirmDialog,
  isSubmitting,
  editingResignation,
  editingChecklist,
  editingChecklistItem,
  editingAsset,
  editingFnf,
  editingLetter,
  employees,
  checklistItems,
  noticeEmployees,
  resignationEmployees,
  payrollRuns,
  resignationOptions,
  currentEmployeeId,
  canManageResignations,
  onClose,
  onSuccess,
  onCloseConfirm,
  fetchResignationIdForEmployee,
}: SeparationDialogsProps) {
  return (
    <>
      <ResignationDialog
        isOpen={openDialog === 'resignation'}
        onClose={onClose}
        editingResignation={editingResignation}
        employees={resignationEmployees}
        currentEmployeeId={currentEmployeeId}
        canManageResignations={canManageResignations}
        onSuccess={onSuccess}
      />
      <AssetClearanceDialog
        isOpen={openDialog === 'asset_clearance'}
        onClose={onClose}
        editingAsset={editingAsset}
        employees={noticeEmployees}
        activeEmployees={employees}
        resignationOptions={resignationOptions}
        fetchResignationIdForEmployee={fetchResignationIdForEmployee}
        onSuccess={onSuccess}
      />
      <ExitChecklistDialog
        isOpen={openDialog === 'employee_checklist'}
        onClose={onClose}
        editingChecklist={editingChecklist}
        employees={noticeEmployees}
        checklistItems={checklistItems}
        fetchResignationIdForEmployee={fetchResignationIdForEmployee}
        onSuccess={onSuccess}
      />
      <ChecklistItemDialog
        isOpen={openDialog === 'exit_checklist'}
        onClose={onClose}
        editingItem={editingChecklistItem}
        onSuccess={onSuccess}
      />
      <FnFSettlementDialog
        isOpen={openDialog === 'fnf_settlement'}
        onClose={onClose}
        editingFnf={editingFnf}
        employees={noticeEmployees}
        payrollRuns={payrollRuns}
        onSuccess={onSuccess}
      />
      <ExitLetterDialog
        isOpen={openDialog === 'letters'}
        onClose={onClose}
        editingLetter={editingLetter}
        employees={noticeEmployees}
        activeEmployees={employees}
        resignationOptions={resignationOptions}
        fetchResignationIdForEmployee={fetchResignationIdForEmployee}
        onSuccess={onSuccess}
      />
      <ConfirmRemarkDialog
        config={confirmDialog}
        onClose={onCloseConfirm}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
