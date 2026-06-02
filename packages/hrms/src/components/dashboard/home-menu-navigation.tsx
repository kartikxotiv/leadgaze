import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@kit/ui/bordered-navigation-menu';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { navigationConfig } from '~/config/navigation.config';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { getRbacSnapshot } from '~/lib/server/rbac';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

export async function HomeMenuNavigation() {
  const user = await requireUserInServerComponent();
  const organizationId = await getCurrentUserOrganizationId(user.id);
  const snapshot = organizationId
    ? await getRbacSnapshot({ accountId: user.id, organizationId })
    : null;

  const filteredConfig = snapshot
    ? filterNavigationConfigByModules(navigationConfig, snapshot.allowedModules)
    : navigationConfig;

  const routes = filteredConfig.routes.reduce<
    Array<{
      path: string;
      label: string;
      Icon?: React.ReactNode;
      end?: boolean | ((path: string) => boolean);
    }>
  >((acc, item) => {
    if ('children' in item) {
      return [...acc, ...item.children];
    }

    if ('divider' in item) {
      return acc;
    }

    return [...acc, item];
  }, []);

  return (
    <div className={'flex w-full flex-1 justify-between'}>
      <div className={'flex items-center space-x-8'}>
        <AppLogo />

        <BorderedNavigationMenu>
          {routes.map((route) => (
            <BorderedNavigationMenuItem {...route} key={route.path} />
          ))}
        </BorderedNavigationMenu>
      </div>

      <div className={'flex justify-end space-x-2.5'}>
        <div>
          <ProfileAccountDropdownContainer showProfileName={false} />
        </div>
      </div>
    </div>
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
  };

  const routes = config.routes
    .map((group) => {
      if (!hasChildren(group)) {
        return group;
      }

      const children = group.children.filter((item: NavigationChild) => {
        const moduleKey = moduleKeyByLabel[item.label];
        if (!moduleKey) return true;
        return allowed.has(moduleKey);
      });

      if (children.length === 0) return null;
      return { ...group, children };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return { ...config, routes };
}
