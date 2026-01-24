'use client';

import type { JwtPayload } from '@supabase/supabase-js';
import { Activity, Settings } from 'lucide-react';
import { SidebarNavigation } from '@kit/ui/shadcn-sidebar';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getNavigationConfig } from '~/lib/rbac/use-dynamic-navigation';
import { WorkspaceSwitcher } from './workspace-switcher';
import { useMemo } from 'react';
import pathsConfig from '~/config/paths.config';
import { z } from 'zod';
import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

export function HomeSidebarClient(props: {
  user: JwtPayload;
}) {
  const { canAccess } = useRBAC();
  
  const navConfig = useMemo(() => {
    const { salesItems, teamItems } = getNavigationConfig(canAccess);
    
    // Build navigation with JSX in render context
    // Always show Sales and Team sections since permissions are set up
    return [
      {
        label: 'common:routes.application',
        children: [
          {
            label: 'common:routes.home',
            path: pathsConfig.app.home,
            Icon: <Activity className="w-4 h-4" />,
            end: true,
          },
        ],
      },
      {
        label: 'Sales',
        children: salesItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="w-4 h-4" />,
          };
        }),
      },
      {
        label: 'Team',
        children: teamItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="w-4 h-4" />,
          };
        }),
      },
      {
        label: 'common:routes.settings',
        children: [
          {
            label: 'common:routes.profile',
            path: pathsConfig.app.profileSettings,
            Icon: <Settings className="w-4 h-4" />,
          },
        ],
      },
    ];
  }, [canAccess]);
  
  // Parse the dynamic config to match NavigationConfigSchema
  const parsedConfig = useMemo(() => {
    try {
      return NavigationConfigSchema.parse({
        routes: navConfig,
        style: 'sidebar',
        sidebarCollapsed: 'false',
      });
    } catch (error) {
      console.error('Navigation config parse error:', error);
      return {
        routes: [],
        style: 'sidebar' as const,
        sidebarCollapsed: 'false',
      };
    }
  }, [navConfig]);

  return (
    <div className="flex flex-col h-full">
      <WorkspaceSwitcher />
      <div className="flex-1 overflow-y-auto">
        <SidebarNavigation config={parsedConfig} />
      </div>
    </div>
  );
}
