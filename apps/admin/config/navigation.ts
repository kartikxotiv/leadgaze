import type { NavigationItem } from '@kit/ui/navigation-types';

export const adminNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    end: true,
  },
  {
    label: 'Workspace',
    path: '/workspaces',
  },
  {
    label: 'Subscriptions',
    path: '/subscriptions',
  },
  {
    label: 'Modules',
    path: '/modules',
  },
  {
    label: 'Users',
    path: '/users',
  },
  {
    label: 'Support',
    path: '/support',
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
  },
  {
    label: 'System',
    path: '/system',
  },
];
