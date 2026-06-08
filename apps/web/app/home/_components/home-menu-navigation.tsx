'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Bell,
  Calendar,
  FileText,
  NotebookPen,
  Settings,
  ShieldCheck,
  UserPen,
  Users,
  History,
  Briefcase,
  User,
  Search,
  ChevronDown,
  Mail,
  LayoutGrid,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { cn, isRouteActive } from '@kit/ui/utils';
import { Trans } from '@kit/ui/trans';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { usePermissionBasedNavigationConfig } from '~/lib/permissions/use-navigation-permissions';
import { getNavigationConfig } from '~/lib/rbac/use-dynamic-navigation';
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
import pathsConfig from '~/config/paths.config';

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

function formatLabel(label: string) {
  if (label === 'common:routes.dashboard') return 'Dashboard';
  if (label === 'Opportunities') return 'Deals';
  if (label === 'Meetings') return 'Calendar';
  if (label === 'Reminders') return 'Tasks';
  if (label.startsWith('common:routes.')) {
    const key = label.replace('common:routes.', '');
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return label;
}

export function HomeMenuNavigation() {
  const { canAccess, currentWorkspace } = useRBAC();
  const pathname = usePathname() || '';
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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

  const isFundraiseModule = pathname.startsWith('/home/fund') || pathname.startsWith('/home/funds');
  const isHrmsModule = pathname.startsWith('/home/hrms');
  const isInventoryModule = pathname.startsWith('/home/inventory');
  const isServiceCloudModule = pathname.startsWith('/home/services');

  const currentAppName = useMemo(() => {
    if (isHrmsModule) return 'HRMS';
    if (isFundraiseModule) return 'Fundraising';
    if (isInventoryModule) return 'Stocks';
    if (isServiceCloudModule) return 'Service Cloud';
    return 'Sales';
  }, [isHrmsModule, isFundraiseModule, isInventoryModule, isServiceCloudModule]);

  const navConfig = useMemo(() => {
    // 1. Fundraising Module
    if (isFundraiseModule) {
      const commonPaths = getModuleCommonPaths('/home/funds');
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

    // 5. Default: Sales CRM Module (Exactly 10 Items as specified)
    return [
      {
        label: '',
        children: [
          {
            label: 'common:routes.dashboard',
            path: pathsConfig.app.home,
            Icon: <Activity className="h-4 w-4" />,
            end: true,
          },
          {
            label: 'Leads',
            path: '/home/leads',
            Icon: <Briefcase className="h-4 w-4" />,
          },
          {
            label: 'Contacts',
            path: '/home/contacts',
            Icon: <User className="h-4 w-4" />,
          },
          {
            label: 'Accounts',
            path: '/home/accounts',
            Icon: <Users className="h-4 w-4" />,
          },
          {
            label: 'Opportunities',
            path: '/home/opportunities',
            Icon: <Activity className="h-4 w-4" />,
          },
          {
            label: 'Emails',
            path: '/home/emails',
            Icon: <Mail className="h-4 w-4" />,
          },
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

  // Flatten main routes (non-settings)
  const allMainRoutes = useMemo(() => {
    const items: Array<{
      label: string;
      path: string;
      Icon?: React.ReactNode;
      end?: boolean | ((path: string) => boolean);
    }> = [];

    navConfig.forEach((group) => {
      if (group.label === 'common:routes.settings' || group.label?.includes('settings')) {
        return;
      }

      if ('children' in group && Array.isArray(group.children)) {
        group.children.forEach((child) => {
          items.push({
            label: child.label,
            path: child.path,
            Icon: child.Icon,
            end: child.end,
          });
        });
      } else if ('path' in group) {
        items.push({
          label: (group as any).label,
          path: (group as any).path,
          Icon: (group as any).Icon,
          end: (group as any).end,
        });
      }
    });

    return items;
  }, [navConfig]);

  // Salesforce style responsive menu splitting logic
  const maxVisible = useMemo(() => {
    if (windowWidth >= 1400) return 6;
    if (windowWidth >= 1200) return 5;
    if (windowWidth >= 1024) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  }, [windowWidth]);

  // Find active route index
  const activeIndex = useMemo(() => {
    return allMainRoutes.findIndex((item) =>
      isRouteActive(item.path, pathname, item.end ?? false)
    );
  }, [allMainRoutes, pathname]);

  const { visibleRoutes, moreRoutes } = useMemo(() => {
    // If no active index, or active route is within first maxVisible items
    if (activeIndex === -1 || activeIndex < maxVisible) {
      return {
        visibleRoutes: allMainRoutes.slice(0, maxVisible),
        moreRoutes: allMainRoutes.slice(maxVisible),
      };
    }

    // Active route is in the "More" section. We pull it into the visible section
    // as the last visible item, and shift the rest.
    const visible = allMainRoutes.slice(0, maxVisible - 1);
    visible.push(allMainRoutes[activeIndex]);

    const more = allMainRoutes.filter(
      (item) => !visible.some((v) => v.path === item.path)
    );

    return {
      visibleRoutes: visible,
      moreRoutes: more,
    };
  }, [allMainRoutes, activeIndex, maxVisible]);

  // Extract settings items
  const settingsMenuItems = useMemo(() => {
    const items: Array<{
      label: string;
      path: string;
      Icon?: React.ReactNode;
    }> = [];

    navConfig.forEach((group) => {
      if (group.label === 'common:routes.settings' || group.label?.includes('settings')) {
        if ('children' in group && Array.isArray(group.children)) {
          group.children.forEach((child) => {
            items.push({
              label: child.label,
              path: child.path,
              Icon: child.Icon,
            });
          });
        }
      }
    });

    return items;
  }, [navConfig]);

  return (
    <div className="flex w-full flex-1 items-center justify-between">
      {/* Left side: Logo & App Launcher & Navigation Items */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-4">
          <AppLogo className="max-h-8 w-auto" />
          
          {/* App Launcher Trigger Modal */}
          <Dialog open={isLauncherOpen} onOpenChange={setIsLauncherOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-white transition-colors cursor-pointer border border-white/10">
                <LayoutGrid className="h-4 w-4" />
                <span className="font-bold text-sm tracking-wide">{currentAppName}</span>
              </button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl p-6 bg-white dark:bg-zinc-950 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <DialogHeader className="border-b pb-4 mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                  <LayoutGrid className="h-5 w-5 text-blue-600" />
                  App Launcher
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* HRMS */}
                <Link
                  href="/home/hrms"
                  onClick={() => setIsLauncherOpen(false)}
                  className="flex flex-col p-4 bg-zinc-50 hover:bg-blue-50/50 dark:bg-zinc-900/50 dark:hover:bg-blue-950/20 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all hover:border-blue-400 group"
                >
                  <span className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">HRMS</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage Your Human Resource System
                  </span>
                </Link>
                
                {/* Fundraising */}
                <Link
                  href="/home/funds"
                  onClick={() => setIsLauncherOpen(false)}
                  className="flex flex-col p-4 bg-zinc-50 hover:bg-blue-50/50 dark:bg-zinc-900/50 dark:hover:bg-blue-950/20 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all hover:border-blue-400 group"
                >
                  <span className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">Fundraising</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage Your Fundraising System
                  </span>
                </Link>
                
                {/* Stocks / Inventory */}
                <Link
                  href="/home/inventory"
                  onClick={() => setIsLauncherOpen(false)}
                  className="flex flex-col p-4 bg-zinc-50 hover:bg-blue-50/50 dark:bg-zinc-900/50 dark:hover:bg-blue-950/20 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all hover:border-blue-400 group"
                >
                  <span className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">Stocks</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage Your Stocks and Inventory
                  </span>
                </Link>
                
                {/* Sales */}
                <Link
                  href="/home"
                  onClick={() => setIsLauncherOpen(false)}
                  className="flex flex-col p-4 bg-zinc-50 hover:bg-blue-50/50 dark:bg-zinc-900/50 dark:hover:bg-blue-950/20 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all hover:border-blue-400 group"
                >
                  <span className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">Sales</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage Your Sales CRM System
                  </span>
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dynamic Navigation Menu Items */}
        <nav className="flex items-center space-x-1 lg:space-x-2">
          {visibleRoutes.map((item) => {
            const formatted = formatLabel(item.label);
            const hasChevron = ['Leads', 'Contacts', 'Accounts', 'Deals', 'Opportunities', 'Reports'].includes(formatted);
            const active = isRouteActive(item.path, pathname, item.end ?? false);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                )}
              >
                <span>
                  <Trans i18nKey={item.label} defaults={formatted} />
                </span>
                {hasChevron && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
              </Link>
            );
          })}

          {/* More Dropdown Menu */}
          {moreRoutes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 rounded-md text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer">
                  <span>More</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 mt-1">
                {moreRoutes.map((item) => {
                  const formatted = formatLabel(item.label);
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link href={item.path} className="w-full cursor-pointer py-2 px-3">
                        <Trans i18nKey={item.label} defaults={formatted} />
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>

      {/* Right side: Search, Notifications, Settings, Profile */}
      <div className="flex items-center space-x-4">
        {/* Search CRM input */}
        <div className="relative hidden w-48 max-w-xs md:block lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/60" />
          <input
            type="text"
            placeholder="Search CRM..."
            className="w-full bg-blue-700/40 border border-blue-500/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-blue-700/60 transition-all"
          />
        </div>

        {/* Notifications Bell */}
        <button className="relative p-2 text-blue-100 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-header-primary">
            2
          </span>
        </button>

        {/* Settings gear dropdown */}
        {settingsMenuItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-blue-100 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                <Settings className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 mt-1">
              {settingsMenuItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link href={item.path} className="flex items-center gap-2.5 w-full cursor-pointer py-2 px-3">
                    {item.Icon}
                    <span>
                      <Trans i18nKey={item.label} defaults={formatLabel(item.label)} />
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User avatar profile dropdown */}
        <div className="border-l border-blue-500/20 pl-2 lg:pl-4">
          <ProfileAccountDropdownContainer showProfileName={false} />
        </div>
      </div>
    </div>
  );
}
