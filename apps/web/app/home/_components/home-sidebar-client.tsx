'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import type { JwtPayload } from '@supabase/supabase-js';

import {
  Activity,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardList,
  FileText,
  NotebookPen,
  Settings,
  ShieldCheck,
  UserPen,
  Users,
  WalletCards,
} from 'lucide-react';

import {
  getFundraiseRoutesForPermissions,
  useFundraisingPermissions,
} from '@kit/fund-raise';
import { hrmsRoutes } from '@kit/hrms';
import { NavigationConfigSchema } from '@kit/ui/navigation-schema';
import { SidebarNavigation } from '@kit/ui/shadcn-sidebar';

import pathsConfig from '~/config/paths.config';
import { usePermissionBasedNavigationConfig } from '~/lib/permissions/use-navigation-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getNavigationConfig } from '~/lib/rbac/use-dynamic-navigation';

export function HomeSidebarClient(_props: { user: JwtPayload }) {
  const { canAccess, currentWorkspace } = useRBAC();
  const pathname = usePathname() || '';
  const { canAccess: canAccessFundraising } = useFundraisingPermissions(
    currentWorkspace?.id,
  );

  // Use permission-based navigation
  const permissionNavConfig = usePermissionBasedNavigationConfig();

  const isFundraiseModule = pathname.startsWith('/home/fund');
  const isHrmsModule = pathname.startsWith('/home/hrms');

  const navConfig = useMemo(() => {
    // 1. If we are in the Fundraising Module (/home/fund*), render fundraising features.
    if (isFundraiseModule) {
      // Team / settings items should remain in all modules
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;

      return [
        ...getFundraiseRoutesForPermissions(canAccessFundraising),
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: pathsConfig.app.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: pathsConfig.app.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            ...teamItems.map((item) => {
              const IconComponent = item.Icon;
              return {
                ...item,
                Icon: <IconComponent className="h-4 w-4" />,
              };
            }),
          ],
        },
      ];
    }

    // 2. HRMS Module
    if (isHrmsModule) {
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;

      return [
        hrmsRoutes,
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: pathsConfig.app.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: pathsConfig.app.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            {
              label: 'Roles',
              path: pathsConfig.app.roles,
              Icon: <ShieldCheck className="h-4 w-4" />,
            },
            ...teamItems.map((item) => {
              const IconComponent = item.Icon;
              return {
                ...item,
                Icon: <IconComponent className="h-4 w-4" />,
              };
            }),
          ],
        },
      ];
    }

    // 3. Default: Sales CRM Module
    // Use permission-based navigation if available
    if (permissionNavConfig) {
      const { salesItems, teamItems } = permissionNavConfig;

      return [
        {
          label: '',
          children: [
            ...(salesItems.length > 0
              ? [
                  {
                    label: 'common:routes.dashboard',
                    path: pathsConfig.app.home,
                    Icon: <Activity className="h-4 w-4" />,
                    end: true,
                  },
                  ...salesItems.map((item) => {
                    const IconComponent = item.Icon;
                    return {
                      ...item,
                      Icon: <IconComponent className="h-4 w-4" />,
                    };
                  }),
                ]
              : []),
            {
              label: 'Meetings',
              path: '/home/meetings',
              Icon: <Calendar className="h-4 w-4" />,
            },
            {
              label: 'Reminders',
              path: '/home/reminders',
              Icon: <Bell className="h-4 w-4" />,
            },
            {
              label: 'Notes',
              path: '/home/notes',
              Icon: <NotebookPen className="h-4 w-4" />,
            },
            {
              label: 'Document',
              path: '/home/document',
              Icon: <FileText className="h-4 w-4" />,
            },
          ],
        },
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: pathsConfig.app.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: pathsConfig.app.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            ...(teamItems.length > 0
              ? teamItems.map((item) => {
                  const IconComponent = item.Icon;
                  return {
                    ...item,
                    Icon: <IconComponent className="h-4 w-4" />,
                  };
                })
              : []),
          ],
        },
      ];
    }

    // Fall back to RBAC-based navigation
    const { salesItems, teamItems } = getNavigationConfig(canAccess);

    return [
      {
        label: '', // Combined Sales and Communication
        children: [
          ...(salesItems.length > 0
            ? [
                {
                  label: 'common:routes.dashboard',
                  path: pathsConfig.app.home,
                  Icon: <Activity className="h-4 w-4" />,
                  end: true,
                },
                ...salesItems.map((item) => {
                  const IconComponent = item.Icon;
                  return {
                    ...item,
                    Icon: <IconComponent className="h-4 w-4" />,
                  };
                }),
              ]
            : []),
          {
            label: 'Meetings',
            path: '/home/meetings',
            Icon: <Calendar className="h-4 w-4" />,
          },
          {
            label: 'Reminders',
            path: '/home/reminders',
            Icon: <Bell className="h-4 w-4" />,
          },
          {
            label: 'Notes',
            path: '/home/notes',
            Icon: <NotebookPen className="h-4 w-4" />,
          },
          {
            label: 'Document',
            path: '/home/document',
            Icon: <FileText className="h-4 w-4" />,
          },
        ],
      },

      {
        label: 'common:routes.settings',
        children: [
          {
            label: 'common:routes.profile',
            path: pathsConfig.app.profileSettings,
            Icon: <UserPen className="h-4 w-4" />,
          },
          ...(teamItems.length > 0
            ? teamItems.map((item) => {
                const IconComponent = item.Icon;
                return {
                  ...item,
                  Icon: <IconComponent className="h-4 w-4" />,
                };
              })
            : []),
        ],
      },
    ];
  }, [
    permissionNavConfig,
    canAccess,
    isFundraiseModule,
    isHrmsModule,
    canAccessFundraising,
  ]);

  // Parse the dynamic config to match NavigationConfigSchema
  const parsedConfig = useMemo(() => {
    try {
      return NavigationConfigSchema.parse({
        routes: navConfig,
        style: 'sidebar',
        sidebarCollapsed: 'false',
        sidebarCollapsedStyle: 'icon',
      });
    } catch (error) {
      console.error('Navigation config parse error:', error);
      return {
        routes: [],
        style: 'sidebar' as const,
        sidebarCollapsed: false,
        sidebarCollapsedStyle: 'icon' as const,
      };
    }
  }, [navConfig]);

  return (
    <div className="flex h-full flex-col">
      {/* <WorkspaceSwitcher /> */}
      <div className="flex-1 overflow-y-auto">
        <SidebarNavigation config={parsedConfig} />
      </div>
    </div>
  );
}
