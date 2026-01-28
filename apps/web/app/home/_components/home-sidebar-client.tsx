'use client';

import { useMemo } from 'react';

import type { JwtPayload } from '@supabase/supabase-js';

import { Activity, Settings } from 'lucide-react';
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
    const baseRoutes = [
      {
        label: 'common:routes.application',
        children: [
          {
            label: 'common:routes.home',
            path: pathsConfig.app.home,
            Icon: <Activity className="h-4 w-4" />,
            end: true,
          },
        ],
      },
    ];

    const settingsRoutes = [
      {
        label: 'common:routes.settings',
        children: [
          {
            label: 'common:routes.profile',
            path: pathsConfig.app.profileSettings,
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
        ...(salesItems.length > 0
          ? [
              {
                label: 'Sales',
                children: salesItems.map((item) => {
                  const IconComponent = item.Icon;
                  return {
                    ...item,
                    Icon: <IconComponent className="h-4 w-4" />,
                  };
                }),
              },
            ]
          : []),
        ...(teamItems.length > 0
          ? [
              {
                label: 'Team',
                children: teamItems.map((item) => {
                  const IconComponent = item.Icon;
                  return {
                    ...item,
                    Icon: <IconComponent className="h-4 w-4" />,
                  };
                }),
              },
            ]
          : []),
        ...settingsRoutes,
      ];
    }

    // Fall back to RBAC-based navigation
    const { salesItems, teamItems } = getNavigationConfig(canAccess);

    return [
      ...baseRoutes,
      ...(salesItems.length > 0
        ? [
            {
              label: 'Sales',
              children: salesItems.map((item) => {
                const IconComponent = item.Icon;
                return {
                  ...item,
                  Icon: <IconComponent className="h-4 w-4" />,
                };
              }),
            },
          ]
        : []),
      ...(teamItems.length > 0
        ? [
            {
              label: 'Team',
              children: teamItems.map((item) => {
                const IconComponent = item.Icon;
                return {
                  ...item,
                  Icon: <IconComponent className="h-4 w-4" />,
                };
              }),
            },
          ]
        : []),
      ...settingsRoutes,
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
      <WorkspaceSwitcher />
      <div className="flex-1 overflow-y-auto">
        <SidebarNavigation config={parsedConfig} />
      </div>
    </div>
  );
}
