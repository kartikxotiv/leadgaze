'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@kit/ui/shadcn-sidebar';
import type { SidebarConfig } from '@kit/ui/sidebar';
import { Trans } from '@kit/ui/trans';
import { cn, isRouteActive } from '@kit/ui/utils';

type RouteGroup = Extract<
  SidebarConfig['routes'][number],
  { children: unknown[] }
>;
type RouteChild = RouteGroup['children'][number];
type RouteSubChild = NonNullable<RouteChild['children']>[number];
type NavigationItem = RouteChild | RouteSubChild;

export function HomeSidebarNavigation({ config }: { config: SidebarConfig }) {
  const currentPath = usePathname() ?? '';
  const { open } = useSidebar();
  const routes = getFlatRoutes(config);

  return (
    <nav aria-label="Home navigation" className="min-h-0">
      <SidebarMenu>
        {routes.map((route) => {
          const isActive = isRouteActive(route.path, currentPath, route.end);

          return (
            <SidebarMenuItem key={route.path}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={route.label}
              >
                <Link
                  className={cn('flex items-center', {
                    'mx-auto w-full justify-center gap-0!': !open,
                  })}
                  href={route.path}
                >
                  {route.Icon}

                  <span
                    className={cn('w-auto transition-opacity duration-300', {
                      'w-0 opacity-0': !open,
                    })}
                  >
                    <Trans i18nKey={route.label} defaults={route.label} />
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}

function getFlatRoutes(config: SidebarConfig) {
  const routes: NavigationItem[] = [];

  config.routes.forEach((item) => {
    if (!('children' in item)) {
      return;
    }

    item.children.forEach((child) => {
      if (child.children?.length) {
        routes.push(...child.children);
        return;
      }

      routes.push(child);
    });
  });

  return routes;
}
