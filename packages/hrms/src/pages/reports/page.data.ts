export const REPORT_TABS = [
  {
    value: 'attendance',
    label: 'Attendance',
    description:
      'Daily and monthly attendance, late coming, early going, overtime, and shift-wise reports.',
  },
  {
    value: 'leave',
    label: 'Leave',
    description:
      'Leave balances, utilization, trend analysis, and department-wise leave reports.',
  },
  {
    value: 'payroll',
    label: 'Payroll',
    description:
      'Payroll summary, salary component breakdown, department cost, overtime payout, and arrears/bonus reports.',
  },
  {
    value: 'custom',
    label: 'Custom',
    description:
      'Cross-module workforce snapshot based on the selected employees and filters.',
  },
] as const;

export type ReportsTabValue = (typeof REPORT_TABS)[number]['value'];
