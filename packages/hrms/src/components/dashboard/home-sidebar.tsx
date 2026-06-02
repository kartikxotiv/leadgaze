import type { JwtPayload } from '@supabase/supabase-js';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@kit/ui/shadcn-sidebar';
import { cn } from '@kit/ui/utils';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { navigationConfig } from '~/config/navigation.config';
import { Tables } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { getRbacSnapshot } from '~/lib/server/rbac';

import { HomeSidebarNavigation } from './home-sidebar-navigation';

export async function HomeSidebar(props: {
  account?: Tables<'accounts'>;
  user: JwtPayload;
}) {
  const displayName = getDisplayName(props.user);
  const initials = getInitials(displayName);

  const organizationId = await getCurrentUserOrganizationId(props.user.id);
  const snapshot = organizationId
    ? await getRbacSnapshot({
        accountId: props.user.id,
        organizationId,
      })
    : null;

  const roleLabel = snapshot?.roleKeys?.length
    ? snapshot.roleKeys
        .map((k) => k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' '))
        .join(', ')
    : 'Employee';

  const filteredNavigationConfig = snapshot
    ? filterNavigationConfigByModules(navigationConfig, snapshot.allowedModules)
    : navigationConfig;

  return (
    <Sidebar
      collapsible={'none'}
      className="border-sidebar-border h-screen max-h-screen overflow-hidden border-r"
    >
      <SidebarHeader className={'border-sidebar-border shrink-0 border-b p-4'}>
        <div className={'space-y-2'}>
          <AppLogo variant="full" className="w-[118px]" />

          <p className={'text-muted-foreground truncate text-xs'}>
            Manage your team
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <HomeSidebarNavigation config={filteredNavigationConfig} />
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border shrink-0 border-t p-3">
        <ProfileAccountDropdownContainer
          user={props.user}
          account={props.account}
        >
          <div
            role="button"
            className={cn(
              'bg-secondary/50 hover:bg-secondary flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors group-data-[minimized=true]:mx-auto group-data-[minimized=true]:size-9 group-data-[minimized=true]:justify-center group-data-[minimized=true]:gap-0 group-data-[minimized=true]:p-0',
            )}
          >
            <div
              className={
                'bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white dark:bg-white dark:text-black'
              }
            >
              {initials}
            </div>

            <div
              className={'min-w-0 flex-1 group-data-[minimized=true]:hidden'}
            >
              <p className={'truncate text-sm font-medium'}>{displayName}</p>
              <p className={'text-muted-foreground truncate text-xs'}>
                {roleLabel}
              </p>
            </div>
          </div>
        </ProfileAccountDropdownContainer>
      </SidebarFooter>
    </Sidebar>
  );
}

type NavigationRoute = (typeof navigationConfig.routes)[number];
type NavigationGroup = Extract<NavigationRoute, { children: unknown }>;
type NavigationChild = NavigationGroup['children'][number];

function hasChildren(route: NavigationRoute): route is NavigationGroup {
  return 'children' in route;
}

function filterNavigationConfigByModules(
  config: typeof navigationConfig,
  allowedModuleKeys: Array<string>,
) {
  const allowed = new Set(allowedModuleKeys);
  const moduleKeyByLabel: Record<string, string> = {
    Employees: 'employees',
    Departments: 'departments',
    Documents: 'documents',
    Attendance: 'attendance',
    Leave: 'leave',
    Payroll: 'payroll',
    'Self Service': 'self_service',
    'Support System': 'support_system',
    Recruitment: 'recruitment',
    Separation: 'separation',
    Reports: 'reports',
    'Roles & Permissions': 'roles',
  };

  const routes = config.routes
    .map((group) => {
      if (!hasChildren(group)) {
        return group;
      }

      const children = group.children.filter((item: NavigationChild) => {
        const moduleKey = moduleKeyByLabel[item.label];

        // Keep routes that don't map to a module (eg. Dashboard).
        if (!moduleKey) return true;

        return allowed.has(moduleKey);
      });

      if (children.length === 0) {
        return null;
      }

      return { ...group, children };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return { ...config, routes };
}

function getDisplayName(user: JwtPayload) {
  const metadata =
    user.user_metadata && typeof user.user_metadata === 'object'
      ? (user.user_metadata as Record<string, unknown>)
      : undefined;

  const fullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    user.email;

  return fullName || 'John Doe';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];

  if (parts.length === 0) {
    return 'JD';
  }

  if (!second && first) {
    return first.slice(0, 2).toUpperCase();
  }

  if (!first || !second) {
    return 'JD';
  }

  return `${first[0]}${second[0]}`.toUpperCase();
}
