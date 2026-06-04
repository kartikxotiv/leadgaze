export type SeparationTabDefinition = {
  key:
    | 'resignation'
    | 'exit_checklist'
    | 'employee_checklist'
    | 'asset_clearance'
    | 'fnf_settlement'
    | 'letters';
  label: string;
  addLabel: string;
  columns: string[];
};

export const separationTabDefinitions: SeparationTabDefinition[] = [
  {
    key: 'resignation',
    label: 'Resignation management',
    addLabel: 'Add Resignation',
    columns: [
      'Employee',
      'Department',
      'Resignation date',
      'Notice period',
      'Manager review',
      'Status',
    ],
  },
  {
    key: 'exit_checklist',
    label: 'Checklist Item',
    addLabel: 'Add Checklist Item',
    columns: ['Title', 'Description'],
  },
  {
    key: 'employee_checklist',
    label: 'Employee Checklist',
    addLabel: 'Add Employee Checklist',
    columns: [
      'Employee',
      'Task Title',
      'Task Description',
      'Due date',
      'Completion',
      'Status',
    ],
  },
  {
    key: 'asset_clearance',
    label: 'Asset clearance',
    addLabel: 'Add Asset Clearance',
    columns: [
      'Employee',
      'Asset type',
      'Asset code',
      'Cleared by',
      'Return date',
      'Status',
    ],
  },
  {
    key: 'fnf_settlement',
    label: 'FnF settlement',
    addLabel: 'Add FnF Record',
    columns: ['Employee', 'Payroll period', 'Gross payable', 'Status'],
  },
  {
    key: 'letters',
    label: 'Experience / relieving letters',
    addLabel: 'Add Letter Request',
    columns: ['Employee', 'Letter type', 'Approval', 'Generated on', 'Status'],
  },
];
