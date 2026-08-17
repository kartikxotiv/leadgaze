'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Box,
  CreditCard,
  DollarSign,
  Headphones,
  Loader2,
  Package,
  Shield,
  ShoppingCart,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

import {
  type WorkspaceSubscriptionStatus,
  getWorkspaceSubscriptionService,
} from '@kit/core/services';
import { getServiceCloudDashboardService } from '@kit/service-cloud';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getDashboardMetricsService } from '~/services/dashboard.service';
import { getSeatAssignmentsService } from '~/services/subscription.service';

import { FullScreenLoader } from '../_components/Loader';

// ─── Constants ───────────────────────────────────────────────────

const MODULE_DASHBOARD_ROUTES: Record<string, string> = {
  sales: '/home/sales',
  hrms: '/home/hrms',
  inventory: '/home/inventory',
  service_cloud: '/home/services',
  funds: '/home/funds',
};

const MODULE_META: Record<
  string,
  {
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
    iconColor: string;
    description: string;
    stat: string;
    features: string[];
  }
> = {
  sales: {
    icon: <ShoppingCart className="h-5 w-5" />,
    gradient: 'from-blue-500/10 to-indigo-500/5',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'Leads, contacts, accounts & pipeline management',
    stat: 'CRM',
    features: ['Lead scoring', 'Pipeline tracking', 'Email campaigns'],
  },
  hrms: {
    icon: <Users className="h-5 w-5" />,
    gradient: 'from-violet-500/10 to-purple-500/5',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    description: 'Employees, attendance, payroll & more',
    stat: 'HRMS',
    features: ['Employee management', 'Leave tracking', 'Payroll'],
  },
  inventory: {
    icon: <Package className="h-5 w-5" />,
    gradient: 'from-emerald-500/10 to-green-500/5',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description: 'Products, stock, purchases & orders',
    stat: 'IMS',
    features: ['Stock tracking', 'Purchase orders', 'Warehousing'],
  },
  service_cloud: {
    icon: <Headphones className="h-5 w-5" />,
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description: 'Tickets, inboxes & customer support',
    stat: 'Service',
    features: ['Ticket management', 'Inbox', 'SLA tracking'],
  },
  funds: {
    icon: <DollarSign className="h-5 w-5" />,
    gradient: 'from-teal-500/10 to-cyan-500/5',
    iconBg: 'bg-teal-50 dark:bg-teal-500/10',
    iconColor: 'text-teal-600 dark:text-teal-400',
    description: 'Investors, rounds & deal pipeline',
    stat: 'Funds',
    features: ['Investor CRM', 'Deal pipeline', 'Fundraising'],
  },
};

function getModuleMeta(key: string) {
  return (
    MODULE_META[key] ?? {
      icon: <Box className="h-5 w-5" />,
      gradient: 'from-slate-500/10 to-gray-500/5',
      iconBg: 'bg-slate-50 dark:bg-slate-500/10',
      iconColor: 'text-slate-600 dark:text-slate-400',
      description: 'Module',
      stat: key.toUpperCase(),
      features: [],
    }
  );
}

function getModuleRoute(moduleKey: string): string {
  return MODULE_DASHBOARD_ROUTES[moduleKey] ?? `/home/${moduleKey}`;
}

// ─── Main ────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <WorkspaceCheckWrapper>
      <ModuleSelectorPage />
    </WorkspaceCheckWrapper>
  );
}

function ModuleSelectorPage() {
  const router = useRouter();
  const { currentWorkspace, isLoading: isRBACLoading } = useRBAC();
  const workspaceId = currentWorkspace?.id ?? '';
  const { data: authUser } = useUser();
  const queryClient = useQueryClient();
  const [isPageLoading, setIsPageLoading] = useState(true);

  const isOwner = Boolean(
    currentWorkspace?.owner_id &&
      authUser?.id &&
      currentWorkspace.owner_id === authUser.id,
  );

  const { data, isLoading: isSubLoading, isError: isSubError } = useQuery<WorkspaceSubscriptionStatus>({
    queryKey: ['workspace-subscription', workspaceId],
    queryFn: () => getWorkspaceSubscriptionService(workspaceId),
    enabled: Boolean(workspaceId) && !isRBACLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // True loading = RBAC is still fetching OR (RBAC done, workspace found, subscription still fetching)
  const isLoading = isRBACLoading || (Boolean(workspaceId) && isSubLoading);

  const { data: assignmentsData } = useQuery({
    queryKey: ['user-seat-assignments', workspaceId],
    queryFn: () => getSeatAssignmentsService(workspaceId),
    enabled: Boolean(workspaceId && authUser?.id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const userAssignedProductIds = useMemo(() => {
    const assignments = (assignmentsData?.data ?? []) as Array<{
      is_active: boolean;
      user_id: string;
      product_id: string;
    }>;
    return new Set(
      assignments
        .filter((a) => a.is_active && a.user_id === authUser?.id)
        .map((a) => a.product_id),
    );
  }, [assignmentsData, authUser?.id]);

  const allEnabledModules = useMemo(() => data?.enabled_modules ?? [], [data]);

  const enabledModules = useMemo(() => {
    if (isOwner || allEnabledModules.length === 0) return allEnabledModules;
    return allEnabledModules.filter((mod) =>
      userAssignedProductIds.has(mod.module_id),
    );
  }, [isOwner, allEnabledModules, userAssignedProductIds]);

  // Auto-redirect logic
  useEffect(() => {
    const handleRedirect = async () => {
      // Wait until RBAC is done loading
      if (isRBACLoading) return;

      // If RBAC loaded but there's still no workspace, stop the page loader.
      // WorkspaceCheckWrapper above us will show the appropriate error/redirect.
      if (!workspaceId) {
        setIsPageLoading(false);
        return;
      }

      if (isSubLoading) return;
      if (!data || isSubError) {
        setIsPageLoading(false);
        return;
      }
      if (!data.is_subscription_valid && data.is_trial_expired) {
        setIsPageLoading(false);
        return;
      }

      const savedModule =
        typeof window !== 'undefined'
          ? localStorage.getItem('selected_module')
          : null;

      if (savedModule) {
        const isStillEnabled = enabledModules.some(
          (m) => m.module_key === savedModule,
        );

        if (isStillEnabled) {
          router.replace(getModuleRoute(savedModule));
          return;
        }

        localStorage.removeItem('selected_module');
      }

      if (enabledModules.length === 1) {
        const mod = enabledModules[0];

        if (mod) {
          localStorage.setItem('selected_module', mod.module_key);
          router.replace(getModuleRoute(mod.module_key));
          return;
        }
      }

      setIsPageLoading(false);
    };

    handleRedirect();
  }, [data, isLoading, isRBACLoading, isSubLoading, workspaceId, enabledModules, router, queryClient]);

  useEffect(() => {
    if (!enabledModules.length && !workspaceId) return;

    enabledModules.forEach((module) => {
      switch (module.module_key) {
        case 'sales':
          queryClient.prefetchQuery({
            queryKey: ['dashboard-metrics', workspaceId],
            queryFn: () => getDashboardMetricsService(workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          break;

        case 'service_cloud':
          queryClient.prefetchQuery({
            queryKey: ['service-cloud', 'dashboard', workspaceId],
            queryFn: () => getServiceCloudDashboardService(workspaceId),
            staleTime: 5 * 60 * 1000,
          });
          break;
      }
    });
  }, [enabledModules, workspaceId, queryClient]);

  // Loading
  if (isLoading || isPageLoading) {
    return <FullScreenLoader />;
  }

  // Prevent crashing if workspace is missing (WorkspaceCheckWrapper will redirect)
  if (!workspaceId) {
    return <FullScreenLoader />;
  }

  // Error state
  if (isSubError || (!data && !isSubLoading)) {
    return (
      <div className="bg-background flex h-screen flex-col items-center justify-center">
        <Card className="mx-4 w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-5 p-10">
            <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-7 w-7" />
            </div>
            <div>
              <h2 className="primary-heading text-foreground">
                Loading Error
              </h2>
              <p className="primary-text-regular text-muted-foreground mt-2">
                We couldn't load your workspace details. Please try again.
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No active subscription
  if (enabledModules.length === 0 && !data.is_subscription_valid) {
    return (
      <div className="bg-background flex h-screen flex-col items-center justify-center">
        <Card className="mx-4 w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-5 p-10">
            <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-7 w-7" />
            </div>
            <div>
              <h2 className="primary-heading text-foreground">
                No Active Subscription
              </h2>
              <p className="primary-text-regular text-muted-foreground">
                Your workspace does not have any active modules. Subscribe to a
                module to get started.
              </p>
            </div>
            <Button onClick={() => router.push('/org/subscription')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Subscription expired
  if (!data.is_subscription_valid && data.is_trial_expired) {
    return (
      <div className="bg-background flex h-screen flex-col items-center justify-center">
        <Card className="mx-4 w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-5 p-10">
            <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-7 w-7" />
            </div>
            <div>
              <h2 className="primary-heading text-foreground">
                Subscription Expired
              </h2>
              <p className="primary-text-regular text-muted-foreground mt-2">
                Your subscription has ended. Renew to regain access to all
                Leadgaze modules.
              </p>
            </div>
            <Button onClick={() => router.push('/org/subscription')}>
              Renew Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Single module — redirect happening via useEffect
  if (enabledModules.length <= 1) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-primary h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Multiple modules — show selector
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="border-border from-primary/[0.03] border-b">
        <div>
          {/* <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="text-primary h-4 w-4" />
                <span className="secondary-text-small text-primary font-medium tracking-widest uppercase">
                  Workspace
                </span>
              </div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                {currentWorkspace?.name ?? 'Your Workspace'}
              </h1>
              <p className="primary-text-regular text-muted-foreground mt-2">
                Select a module to continue. Your access is based on your
                subscription plan.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge variant="success" className="gap-1.5">
                <Zap className="h-3 w-3" />
                All systems operational
              </Badge>
              <span className="secondary-text-small text-muted-foreground">
                {enabledModules.length} module
                {enabledModules.length !== 1 ? 's' : ''} active
              </span>
            </div>
          </div> */}

          {/* Module summary pills */}
          <div className="flex flex-wrap gap-2">
            {enabledModules.map((mod) => {
              const meta = getModuleMeta(mod.module_key);
              return (
                <div
                  key={mod.module_id}
                  className="border-border bg-card flex items-center gap-2 rounded-full border px-3 py-1.5"
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded',
                      meta.iconBg,
                      meta.iconColor,
                    )}
                  >
                    {mod.module_key === 'sales' && (
                      <ShoppingCart className="h-3 w-3" />
                    )}
                    {mod.module_key === 'hrms' && <Users className="h-3 w-3" />}
                    {mod.module_key === 'inventory' && (
                      <Package className="h-3 w-3" />
                    )}
                    {mod.module_key === 'service_cloud' && (
                      <Headphones className="h-3 w-3" />
                    )}
                    {mod.module_key === 'funds' && (
                      <DollarSign className="h-3 w-3" />
                    )}
                  </div>
                  <span className="secondary-text-small text-foreground font-medium">
                    {meta.stat}
                  </span>
                  <span className="secondary-text-small text-muted-foreground">
                    · {mod.used_seats}/{mod.purchased_seats} seats
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div className="py-1">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="primary-heading-extra text-leadgaze-dark dark:text-white">Available Modules</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary gap-1.5"
            onClick={() => router.push('/org/subscription')}
          >
            Add modules
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 px-1">
          {enabledModules.map((mod) => (
            <ModuleCard
              key={mod.module_id}
              module={mod}
              onClick={() => {
                localStorage.setItem('selected_module', mod.module_key);
                router.push(getModuleRoute(mod.module_key));
              }}
            />
          ))}
        </div>

        {/* Footer note */}
        <Card className="mt-4">
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="text-muted-foreground h-4 w-4 shrink-0" />
            <p className="secondary-text-small text-muted-foreground">
              Access is controlled by your workspace role and seat assignment.
              Contact your admin if you need permissions adjusted.
              <button
                className="text-primary ml-1 font-medium hover:underline"
                onClick={() => router.push('/org/subscription')}
              >
                Manage subscription &rarr;
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Module Card ─────────────────────────────────────────────────

function ModuleCard({
  module: mod,
  onClick,
}: {
  module: WorkspaceSubscriptionStatus['enabled_modules'][0];
  onClick: () => void;
}) {
  const meta = getModuleMeta(mod.module_key);

  const seatPercent =
    mod.purchased_seats > 0
      ? Math.min(100, Math.round((mod.used_seats / mod.purchased_seats) * 100))
      : 0;

  const isNearCapacity = seatPercent >= 80;

  const statusLabel =
    mod.subscription_status === 'active'
      ? 'Active'
      : mod.subscription_status === 'trialing'
        ? 'Trial'
        : (mod.subscription_status?.replace(/_/g, ' ') ?? 'Inactive');

  const statusVariant =
    mod.subscription_status === 'active'
      ? 'success'
      : mod.subscription_status === 'trialing'
        ? 'warning'
        : ('secondary' as const);

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md"
      onClick={onClick}
    >
      {/* Top gradient accent */}
      <div
        className={cn(
          'h-1 bg-gradient-to-r',
          meta.gradient.replace('/10', '/60').replace('/5', '/30'),
        )}
      />

      <CardContent className="p-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg',
              meta.iconBg,
              meta.iconColor,
            )}
          >
            {meta.icon}
          </div>
          <Badge variant={statusVariant} className="text-[10px]">
            {statusLabel}
          </Badge>
        </div>

        {/* Module info */}
        <div className="mt-2">
          <h3 className="primary-heading text-leadgaze-dark dark:text-white">{mod.module_name}</h3>
          <p className="secondary-text-small text-muted-foreground mt-1">
            {meta.description}
          </p>
        </div>

        {/* Feature tags */}
        {meta.features.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {meta.features.map((f) => (
              <span
                key={f}
                className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Seat usage */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="secondary-text-small text-muted-foreground">
              Seat usage
            </span>
            <span className="secondary-text-small text-foreground font-semibold">
              {mod.used_seats} / {mod.purchased_seats}
            </span>
          </div>
          {mod.purchased_seats > 0 && (
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${seatPercent}%`,
                  backgroundColor: isNearCapacity
                    ? 'var(--destructive)'
                    : 'var(--primary)',
                }}
              />
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <div className="border-border bg-muted/30 group-hover:bg-muted/50 flex items-center justify-between border-t px-2 py-2 transition-colors">
        <span className="primary-text-medium text-primary">
          Open {meta.stat}
        </span>
        <ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Card>
  );
}
