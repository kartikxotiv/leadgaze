import type { NavigationItem } from '@kit/ui/navigation-types';

export const adminNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    end: true,
  },
  {
    label: 'Organization',
    path: '/organization',
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
