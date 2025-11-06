const roles = {
  sales_manager: 'sales_manager',
  project_manager: 'project_manager',
  marketing_manager: 'marketing_manager',
  sales_rep: 'sales_rep',
} as const;

export type Role = typeof roles[keyof typeof roles];

export default roles;