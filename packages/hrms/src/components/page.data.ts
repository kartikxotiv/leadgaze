export const dataModelNotes = [
  {
    label: 'Recurring salary',
    value: 'Assignments + assignment components',
    hint: 'Use these for fixed monthly compensation that stays valid across a date range.',
  },
  {
    label: 'One-time money movement',
    value: 'Employee pay items',
    hint: 'Use these for bonus, arrears, reimbursements, recoveries, and manual adjustments.',
  },
  {
    label: 'Payroll workspace',
    value: 'Runs + entries + entry items',
    hint: 'This is where the period-specific computation happens before publishing.',
  },
  {
    label: 'Historical truth',
    value: 'Payslips + payslip components',
    hint: 'Frozen copies of the payroll result keep historical payroll stable.',
  },
] as const;
