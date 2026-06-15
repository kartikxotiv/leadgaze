export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  error?: string | null;
  data: T;
};

export type PayrollDashboardMetrics = {
  activeAssignments: number;
  openPayItems: number;
  currentRunWindow: string;
  publishedPayslips: number;
};

export type PayrollSalaryStructureSummary = {
  id: string;
  name: string;
  description?: string | null;
  currency_code: string;
  is_active: boolean;
};

export type PayrollEmployeeAssignmentSummary = {
  id: string;
  employee_id: string;
  salary_structure_id?: string | null;
  employee: string;
  assignment: string;
  assignment_type: string;
  pay_frequency: string;
  annual_ctc?: number | null;
  monthly_gross?: number | null;
  effective_from: string;
  effective_to?: string | null;
  notes?: string | null;
  period: string;
  status: string;
};

export type PayrollPayItemSummary = {
  id: string;
  employee_id: string;
  salary_component_id: string;
  employee: string;
  item: string;
  amount: number;
  effective_date: string;
  notes?: string | null;
  payable: string;
  status: string;
};

export type PayrollRunEntryItemSummary = {
  id: string;
  component: string;
  type: string;
  source: string;
  amount: number;
  isEmployerSide: boolean;
};

export type PayrollRunEntryBreakdown = {
  id: string;
  employee: string;
  earnings: number;
  deductions: number;
  net: number;
  status: string;
  items: PayrollRunEntryItemSummary[];
};

export type PayrollRunSummary = {
  id: string;
  name?: string | null;
  period_start: string;
  period_end: string;
  payment_date?: string | null;
  period: string;
  dates: string;
  assignments: number;
  entries: number;
  payout: number;
  grossEarnings: number;
  totalDeductions: number;
  status: string;
  breakdown: PayrollRunEntryBreakdown[];
};

export type PayrollEntrySummary = {
  employee: string;
  earnings: number;
  deductions: number;
  net: number;
  status: string;
};

export type PayslipSnapshotSummary = {
  employee: string;
  run: string;
  gross: number;
  deductions: number;
  net: number;
  status: string;
};

export type PayrollDashboardResponse = {
  metrics: PayrollDashboardMetrics;
  salaryStructures: PayrollSalaryStructureSummary[];
  employeeAssignments: PayrollEmployeeAssignmentSummary[];
  payItems: PayrollPayItemSummary[];
  payrollRuns: PayrollRunSummary[];
  payrollEntries: PayrollEntrySummary[];
  payslipSnapshots: PayslipSnapshotSummary[];
};

export type PayrollRunCreatePayload = {
  name?: string;
  period_start: string;
  period_end: string;
  payment_date?: string | null;
};
