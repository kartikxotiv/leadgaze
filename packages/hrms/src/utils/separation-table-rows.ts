import type {
  AssetClearanceOption,
  ExitChecklistItemOption,
  ExitChecklistOption,
  ExitLetterOption,
  FnfSettlementOption,
  ResignationOption,
  SeparationTableRow,
} from '../types/separation.type';
import {
  employeeName,
  formatCurrency,
  formatDate,
  startCase,
} from './separation-utils';

export type SeparationTableData = {
  resignations: ResignationOption[];
  exitChecklists: ExitChecklistOption[];
  exitChecklistItems: ExitChecklistItemOption[];
  assetClearances: AssetClearanceOption[];
  fnfSettlements: FnfSettlementOption[];
  letters: ExitLetterOption[];
};

function formatResignationStatus(status: ResignationOption['status']) {
  return status === 'RETRACTED' ? 'Rejected' : startCase(status);
}

export function getSeparationTableRows(
  key: string,
  data: SeparationTableData,
): SeparationTableRow[] {
  switch (key) {
    case 'resignation':
      return data.resignations.map((resignation) => ({
        id: resignation.id,
        raw: resignation,
        cells: [
          employeeName(resignation.employee),
          '-',
          formatDate(resignation.resignation_date),
          `${resignation.notice_period_days ?? 0} days`,
          resignation.accepted_by_employee ? 'Completed' : 'Pending',
          formatResignationStatus(resignation.status),
        ],
      }));
    case 'exit_checklist':
      return data.exitChecklistItems.map((item) => ({
        id: item.id,
        raw: item,
        cells: [item.title, item.description ?? '-'],
      }));
    case 'employee_checklist':
      return data.exitChecklists.map((checklist) => ({
        id: checklist.id,
        raw: checklist,
        cells: [
          employeeName(checklist.employee),
          checklist.task_name,
          checklist.description ?? '-',
          formatDate(checklist.due_date),
          checklist.completed_at ? 'Done' : 'Pending',
          checklist.completed_at ? 'Completed' : 'Pending',
        ],
      }));
    case 'asset_clearance':
      return data.assetClearances.map((clearance) => ({
        id: clearance.id,
        raw: clearance,
        cells: [
          employeeName(clearance.employee),
          clearance.asset_name,
          clearance.asset_tag ?? '-',
          employeeName(clearance.cleared_by_employee),
          formatDate(clearance.returned_date),
          startCase(clearance.status),
        ],
      }));
    case 'fnf_settlement':
      return data.fnfSettlements.map((settlement) => ({
        id: settlement.id,
        raw: settlement,
        cells: [
          employeeName(settlement.employee),
          settlement.payroll_run_id
            ? settlement.payroll_run_id.slice(0, 8)
            : '-',
          formatCurrency(settlement.total_payable),
          startCase(settlement.status),
        ],
      }));
    case 'letters':
      return data.letters.map((letter) => ({
        id: letter.id,
        raw: letter,
        cells: [
          employeeName(letter.employee),
          startCase(letter.letter_type),
          letter.status === 'ISSUED' ? 'Approved' : 'Pending',
          formatDate(letter.issued_at),
          startCase(letter.status),
        ],
      }));
    default:
      return [];
  }
}
