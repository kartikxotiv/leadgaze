'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Box,
  Briefcase,
  Calendar,
  ChevronDown,
  DollarSign,
  FileText,
  Grip,
  Headphones,
  History,
  Loader2,
  Mail,
  NotebookPen,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  User,
  UserPen,
  Users,
  Users as UsersIcon,
} from 'lucide-react';

import { getWorkspaceSubscriptionService } from '@kit/core/services';
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
import { useUser } from '@kit/supabase/hooks/use-user';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Trans } from '@kit/ui/trans';
import { cn, isRouteActive } from '@kit/ui/utils';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import pathsConfig from '~/config/paths.config';
import { usePermissionBasedNavigationConfig } from '~/lib/permissions/use-navigation-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getNavigationConfig } from '~/lib/rbac/use-dynamic-navigation';
import { getAccountsService } from '~/services/accounts.service';
import { getContactsService } from '~/services/contacts.service';
import { getLeadsService } from '~/services/leads.service';
import { getOpportunitiesService } from '~/services/opportunities.service';
import { getSeatAssignmentsService } from '~/services/subscription.service';

import { CreateAccountDialog } from '../accounts/components/create-account-dialog';
import { CreateContactDialog } from '../contacts/components/create-contact-dialog';
import CreateLeadDialog from '../leads/components/create-lead-dialog';
import { OpportunityDialog } from '../opportunities/components/opportunity-dialog';

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
  if (label.startsWith('common:routes.')) {
    const key = label.replace('common:routes.', '');
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return label;
}

interface NavDropdownContentProps {
  type: 'Leads' | 'Contacts' | 'Accounts' | 'Opportunities';
  workspaceId?: string;
  onAddNewClick: () => void;
  onItemClick: () => void;
}

function NavDropdownContent({
  type,
  workspaceId,
  onAddNewClick,
  onItemClick,
}: NavDropdownContentProps) {
  const queryClient = useQueryClient();
  const queryKey =
    type.toLowerCase() === 'opportunities'
      ? 'opportunities'
      : type.toLowerCase();

  useEffect(() => {
    if (workspaceId) {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  }, [type, workspaceId, queryClient, queryKey]);

  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { data: [] };
      if (type === 'Leads') {
        return getLeadsService({ workspaceId, limit: 5 });
      } else if (type === 'Contacts') {
        return getContactsService({ workspaceId, limit: 5 });
      } else if (type === 'Accounts') {
        return getAccountsService({ workspaceId, limit: 5 });
      } else {
        return getOpportunitiesService({ workspaceId, limit: 5 });
      }
    },
    enabled: !!workspaceId,
  });

  const records = (data as any)?.data || [];

  return (
    <div className="flex w-64 flex-col space-y-1.5 p-2 text-zinc-950 dark:text-zinc-50">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          Recent {type === 'Opportunities' ? 'Deals' : type}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddNewClick();
          }}
          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-xs font-semibold text-blue-600 outline-none hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New</span>
        </button>
      </div>

      <div className="bg-zinc-150 my-0.5 h-px dark:bg-zinc-800" />

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        </div>
      ) : error ? (
        <div className="px-2 py-2 text-xs text-red-500">
          Failed to load {type.toLowerCase()}
        </div>
      ) : records.length === 0 ? (
        <div className="px-2 py-3 text-center text-xs text-zinc-500">
          No recent {type.toLowerCase()} found
        </div>
      ) : (
        <div className="flex flex-col space-y-0.5">
          {records.slice(0, 5).map((record: any) => {
            let name = '';
            let detailPath = '';
            if (type === 'Leads') {
              name =
                `${record.first_name || ''} ${record.last_name || ''}`.trim() ||
                record.email ||
                'Unnamed Lead';
              detailPath = `/home/sales/leads/${record.id}`;
            } else if (type === 'Contacts') {
              name =
                `${record.first_name || ''} ${record.last_name || ''}`.trim() ||
                record.email ||
                'Unnamed Contact';
              detailPath = `/home/sales/contacts/${record.id}`;
            } else if (type === 'Accounts') {
              name = record.account_name || 'Unnamed Account';
              detailPath = `/home/sales/accounts/${record.id}`;
            } else if (type === 'Opportunities') {
              name = record.opportunity_name || 'Unnamed Opportunity';
              detailPath = `/home/sales/opportunities/${record.id}`;
            }

            return (
              <Link
                key={record.id}
                href={detailPath}
                onClick={onItemClick}
                className="block w-full truncate rounded px-2 py-1 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-white"
              >
                {name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="bg-zinc-150 my-0.5 h-px dark:bg-zinc-800" />

      <Link
        href={
          type === 'Opportunities'
            ? '/home/sales/opportunities'
            : `/home/sales/${type.toLowerCase()}`
        }
        onClick={onItemClick}
        className="block w-full py-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
      >
        View All {type === 'Opportunities' ? 'Deals' : type}
      </Link>
    </div>
  );
}

interface NavDropdownProps {
  label: string;
  path: string;
  active: boolean;
  workspaceId?: string;
  formattedLabel: 'Leads' | 'Contacts' | 'Accounts' | 'Opportunities';
}

function NavDropdown({
  label,
  path,
  active,
  workspaceId,
  formattedLabel,
}: NavDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-3 py-1.5 text-sm font-medium transition-colors outline-none focus:outline-none',
              active
                ? 'bg-header-primary text-white'
                : 'text-blue-100 hover:bg-white/10 hover:text-white',
            )}
          >
            <span>
              <Trans i18nKey={label} defaults={formattedLabel} />
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="mt-1 rounded-md border border-zinc-200 bg-white p-0 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <NavDropdownContent
            type={formattedLabel}
            workspaceId={workspaceId}
            onAddNewClick={() => {
              setDropdownOpen(false);
              setDialogOpen(true);
            }}
            onItemClick={() => {
              setDropdownOpen(false);
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {formattedLabel === 'Leads' && (
        <CreateLeadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {}}
        />
      )}

      {formattedLabel === 'Contacts' && (
        <CreateContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {}}
        />
      )}

      {formattedLabel === 'Accounts' && (
        <CreateAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {}}
        />
      )}

      {formattedLabel === 'Opportunities' && (
        <OpportunityDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}

// ─── App Launcher Helpers ───────────────────────────────────────

const LAUNCHER_MODULE_META: Record<
  string,
  { icon: React.ReactNode; color: string; route: string; description: string }
> = {
  sales: {
    icon: <ShoppingCart className="h-4 w-4" />,
    color: '#0176d3',
    route: '/home/sales',
    description: 'Manage Your Sales CRM System',
  },
  hrms: {
    icon: <UsersIcon className="h-4 w-4" />,
    color: '#9050dd',
    route: '/home/hrms',
    description: 'Manage Your Human Resource System',
  },
  inventory: {
    icon: <Package className="h-4 w-4" />,
    color: '#2e844a',
    route: '/home/inventory',
    description: 'Manage Your Stocks and Inventory',
  },
  service_cloud: {
    icon: <Headphones className="h-4 w-4" />,
    color: '#dd7a01',
    route: '/home/services',
    description: 'Manage Your Customer Support System',
  },
  funds: {
    icon: <DollarSign className="h-4 w-4" />,
    color: '#0b7764',
    route: '/home/funds',
    description: 'Manage Your Fundraising System',
  },
};

function getLauncherMeta(moduleKey: string) {
  return (
    LAUNCHER_MODULE_META[moduleKey] ?? {
      icon: <Box className="h-4 w-4" />,
      color: '#5c5e66',
      route: `/home/${moduleKey}`,
      description: 'Module',
    }
  );
}

export function HomeMenuNavigation() {
  const { canAccess, currentWorkspace } = useRBAC();
  const { data: authUser } = useUser();
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

  // Fetch workspace subscription for dynamic app launcher
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['workspace-subscription', currentWorkspace?.id],
    queryFn: () => getWorkspaceSubscriptionService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  // Fetch user's seat assignments to filter launcher modules
  const { data: assignmentsData } = useQuery({
    queryKey: ['user-seat-assignments', currentWorkspace?.id],
    queryFn: () => getSeatAssignmentsService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  const userAssignedProductIds = useMemo(() => {
    const assignments = (assignmentsData?.data ?? []) as Array<{
      is_active: boolean;
      user_id: string;
      product_id: string;
    }>;
    const userId = authUser?.id;
    return new Set(
      assignments
        .filter((a) => a.is_active && a.user_id === userId)
        .map((a) => a.product_id),
    );
  }, [assignmentsData, authUser?.id]);

  const launcherModules = useMemo(() => {
    const allEnabled = subscriptionStatus?.enabled_modules ?? [];
    // Only show modules where the user has an active seat assignment
    return allEnabled.filter((mod) =>
      userAssignedProductIds.has(mod.module_id),
    );
  }, [subscriptionStatus, userAssignedProductIds]);

  // Use permission-based navigation
  const permissionNavConfig = usePermissionBasedNavigationConfig();

  const isFundraiseModule =
    pathname.startsWith('/home/fund') || pathname.startsWith('/home/funds');
  const isHrmsModule = pathname.startsWith('/home/hrms');
  const isInventoryModule = pathname.startsWith('/home/inventory');
  const isServiceCloudModule = pathname.startsWith('/home/services');

  const currentAppName = useMemo(() => {
    if (isHrmsModule) return 'HRMS';
    if (isFundraiseModule) return 'Fundraising';
    if (isInventoryModule) return 'Stocks';
    if (isServiceCloudModule) return 'Service Cloud';
    return 'Sales';
  }, [
    isHrmsModule,
    isFundraiseModule,
    isInventoryModule,
    isServiceCloudModule,
  ]);

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
    const { teamItems } = getNavigationConfig(canAccess);

    return [
      {
        label: '',
        children: [
          {
            label: 'common:routes.dashboard',
            path: '/home/sales',
            Icon: <Activity className="h-4 w-4" />,
            end: true,
          },
          {
            label: 'Leads',
            path: '/home/sales/leads',
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
          // {
          //   label: 'Emails',
          //   path: '/home/emails',
          //   Icon: <Mail className="h-4 w-4" />,
          // },
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
          {
            label: 'Teams',
            path: pathsConfig.app.teams,
            Icon: <Users className="h-4 w-4" />,
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
      if (
        group.label === 'common:routes.settings' ||
        group.label?.includes('settings')
      ) {
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

  // Dynamic layout overflow calculation
  const maxVisible = useMemo(() => {
    const reservedWidth = 370; // estimated width for Logo + app launcher + settings + profile + paddings
    const availableWidth = windowWidth - reservedWidth;
    const totalItemsCount = allMainRoutes.length;
    const estimatedItemWidth = 110;
    const moreButtonWidth = 80;

    if (totalItemsCount * estimatedItemWidth <= availableWidth) {
      return totalItemsCount;
    }

    const maxFit = Math.floor(
      (availableWidth - moreButtonWidth) / estimatedItemWidth,
    );
    return Math.max(1, maxFit);
  }, [windowWidth, allMainRoutes.length]);

  // Find active route index
  const activeIndex = useMemo(() => {
    return allMainRoutes.findIndex((item) =>
      isRouteActive(item.path, pathname, item.end ?? false),
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
      (item) => !visible.some((v) => v.path === item.path),
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
      if (
        group.label === 'common:routes.settings' ||
        group.label?.includes('settings')
      ) {
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
          <div className="h-6 w-px bg-white/25" />

          {/* App Launcher Trigger Modal */}
          <Dialog open={isLauncherOpen} onOpenChange={setIsLauncherOpen}>
            <DialogTrigger asChild>
              <button className="flex cursor-pointer items-center space-x-2 bg-transparent px-3 py-1.5 text-white transition-colors hover:bg-transparent">
                <Grip className="h-5 w-5" />
                <span className="primary-heading-big">{currentAppName}</span>
              </button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
              <DialogHeader className="mb-4 border-b pb-4">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
                  <Grip className="h-5 w-5 text-blue-600" />
                  App Launcher
                </DialogTitle>
              </DialogHeader>

              {launcherModules.length === 0 ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
                  <p className="mt-2 text-sm text-zinc-500">
                    Loading modules...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {launcherModules.map((mod) => {
                    const meta = getLauncherMeta(mod.module_key);
                    return (
                      <Link
                        key={mod.module_id}
                        href={meta.route}
                        onClick={() => {
                          localStorage.setItem(
                            'selected_module',
                            mod.module_key,
                          );
                          setIsLauncherOpen(false);
                        }}
                        className="group flex flex-col rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-blue-950/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-md"
                              style={{
                                backgroundColor: `${meta.color}20`,
                                color: meta.color,
                              }}
                            >
                              {meta.icon}
                            </div>
                            <span className="font-bold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-white">
                              {mod.module_name}
                            </span>
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <span className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {meta.description}
                        </span>
                        <span className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                          {mod.used_seats} / {mod.purchased_seats} seats used
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <div className="h-6 w-px bg-white/25" />
        </div>

        {/* Dynamic Navigation Menu Items */}
        <nav className="flex items-center space-x-1 lg:space-x-2">
          {visibleRoutes.map((item) => {
            const formatted = formatLabel(item.label);
            const active = isRouteActive(
              item.path,
              pathname,
              item.end ?? false,
            );

            if (
              ['Leads', 'Contacts', 'Accounts', 'Opportunities'].includes(
                formatted,
              )
            ) {
              return (
                <NavDropdown
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  active={active}
                  workspaceId={currentWorkspace?.id}
                  formattedLabel={
                    formatted as
                      | 'Leads'
                      | 'Contacts'
                      | 'Accounts'
                      | 'Opportunities'
                  }
                />
              );
            }

            const hasChevron = ['Deals', 'Reports'].includes(formatted);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-header-primary text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white',
                )}
              >
                <span>
                  <Trans i18nKey={item.label} defaults={formatted} />
                </span>
                {hasChevron && (
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                )}
              </Link>
            );
          })}

          {/* More Dropdown Menu */}
          {moreRoutes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-blue-100 transition-colors hover:bg-white/10 hover:text-white">
                  <span>More</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="mt-1 w-48">
                {moreRoutes.map((item) => {
                  const formatted = formatLabel(item.label);
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        href={item.path}
                        className="w-full cursor-pointer px-3 py-2"
                      >
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
        {/* <div className="relative hidden w-48 max-w-xs md:block lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/60" />
          <input
            type="text"
            placeholder="Search CRM..."
            className="w-full bg-blue-700/40 border border-blue-500/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-blue-700/60 transition-all"
          />
        </div> */}

        {/* Notifications Bell */}
        {/* <button className="relative p-2 text-blue-100 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-header-primary">
            2
          </span>
        </button> */}

        {/* Settings gear dropdown */}
        {settingsMenuItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer rounded-full p-2 text-blue-100 transition-colors hover:bg-white/10 hover:text-white">
                <Settings className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-1 w-52">
              {settingsMenuItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link
                    href={item.path}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2"
                  >
                    {item.Icon}
                    <span>
                      <Trans
                        i18nKey={item.label}
                        defaults={formatLabel(item.label)}
                      />
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
