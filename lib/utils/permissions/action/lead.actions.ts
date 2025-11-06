import roles from '../roles';

const leadActions = {
  createLead: ['sales_manager', 'project_manager'],
} as const;

export type LeadFeature = keyof typeof leadActions;
export type LeadFeatureRoleMap = typeof leadActions[LeadFeature];

export {
  leadActions,
}