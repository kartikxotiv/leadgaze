'use client';

import { useMemo } from 'react';

import type { JwtPayload } from '@supabase/supabase-js';

import {
  Activity,
  Bell,
  Calendar,
  FileText,
  NotebookPen,
  Settings,
  UserPen,
} from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';
import { SidebarNavigation } from '@kit/ui/shadcn-sidebar';

import pathsConfig from '~/config/paths.config';
import { usePermissionBasedNavigationConfig } from '~/lib/permissions/use-navigation-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getNavigationConfig } from '~/lib/rbac/use-dynamic-navigation';

import { WorkspaceSwitcher } from './workspace-switcher';

export function HomeSidebarClient(props: { user: JwtPayload }) {
  const { canAccess } = useRBAC();

  // Use permission-based navigation
  const permissionNavConfig = usePermissionBasedNavigationConfig();

  const navConfig = useMemo(() => {
    // Basic routes that always exist
    const baseRoutes: any[] = [];

    const settingsRoutes = [
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
        ],
      },
    ];

    // Use permission-based navigation if available
    if (permissionNavConfig) {
      const { salesItems, teamItems } = permissionNavConfig;

      return [
        ...baseRoutes,
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
      ...baseRoutes,
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
  }, [permissionNavConfig, canAccess]);

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
