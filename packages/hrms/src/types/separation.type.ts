import type { SeparationTabDefinition } from '../pages/separation/page.data';

export type SeparationDialogKey = SeparationTabDefinition['key'];

export type EmployeeOption = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
  designation?: string | null;
};

export type ResignationOption = {
  id: string;
  employee_id: string;
  resignation_date: string;
  last_working_day: string | null;
  notice_period_days: number | null;
  notice_waiver_days: number | null;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'RETRACTED';
  remarks: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  employee?: EmployeeOption | null;
  accepted_by_employee?: EmployeeOption | null;
};

export type ExitChecklistOption = {
  id: string;
  employee_id: string;
  resignation_id: string | null;
  checklist_item_id: string | null;
  task_name: string;
  task_category: 'IT' | 'ADMIN' | 'HR' | 'FINANCE';
  owner_employee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  description: string | null;
  remarks: string | null;
  employee?: EmployeeOption | null;
  owner?: EmployeeOption | null;
  checklist_item?: ExitChecklistItemOption | null;
};

export type ExitChecklistItemOption = {
  id: string;
  workspace_id?: string;
  organization_id?: string;
  title: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AssetClearanceOption = {
  id: string;
  employee_id: string;
  resignation_id: string | null;
  asset_name: string;
  asset_tag: string | null;
  issued_date: string | null;
  returned_date: string | null;
  condition_at_return: 'PENDING' | 'GOOD' | 'DAMAGED' | 'LOST';
  remarks: string | null;
  status: 'PENDING' | 'RETURNED' | 'WAIVED';
  cleared_by: string | null;
  cleared_at: string | null;
  employee?: EmployeeOption | null;
  cleared_by_employee?: EmployeeOption | null;
};

export type FnfSettlementOption = {
  id: string;
  employee_id: string;
  payroll_run_id: string | null;
  last_working_day: string;
  components: unknown[];
  leave_encashment: number;
  gratuity: number;
  notice_recovery: number;
  total_payable: number;
  tds_on_fnf: number;
  net_payable: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';
  settlement_date: string | null;
  remarks?: string | null;
  employee?: EmployeeOption | null;
};

export type PayrollRunOption = {
  id: string;
  name?: string | null;
  period?: string | null;
};

export type ExitLetterOption = {
  id: string;
  employee_id: string;
  resignation_id: string | null;
  letter_type: 'RELIEVING' | 'EXPERIENCE';
  issued_by: string | null;
  issued_at: string | null;
  letter_number: string | null;
  letter_url: string | null;
  remarks: string | null;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  employee?: EmployeeOption | null;
  issued_by_employee?: EmployeeOption | null;
};

export type SeparationItem =
  | ResignationOption
  | ExitChecklistItemOption
  | ExitChecklistOption
  | AssetClearanceOption
  | FnfSettlementOption
  | ExitLetterOption;

export type SeparationTableRow = {
  id: string;
  raw: SeparationItem;
  cells: string[];
};

export type ApiResponse<T> = {
  data?: T;
  message?: string;
};
