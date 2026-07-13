'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Box,
  Calendar,
  ChevronDown,
  DollarSign,
  FileText,
  Grip,
  Headphones,
  Loader2,
  Lock,
  Menu,
  NotebookPen,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Sparkles,
  Users as UsersIcon,
} from 'lucide-react';

import { toast } from 'sonner';

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
import { getServiceCloudResourceService } from '@kit/service-cloud';
import { useUser } from '@kit/supabase/hooks/use-user';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
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
import {
  getSeatAssignmentsService,
  getSubscriptionProductsService,
  getWorkspaceEntitlementsService,
} from '~/services/subscription.service';
import { getTeamsService } from '~/services/teams.service';

import {
  type AnyDropdownLabel,
  type SalesDropdownLabel,
  type ServicesDropdownLabel,
  hasChevronForModule,
  isDropdownLabel,
} from '../_constants/nav-chevron.constants';
import { CreateAccountDialog } from '../accounts/components/create-account-dialog';
import { CreateContactDialog } from '../contacts/components/create-contact-dialog';
import CreateLeadDialog from '../leads/components/create-lead-dialog';
import { OpportunityDialog } from '../opportunities/components/opportunity-dialog';

function getModuleCommonPaths(moduleBasePath: string) {
  return {
    profileSettings: `${moduleBasePath}/profile-settings`,
    workspaceSettings: `${moduleBasePath}/workspace-settings`,
    teamMembers: `${moduleBasePath}/team-members`,
    roles: `${moduleBasePath}/roles`,
    auditLogs: `${moduleBasePath}/audit-logs`,
  };
}

function scopeCommonItems<T extends { path?: string }>(
  items: T[],
  moduleBasePath: string,
) {
  const paths = getModuleCommonPaths(moduleBasePath);

  return items
    .filter((item) => item.path !== pathsConfig.app.teams)
    .map((item) => {
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
  module: 'sales' | 'services';
  type: AnyDropdownLabel;
  workspaceId?: string;
  onAddNewClick: () => void;
  onItemClick: () => void;
}

// ─── Per-module helpers ─────────────────────────────────────────────────────

/** Resolves the record's display name for each module+type combination. */
function getRecordName(
  module: 'sales' | 'services',
  type: AnyDropdownLabel,
  record: any,
): string {
  if (module === 'sales') {
    const salesType = type as SalesDropdownLabel;
    if (salesType === 'Leads' || salesType === 'Contacts') {
      return (
        `${record.first_name || ''} ${record.last_name || ''}`.trim() ||
        record.email ||
        `Unnamed ${salesType.slice(0, -1)}`
      );
    }
    if (salesType === 'Accounts')
      return record.account_name || 'Unnamed Account';
    if (salesType === 'Opportunities')
      return record.opportunity_name || 'Unnamed Opportunity';
  }
  if (module === 'services') {
    const servicesType = type as ServicesDropdownLabel;
    if (servicesType === 'Tickets')
      return (
        record.subject || record.title || `Ticket #${record.id?.slice(0, 8)}`
      );
  }
  return record.name || record.title || 'Unnamed Record';
}

/** Resolves the detail page path for each module+type combination. */
function getDetailPath(
  module: 'sales' | 'services',
  type: AnyDropdownLabel,
  id: string,
): string {
  if (module === 'sales') {
    const salesType = type as SalesDropdownLabel;
    if (salesType === 'Opportunities') return `/home/sales/opportunities/${id}`;
    if (salesType === 'Teams') return `/home/sales/teams`;
    return `/home/sales/${salesType.toLowerCase()}/${id}`;
  }
  if (module === 'services') {
    const servicesType = type as ServicesDropdownLabel;
    if (servicesType === 'Tickets') return `/home/services/tickets/${id}`;
    if (servicesType === 'Customers') return `/home/services/customers`;
    if (servicesType === 'Teams') return `/home/services/workspace-teams`;
  }
  return '#';
}

/** Resolves the "View All" list path for each module+type combination. */
function getViewAllPath(
  module: 'sales' | 'services',
  type: AnyDropdownLabel,
): string {
  if (module === 'sales') {
    const salesType = type as SalesDropdownLabel;
    if (salesType === 'Opportunities') return '/home/sales/opportunities';
    if (salesType === 'Teams') return '/home/sales/teams';
    return `/home/sales/${salesType.toLowerCase()}`;
  }
  if (module === 'services') {
    const servicesType = type as ServicesDropdownLabel;
    if (servicesType === 'Teams') return `/home/services/workspace-teams`;
    return `/home/services/${servicesType.toLowerCase()}`;
  }
  return '#';
}

/** Friendly display label for "View All" link. */
function getViewAllLabel(type: AnyDropdownLabel): string {
  if (type === 'Opportunities') return 'Deals';
  return type;
}

// ─── Query fn per module ─────────────────────────────────────────────────────

async function fetchDropdownRecords(
  module: 'sales' | 'services',
  type: AnyDropdownLabel,
  workspaceId: string,
): Promise<any> {
  if (module === 'sales') {
    const salesType = type as SalesDropdownLabel;
    if (salesType === 'Leads')
      return getLeadsService({ workspaceId, limit: 5 });
    if (salesType === 'Contacts')
      return getContactsService({ workspaceId, limit: 5 });
    if (salesType === 'Accounts')
      return getAccountsService({ workspaceId, limit: 5 });
    if (salesType === 'Opportunities')
      return getOpportunitiesService({ workspaceId, limit: 5 });
    if (salesType === 'Teams') {
      const rows = await getTeamsService(workspaceId);
      return { data: rows?.data ?? [] };
    }
  }
  if (module === 'services') {
    const servicesType = type as ServicesDropdownLabel;
    if (servicesType === 'Tickets') {
      // getServiceCloudResourceService returns the array directly
      const rows = await getServiceCloudResourceService(
        'tickets',
        workspaceId,
        { limit: '5' },
      );
      return { data: rows ?? [] };
    }
    if (servicesType === 'Customers') {
      const rows = await getServiceCloudResourceService(
        'customers',
        workspaceId,
        { limit: '5' },
      );
      return { data: rows ?? [] };
    }
    if (servicesType === 'Teams') {
      const rows = await getTeamsService(workspaceId);
      return { data: rows?.data ?? [] };
    }
  }
  return { data: [] };
}

// ─── NavDropdownContent ──────────────────────────────────────────────────────

function NavDropdownContent({
  module,
  type,
  workspaceId,
  onAddNewClick,
  onItemClick,
}: NavDropdownContentProps) {
  const queryClient = useQueryClient();
  const queryKey = `${module}:${type.toLowerCase()}`;

  useEffect(() => {
    if (workspaceId) {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  }, [module, type, workspaceId, queryClient, queryKey]);

  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { data: [] };
      return fetchDropdownRecords(module, type, workspaceId);
    },
    enabled: !!workspaceId,
  });

  const records: any[] = (data as any)?.data ?? [];

  return (
    <div className="flex w-64 flex-col space-y-1.5 p-2 text-zinc-950 dark:text-zinc-50">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          Recent {type}
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
          {records.slice(0, 5).map((record: any) => (
            <Link
              key={record.id}
              href={getDetailPath(module, type, record.id)}
              onClick={onItemClick}
              className="block w-full truncate rounded px-2 py-1 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-white"
            >
              {getRecordName(module, type, record)}
            </Link>
          ))}
        </div>
      )}

      <div className="bg-zinc-150 my-0.5 h-px dark:bg-zinc-800" />

      <Link
        href={getViewAllPath(module, type)}
        onClick={onItemClick}
        className="block w-full py-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
      >
        View All {getViewAllLabel(type)}
      </Link>
    </div>
  );
}

interface NavDropdownProps {
  module: 'sales' | 'services';
  label: string;
  path: string;
  active: boolean;
  workspaceId?: string;
  formattedLabel: AnyDropdownLabel;
}

function NavDropdown({
  module,
  label,
  path,
  active,
  workspaceId,
  formattedLabel,
}: NavDropdownProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {/* Wrapper keeps label + chevron visually grouped with shared active styling */}
      <div
        className={cn(
          'flex items-center text-sm font-medium transition-colors',
          active
            ? 'bg-header-primary !text-white'
            : '!text-blue-100 hover:bg-white/10 hover:text-white',
        )}
      >
        {/* Text label — navigates to the main list page */}
        <Link
          href={path}
          className={cn(
            'px-3 py-1.5 outline-none focus:outline-none',
            active
              ? 'bg-header-primary !text-white'
              : '!text-blue-100 hover:bg-white/10 hover:text-white',
          )}
        >
          <Trans i18nKey={label} defaults={formattedLabel} />
        </Link>

        {/* Chevron — solely responsible for opening the dropdown */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Open ${formattedLabel} quick-view`}
              className="flex cursor-pointer items-center border-0 bg-transparent py-1.5 pr-2 pl-0 outline-none focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="mt-1 rounded-md border border-zinc-200 bg-white p-0 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <NavDropdownContent
              module={module}
              type={formattedLabel}
              workspaceId={workspaceId}
              onAddNewClick={() => {
                setDropdownOpen(false);
                if (module === 'services') {
                  router.push(`/home/services/${formattedLabel.toLowerCase()}`);
                } else {
                  setDialogOpen(true);
                }
              }}
              onItemClick={() => {
                setDropdownOpen(false);
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sales creation dialogs */}
      {module === 'sales' && formattedLabel === 'Leads' && (
        <CreateLeadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => { }}
        />
      )}

      {module === 'sales' && formattedLabel === 'Contacts' && (
        <CreateContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => { }}
        />
      )}

      {module === 'sales' && formattedLabel === 'Accounts' && (
        <CreateAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => { }}
        />
      )}

      {module === 'sales' && formattedLabel === 'Opportunities' && (
        <OpportunityDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => { }}
        />
      )}

      {/* Services: no creation dialog yet — "New" navigates to the list page */}
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

function getModuleDisplayName(originalName: string): string {
  switch (originalName) {
    case 'Sales CRM':
      return 'Sales Desk';
    case 'Service Cloud':
      return 'Service Desk';
    case 'HR Management':
      return 'HRMS Desk';
    default:
      return originalName;
  }
}

export function HomeMenuNavigation() {
  const { canAccess, currentWorkspace } = useRBAC();
  const { data: authUser } = useUser();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedComingSoonModule, setSelectedComingSoonModule] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);
  const supabase = useSupabase();

  useEffect(() => {
    if (authUser?.id) {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (localTz) {
        supabase
          .from('accounts')
          .select('timezone')
          .eq('id', authUser.id)
          .single()
          .then(({ data }) => {
            if (data && data.timezone !== localTz) {
              supabase
                .from('accounts')
                .update({ timezone: localTz })
                .eq('id', authUser.id)
                .then(() => {
                  console.log('[Timezone Sync] Updated account timezone to:', localTz);
                });
            }
          });
      }
    }
  }, [authUser?.id, supabase]);

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

  // Fetch workspace entitlements (free access grants that bypass seat assignments)
  const { data: entitlementsData } = useQuery({
    queryKey: ['workspace-entitlements', currentWorkspace?.id],
    queryFn: () => getWorkspaceEntitlementsService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  // Fetch ALL subscription products (including inactive ones = coming soon)
  const { data: allProductsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['subscription-products-all'],
    queryFn: () => getSubscriptionProductsService(),
    staleTime: 1000 * 60 * 5,
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

  // Product IDs that have active entitlements (workspace-wide access)
  const entitledProductIds = useMemo(() => {
    const entitlements = (entitlementsData?.data ?? []) as Array<{
      product_id: string;
      is_active: boolean;
      valid_until: string | null;
    }>;
    const now = new Date();
    return new Set(
      entitlements
        .filter(
          (e) =>
            e.is_active && (!e.valid_until || new Date(e.valid_until) > now),
        )
        .map((e) => e.product_id),
    );
  }, [entitlementsData]);

  // Product IDs that have active subscription seats for this workspace
  const enabledProductIds = useMemo(() => {
    return new Set(
      (subscriptionStatus?.enabled_modules ?? []).map((m) => m.module_id),
    );
  }, [subscriptionStatus]);

  // All products from DB, used to populate the launcher
  const allLauncherProducts = useMemo(() => {
    return (allProductsData?.data ?? []) as Array<{
      id: string;
      product_key: string;
      display_name: string;
      is_active: boolean;
    }>;
  }, [allProductsData]);

  const activeProducts = useMemo(() => {
    return allLauncherProducts
      .filter((p) => p.is_active)
      .sort((a, b) => {
        const hasAccessA =
          (enabledProductIds.has(a.id) || entitledProductIds.has(a.id)) &&
          (userAssignedProductIds.has(a.id) || entitledProductIds.has(a.id));
        const hasAccessB =
          (enabledProductIds.has(b.id) || entitledProductIds.has(b.id)) &&
          (userAssignedProductIds.has(b.id) || entitledProductIds.has(b.id));

        if (hasAccessA && !hasAccessB) return -1;
        if (!hasAccessA && hasAccessB) return 1;
        return 0;
      });
  }, [
    allLauncherProducts,
    enabledProductIds,
    entitledProductIds,
    userAssignedProductIds,
  ]);
  const comingSoonProducts = useMemo(() => allLauncherProducts.filter((p) => !p.is_active), [allLauncherProducts]);

  // Use permission-based navigation
  const permissionNavConfig = usePermissionBasedNavigationConfig();

  const isFundraiseModule =
    pathname.startsWith('/home/fund') || pathname.startsWith('/home/funds');
  const isHrmsModule = pathname.startsWith('/home/hrms');
  const isInventoryModule = pathname.startsWith('/home/inventory');
  const isServiceCloudModule = pathname.startsWith('/home/services');
  const isOrgRoute = pathname.startsWith('/org');

  const currentAppName = useMemo(() => {
    if (isHrmsModule) return 'HRMS Desk';
    if (isFundraiseModule) return 'Fundraising';
    if (isInventoryModule) return 'Stocks';
    if (isServiceCloudModule) return 'Service Desk';
    return 'Sales Desk';
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
      const canViewWorkspaceSettings =
        canAccess('settings', 'view') ||
        canAccess('subscription', 'view') ||
        canAccess('emails', 'manage_email');
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/funds');
      const settingsChildren = canViewWorkspaceSettings
        ? [
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
        ]
        : scopedTeamItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="h-4 w-4" />,
          };
        });

      return [
        ...getFundraiseRoutesForPermissions(canAccessFundraising),
        ...(settingsChildren.length > 0
          ? [
            {
              label: 'common:routes.settings',
              children: settingsChildren,
            },
          ]
          : []),
      ];
    }

    // 2. HRMS Module
    if (isHrmsModule) {
      const commonPaths = getModuleCommonPaths('/home/hrms');
      const canViewWorkspaceSettings =
        canAccess('settings', 'view') ||
        canAccess('subscription', 'view') ||
        canAccess('emails', 'manage_email');
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/hrms');
      const settingsChildren = canViewWorkspaceSettings
        ? [
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
        ]
        : scopedTeamItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="h-4 w-4" />,
          };
        });

      return [
        hrmsRoutes,
        ...(settingsChildren.length > 0
          ? [
            {
              label: 'common:routes.settings',
              children: settingsChildren,
            },
          ]
          : []),
      ];
    }

    // 3. Inventory Module
    if (isInventoryModule) {
      const canViewWorkspaceSettings =
        canAccess('settings', 'view') ||
        canAccess('subscription', 'view') ||
        canAccess('emails', 'manage_email');
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/inventory');
      const commonPaths = getModuleCommonPaths('/home/inventory');
      const settingsChildren = canViewWorkspaceSettings
        ? [
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
        ]
        : scopedTeamItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="h-4 w-4" />,
          };
        });

      return [
        ...getInventoryRoutesForPermissions(canAccessInventory),
        ...(settingsChildren.length > 0
          ? [
            {
              label: 'common:routes.settings',
              children: settingsChildren,
            },
          ]
          : []),
      ];
    }

    // 4. Service Cloud Module
    if (isServiceCloudModule) {
      const commonPaths = getModuleCommonPaths('/home/services');
      const canViewWorkspaceSettings =
        canAccess('settings', 'view') ||
        canAccess('subscription', 'view') ||
        canAccess('emails', 'manage_email');
      const teamItems =
        permissionNavConfig?.teamItems ||
        getNavigationConfig(canAccess).teamItems;
      const scopedTeamItems = scopeCommonItems(teamItems, '/home/services');
      const settingsChildren = canViewWorkspaceSettings
        ? [
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
        ]
        : scopedTeamItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="h-4 w-4" />,
          };
        });

      return [
        ...getServiceCloudRoutesForPermissions(canAccessServiceCloud),
        ...(settingsChildren.length > 0
          ? [
            {
              label: 'common:routes.settings',
              children: settingsChildren,
            },
          ]
          : []),
      ];
    }

    // 5. Default: Sales CRM Module — permission-filtered
    const { salesItems, teamItems } =
      permissionNavConfig ?? getNavigationConfig(canAccess);
    const canViewWorkspaceSettings =
      canAccess('settings', 'view') ||
      canAccess('subscription', 'view') ||
      canAccess('emails', 'manage_email');
    const salesSettingsChildren = canViewWorkspaceSettings
      ? [
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
      ]
      : teamItems.length > 0
        ? teamItems.map((item) => {
          const IconComponent = item.Icon;
          return {
            ...item,
            Icon: <IconComponent className="h-4 w-4" />,
          };
        })
        : [];

    return [
      {
        label: '',
        children: [
          ...(salesItems.length > 0
            ? [
              {
                label: 'common:routes.dashboard',
                path: '/home/sales',
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
      ...(salesSettingsChildren.length > 0
        ? [
          {
            label: 'common:routes.settings',
            children: salesSettingsChildren,
          },
        ]
        : []),
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
          const end = (
            child as {
              end?: boolean | ((path: string) => boolean);
            }
          ).end;

          items.push({
            label: child.label,
            path: child.path,
            Icon: child.Icon,
            end,
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
    const activeRoute = allMainRoutes[activeIndex];

    if (activeRoute) {
      visible.push(activeRoute);
    }

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
      <div className="flex min-w-0 flex-1 items-center space-x-3 overflow-hidden md:space-x-4 lg:space-x-6">
        <div className="flex shrink-0 items-center space-x-2 md:space-x-3 lg:space-x-4">
          <AppLogo className="max-h-8 w-auto" />
          {!isOrgRoute && (
            <div className="hidden h-6 w-px bg-white/25 md:block" />
          )}

          {/* App Launcher Trigger Modal */}
          {!isOrgRoute && (
            <Dialog open={isLauncherOpen} onOpenChange={setIsLauncherOpen}>
              <DialogTrigger asChild>
                <button className="flex cursor-pointer items-center space-x-2 bg-transparent px-3 py-1.5 text-white transition-colors hover:bg-transparent">
                  <Grip className="h-5 w-5" />
                  <span className="primary-heading-big sm:text-md smfont-medium">
                    {currentAppName}
                  </span>
                </button>
              </DialogTrigger>

              <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                <DialogHeader className="shrink-0 border-b p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
                    <Grip className="h-5 w-5 text-blue-600" />
                    App Launcher
                  </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto p-6">
                  {isProductsLoading ? (
                    <div className="py-8 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
                      <p className="mt-2 text-sm text-zinc-500">
                        Loading modules...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activeProducts.map((prod) => {
                        const meta = getLauncherMeta(prod.product_key);
                        const displayName = getModuleDisplayName(prod.display_name);

                        // A product is "accessible" if:
                        //   - the workspace has a seat or entitlement for it AND
                        //   - the user is assigned to it (or has an entitlement)
                        const hasWorkspaceAccess =
                          enabledProductIds.has(prod.id) ||
                          entitledProductIds.has(prod.id);
                        const hasUserAccess =
                          userAssignedProductIds.has(prod.id) ||
                          entitledProductIds.has(prod.id);
                        const hasAccess = hasWorkspaceAccess && hasUserAccess;

                        const isLocked = !hasAccess;

                        // Active subscribed module on the workspace seat data
                        const activeMod = subscriptionStatus?.enabled_modules?.find(
                          (m) => m.module_id === prod.id,
                        );

                        const handleClick = (e: React.MouseEvent) => {
                          if (!hasAccess) {
                            e.preventDefault();
                            toast.warning(
                              "You don't have permission to access this feature. Please subscribe to get access",
                            );
                            return;
                          }
                          localStorage.setItem('selected_module', prod.product_key);
                          setIsLauncherOpen(false);
                          router.push(meta.route);
                        };

                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={handleClick}
                            className={cn(
                              'group flex w-full cursor-pointer flex-col rounded-lg border p-4 text-left transition-all',
                              'border-zinc-200 bg-zinc-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-blue-950/20',
                              isLocked && 'opacity-75',
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex h-7 w-7 items-center justify-center rounded-md"
                                  style={{
                                    backgroundColor: `${meta.color}20`,
                                    color: isLocked ? '#9ca3af' : meta.color,
                                  }}
                                >
                                  {meta.icon}
                                </div>
                                <span
                                  className={`font-bold transition-colors ${
                                    isLocked
                                      ? 'text-zinc-500 dark:text-zinc-400'
                                      : 'text-zinc-900 group-hover:text-blue-600 dark:text-white'
                                  }`}
                                >
                                  {displayName}
                                </span>
                              </div>
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5 text-zinc-400" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                              )}
                            </div>
                            <span className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {meta.description}
                            </span>
                            {activeMod ? (
                              <span className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                                {activeMod.used_seats} / {activeMod.purchased_seats} seats used
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {/* Separator */}
                    {comingSoonProducts.length > 0 && (
                      <div className="relative flex items-center">
                        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                        <span className="mx-4 shrink-0 text-xs font-medium text-zinc-400">
                          Coming Soon
                        </span>
                        <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                      </div>
                    )}

                    {/* Coming Soon Products Grid */}
                    {comingSoonProducts.length > 0 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {comingSoonProducts.map((prod) => {
                          const meta = getLauncherMeta(prod.product_key);
                          const displayName = getModuleDisplayName(prod.display_name);
                          const isLocked = true;

                          const handleClick = (e: React.MouseEvent) => {
                            e.preventDefault();
                            setSelectedComingSoonModule({ id: prod.id, name: displayName });
                            setInterestModalOpen(true);
                          };

                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={handleClick}
                              className="group flex w-full cursor-pointer flex-col rounded-lg border border-amber-500/50 bg-amber-50/50 p-4 text-left transition-all hover:border-amber-400 hover:bg-amber-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-amber-500/50 dark:hover:bg-amber-950/20"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30"
                                    style={{
                                      backgroundColor: `${meta.color}20`,
                                      color: '#9ca3af',
                                    }}
                                  >
                                    {meta.icon}
                                  </div>
                                  <span className="font-bold text-amber-700 transition-colors group-hover:text-amber-700 dark:text-zinc-400 dark:group-hover:text-amber-400">
                                    {displayName}
                                  </span>
                                </div>
                                <Sparkles className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-amber-500" />
                              </div>
                              <span className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                {meta.description}
                              </span>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="inline-flex w-fit items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  Coming Soon
                                </span>
                                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  Notify Me →
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {!isOrgRoute && (
            <div className="hidden h-6 w-px bg-white/25 lg:block" />
          )}
        </div>

        {/* Dynamic Navigation Menu Items */}
        {!isOrgRoute && (
          <nav className="hidden items-center space-x-1 lg:flex lg:space-x-2">
            {visibleRoutes.map((item) => {
              const formatted = formatLabel(item.label);
              const active = isRouteActive(
                item.path,
                pathname,
                item.end ?? false,
              );

              // Resolve the current module so we look up the right config entry.
              const activeModule = isHrmsModule
                ? 'hrms'
                : isServiceCloudModule
                  ? 'services'
                  : isInventoryModule
                    ? 'inventory'
                    : isFundraiseModule
                      ? 'funds'
                      : 'sales';

              // If this label is configured as a full data-fetch dropdown for
              // the active module, render NavDropdown (works for both Sales & Services).
              if (isDropdownLabel(activeModule, formatted)) {
                return (
                  <NavDropdown
                    key={item.path}
                    module={activeModule as 'sales' | 'services'}
                    label={item.label}
                    path={item.path}
                    active={active}
                    workspaceId={currentWorkspace?.id}
                    formattedLabel={formatted as AnyDropdownLabel}
                  />
                );
              }

              // Otherwise, just show a chevron-only icon if configured.
              const showChevron = hasChevronForModule(activeModule, formatted);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-header-primary !text-white'
                      : '!text-blue-100 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span>
                    <Trans i18nKey={item.label} defaults={formatted} />
                  </span>
                  {showChevron && (
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
        )}
      </div>

      {/* Right side: Mobile Menu, Settings, Profile */}
      <div className="flex shrink-0 items-center space-x-2 md:space-x-3 lg:space-x-4">
        {/* Mobile hamburger navigation menu */}
        {!isOrgRoute && allMainRoutes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex cursor-pointer items-center justify-center rounded-md p-2 text-blue-100 transition-colors hover:bg-white/10 hover:text-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="mt-1 w-48">
              {allMainRoutes.map((item) => {
                const formatted = formatLabel(item.label);
                const isActive = isRouteActive(
                  item.path,
                  pathname,
                  item.end ?? false,
                );
                return (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link
                      href={item.path}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2',
                        isActive
                          ? 'bg-header-primary font-semibold text-white'
                          : '',
                      )}
                    >
                      {item.Icon}
                      <span>
                        <Trans i18nKey={item.label} defaults={formatted} />
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              {settingsMenuItems.length > 0 && (
                <>
                  <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  {settingsMenuItems.map((item) => {
                    const isActive = isRouteActive(item.path, pathname, false);
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link
                          href={item.path}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2',
                            isActive
                              ? 'bg-header-primary font-semibold text-white'
                              : '',
                          )}
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
                    );
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
        {!isOrgRoute && settingsMenuItems.length > 0 && (
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
        <div className="shrink-0 border-l border-blue-500/20 pl-2 lg:pl-4">
          <ProfileAccountDropdownContainer showProfileName={false} />
        </div>
      </div>

      {/* Interest Dialog */}
      <AlertDialog open={interestModalOpen} onOpenChange={setInterestModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you interested in this module?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedComingSoonModule?.name} is coming soon! Let us know if you're interested and we'll notify you when it's ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingInterest}>No</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmittingInterest}
              onClick={async (e) => {
                e.preventDefault();
                if (!selectedComingSoonModule) return;
                setIsSubmittingInterest(true);
                try {
                  const res = await fetch('/api/user-interests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ moduleId: selectedComingSoonModule.id }),
                  });
                  if (!res.ok) throw new Error('Failed to record interest');
                  toast.success('We have got your response. Thank you!');
                  setInterestModalOpen(false);
                } catch (error) {
                  toast.error('Failed to submit response. Please try again.');
                } finally {
                  setIsSubmittingInterest(false);
                }
              }}
            >
              {isSubmittingInterest ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, I'm interested
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
