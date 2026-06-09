'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import type { JwtPayload } from '@supabase/supabase-js';

import {
  Activity,
  Bell,
  Calendar,
  FileText,
  NotebookPen,
  Settings,
  ShieldCheck,
  Ticket,
  UserPen,
} from 'lucide-react';

import {
  getFundraiseRoutesForPermissions,
  useFundraisingPermissions,
} from '@kit/fund-raise';
import { hrmsRoutes } from '@kit/hrms';
import {
  getInventoryRoutesForPermissions,
  useInventoryPermissions,
} from '@kit/inventory';
import {
  getServiceCloudRoutesForPermissions,
  useServiceCloudPermissions,
} from '@kit/service-cloud';
import { NavigationConfigSchema } from '@kit/ui/navigation-schema';
import { SidebarNavigation } from '@kit/ui/shadcn-sidebar';

import pathsConfig from '~/config/paths.config';
import { usePermissionBasedNavigationConfig } from '~/lib/permissions/use-navigation-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getNavigationConfig } from '~/lib/rbac/use-dynamic-navigation';

function getModuleCommonPaths(moduleBasePath: string) {
  return {
    profileSettings: `${moduleBasePath}/profile-settings`,
    workspaceSettings: `${moduleBasePath}/workspace-settings`,
    teamMembers: `${moduleBasePath}/team-members`,
    teams:
      moduleBasePath === '/home/services'
        ? `${moduleBasePath}/workspace-teams`
        : `${moduleBasePath}/teams`,
    roles: `${moduleBasePath}/roles`,
    auditLogs: `${moduleBasePath}/audit-logs`,
  };
}

function scopeCommonItems<T extends { path?: string }>(
  items: T[],
  moduleBasePath: string,
) {
  const paths = getModuleCommonPaths(moduleBasePath);

  return items.map((item) => {
    if (item.path === pathsConfig.app.profileSettings) {
      return {
        ...item,
        path: paths.profileSettings,
      };
    }

    if (item.path === pathsConfig.app.teamMembers) {
      return {
        ...item,
        path: paths.teamMembers,
      };
    }

    if (item.path === pathsConfig.app.teams) {
      return {
        ...item,
        path: paths.teams,
      };
    }

    if (item.path === pathsConfig.app.roles) {
      return {
        ...item,
        path: paths.roles,
      };
    }

    if (item.path === pathsConfig.app.auditLogs) {
      return {
        ...item,
        path: paths.auditLogs,
      };
    }

    if (item.path === pathsConfig.app.workspaceSettings) {
      return {
        ...item,
        path: paths.workspaceSettings,
      };
    }

    return item;
  });
}

export function HomeSidebarClient(_props: { user: JwtPayload }) {
  const { canAccess, currentWorkspace } = useRBAC();
  const pathname = usePathname() || '';
  const { canAccess: canAccessFundraising } = useFundraisingPermissions(
    currentWorkspace?.id,
  );
  const { canAccess: canAccessInventory } = useInventoryPermissions(
    currentWorkspace?.id,
  );
  const { canAccess: canAccessServiceCloud } = useServiceCloudPermissions(
    currentWorkspace?.id,
  );

  // Use permission-based navigation
  const permissionNavConfig = usePermissionBasedNavigationConfig();

  const isFundraiseModule = pathname.startsWith('/home/fund');
  const isHrmsModule = pathname.startsWith('/home/hrms');
  const isInventoryModule = pathname.startsWith('/home/inventory');
  const isServiceCloudModule = pathname.startsWith('/home/services');

  const navConfig = useMemo(() => {
    // 1. If we are in the Fundraising Module (/home/fund*), render fundraising features.
    if (isFundraiseModule) {
      const commonPaths = getModuleCommonPaths('/home/funds');
      // Team / settings items should remain in all modules
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/funds');

      return [
        ...getFundraiseRoutesForPermissions(canAccessFundraising),
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: commonPaths.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: commonPaths.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            ...scopedTeamItems.map((item) => {
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
      const commonPaths = getModuleCommonPaths('/home/hrms');
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/hrms');

      return [
        hrmsRoutes,
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: commonPaths.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: commonPaths.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            {
              label: 'Roles',
              path: commonPaths.roles,
              Icon: <ShieldCheck className="h-4 w-4" />,
            },
            ...scopedTeamItems.map((item) => {
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

    // 3. Inventory Module
    if (isInventoryModule) {
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/inventory');
      const commonPaths = getModuleCommonPaths('/home/inventory');

      return [
        ...getInventoryRoutesForPermissions(canAccessInventory),
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: commonPaths.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: commonPaths.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            ...scopedTeamItems.map((item) => {
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

    // 4. Service Cloud Module
    if (isServiceCloudModule) {
      const commonPaths = getModuleCommonPaths('/home/services');
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/services');

      return [
        ...getServiceCloudRoutesForPermissions(canAccessServiceCloud),
        {
          label: 'common:routes.settings',
          children: [
            {
              label: 'common:routes.profile',
              path: commonPaths.profileSettings,
              Icon: <UserPen className="h-4 w-4" />,
            },
            {
              label: 'common:routes.workspace-settings',
              path: commonPaths.workspaceSettings,
              Icon: <Settings className="h-4 w-4" />,
            },
            ...scopedTeamItems.map((item) => {
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
              path: '/home/sales/meetings',
              Icon: <Calendar className="h-4 w-4" />,
            },
            {
              label: 'Reminders',
              path: '/home/sales/reminders',
              Icon: <Bell className="h-4 w-4" />,
            },
            {
              label: 'Notes',
              path: '/home/sales/notes',
              Icon: <NotebookPen className="h-4 w-4" />,
            },
            {
              label: 'Document',
              path: '/home/sales/document',
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
  }, [
    permissionNavConfig,
    canAccess,
    isFundraiseModule,
    isHrmsModule,
    isInventoryModule,
    isServiceCloudModule,
    canAccessFundraising,
    canAccessInventory,
    canAccessServiceCloud,
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
