'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Clock,
  CreditCard,
  DollarSign,
  Headphones,
  Loader2,
  Package,
  Shield,
  ShoppingCart,
  Users,
} from 'lucide-react';

import {
  type WorkspaceSubscriptionStatus,
  getWorkspaceSubscriptionService,
} from '@kit/core/services';
import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';

import { WorkspaceCheckWrapper } from '~/home/_components/workspace-check-wrapper';
import { useRBAC } from '~/lib/rbac/rbac-provider';

// ─── Constants ───────────────────────────────────────────────────

const MODULE_DASHBOARD_ROUTES: Record<string, string> = {
  sales: '/home/sales/leads',
  hrms: '/home/hrms',
  inventory: '/home/inventory',
  service_cloud: '/home/services',
  funds: '/home/funds',
};

const MODULE_META: Record<
  string,
  {
    icon: React.ReactNode;
    accentColor: string;
    bgClass: string;
    description: string;
    stat: string;
  }
> = {
  sales: {
    icon: <ShoppingCart className="h-5 w-5" />,
    accentColor: '#0176d3',
    bgClass: 'bg-[#e8f4fd]',
    description: 'Leads, contacts, accounts & pipeline',
    stat: 'CRM',
  },
  hrms: {
    icon: <Users className="h-5 w-5" />,
    accentColor: '#9050dd',
    bgClass: 'bg-[#f5f0fd]',
    description: 'Employees, attendance, payroll & more',
    stat: 'HRMS',
  },
  inventory: {
    icon: <Package className="h-5 w-5" />,
    accentColor: '#2e844a',
    bgClass: 'bg-[#eef5f0]',
    description: 'Products, stock, purchases & orders',
    stat: 'IMS',
  },
  service_cloud: {
    icon: <Headphones className="h-5 w-5" />,
    accentColor: '#dd7a01',
    bgClass: 'bg-[#fdf4e5]',
    description: 'Tickets, inboxes & customer support',
    stat: 'Service',
  },
  funds: {
    icon: <DollarSign className="h-5 w-5" />,
    accentColor: '#0b7764',
    bgClass: 'bg-[#e5f4f1]',
    description: 'Investors, rounds & deal pipeline',
    stat: 'Funds',
  },
};

function getModuleMeta(key: string) {
  return (
    MODULE_META[key] ?? {
      icon: <Box className="h-5 w-5" />,
      accentColor: '#5c5e66',
      bgClass: 'bg-slate-50',
      description: 'Module',
      stat: key.toUpperCase(),
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
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id ?? '';

  const { data, isLoading } = useQuery<WorkspaceSubscriptionStatus>({
    queryKey: ['workspace-subscription', workspaceId],
    queryFn: () => getWorkspaceSubscriptionService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const enabledModules = useMemo(() => data?.enabled_modules ?? [], [data]);

  // Auto-redirect logic
  useEffect(() => {
    if (isLoading || !data) return;
    if (!data.is_subscription_valid && data.is_trial_expired) return;

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
      } else {
        localStorage.removeItem('selected_module');
      }
    }

    if (enabledModules.length === 1) {
      const mod = enabledModules[0];
      if (mod) {
        localStorage.setItem('selected_module', mod.module_key);
        router.replace(getModuleRoute(mod.module_key));
      }
    }
  }, [data, isLoading, enabledModules, router]);

  // Loading
  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f2f2]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <LeadgazeLogo size={32} />
            <span className="text-xl font-semibold tracking-tight text-[#1b2533]">
              Leadgaze
            </span>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-[#0176d3]" />
        </div>
      </div>
    );
  }

  // No active subscription and no modules
  if (enabledModules.length === 0 && !data.is_subscription_valid) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#f3f2f2]">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-[#dddbda] bg-white p-10 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fce9e9]">
            <AlertTriangle className="h-7 w-7 text-[#c23934]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1b2533]">
              No Active Subscription
            </h2>
            <p className="mt-1 text-sm text-[#54698d]">
              Your workspace does not have any active modules. Subscribe to a
              module to get started.
            </p>
          </div>
          <Button
            className="bg-[#0176d3] text-white hover:bg-[#0161b0]"
            onClick={() => router.push('/org/subscription')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Subscribe Now
          </Button>
        </div>
      </div>
    );
  }

  // Subscription expired
  if (!data.is_subscription_valid && data.is_trial_expired) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#f3f2f2]">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-[#dddbda] bg-white p-10 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fce9e9]">
            <AlertTriangle className="h-7 w-7 text-[#c23934]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1b2533]">
              Subscription Expired
            </h2>
            <p className="mt-1 text-sm text-[#54698d]">
              Your subscription has ended. Renew to regain access to all
              Leadgaze modules.
            </p>
          </div>
          <Button
            className="bg-[#0176d3] text-white hover:bg-[#0161b0]"
            onClick={() => router.push('/org/subscription')}
          >
            Renew Subscription
          </Button>
        </div>
      </div>
    );
  }

  // Single module — redirect happening via useEffect
  if (enabledModules.length <= 1) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f2f2]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0176d3]" />
      </div>
    );
  }

  // Multiple modules — show selector
  return (
    <div className="min-h-screen bg-[#f3f2f2]">
      {/* Top bar */}
      <header className="border-b border-[#dddbda] bg-[#1b2533] px-6 py-0">
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-3">
            <LeadgazeLogo size={24} inverted />
            <span className="text-sm font-semibold tracking-wide text-white">
              LEADGAZE
            </span>
            <div className="mx-2 h-4 w-px bg-white/20" />
            <span className="text-xs text-white/50">Platform</span>
          </div>
          <div className="flex items-center gap-3">
            {data.subscription?.status === 'trialing' &&
              data.trial_days_remaining != null && (
                <button
                  className="flex items-center gap-1.5 rounded bg-[#dd7a01] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#c96d00]"
                  onClick={() => router.push('/org/subscription')}
                >
                  <Clock className="h-3 w-3" />
                  {data.trial_days_remaining}d trial remaining
                </button>
              )}
            <button
              className="flex items-center gap-1.5 rounded border border-white/20 px-3 py-1 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
              onClick={() => router.push('/org/subscription')}
            >
              <CreditCard className="h-3 w-3" />
              Manage plan
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-[#dddbda] bg-white px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-widest text-[#0176d3] uppercase">
                Leadgaze Platform
              </p>
              <h1 className="text-2xl font-bold text-[#1b2533]">
                {currentWorkspace?.name ?? 'Your Workspace'}
              </h1>
              <p className="mt-1.5 text-sm text-[#54698d]">
                Select a module to continue. Your access is based on your
                current subscription plan.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#4bca81]" />
                <span className="text-xs font-medium text-[#2e844a]">
                  All systems operational
                </span>
              </div>
              <span className="text-xs text-[#706e6b]">
                {enabledModules.length} module
                {enabledModules.length !== 1 ? 's' : ''} active
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {enabledModules.map((mod) => {
              const meta = getModuleMeta(mod.module_key);
              return (
                <div
                  key={mod.module_id}
                  className="rounded-md border border-[#dddbda] bg-[#f3f2f2] px-3 py-2.5 text-center"
                >
                  <p className="text-[11px] font-semibold tracking-wider text-[#706e6b] uppercase">
                    {meta.stat}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-[#1b2533]">
                    {mod.purchased_seats}
                  </p>
                  <p className="text-[10px] text-[#9ea4ac]">seats</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-widest text-[#706e6b] uppercase">
            Available Modules
          </h2>
          <button
            className="flex items-center gap-1.5 text-xs text-[#0176d3] hover:underline"
            onClick={() => router.push('/org/subscription')}
          >
            Add modules
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="mt-10 flex items-center gap-2 rounded-md border border-[#dddbda] bg-white px-4 py-3">
          <Shield className="h-4 w-4 shrink-0 text-[#706e6b]" />
          <p className="text-xs text-[#706e6b]">
            Access is controlled by your workspace role and seat assignment.
            Contact your admin if you need permissions adjusted.
            <button
              className="ml-1 text-[#0176d3] hover:underline"
              onClick={() => router.push('/org/subscription')}
            >
              Manage subscription &rarr;
            </button>
          </p>
        </div>
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
  const [hovered, setHovered] = useState(false);
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

  const statusDot =
    mod.subscription_status === 'active'
      ? 'bg-[#4bca81]'
      : mod.subscription_status === 'trialing'
        ? 'bg-[#dd7a01]'
        : 'bg-[#aeacaa]';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative flex flex-col rounded-md border bg-white text-left shadow-sm transition-all duration-200',
        hovered ? 'shadow-md' : 'border-[#dddbda]',
      )}
      style={{
        borderColor: hovered ? meta.accentColor : undefined,
        outline: hovered ? `1px solid ${meta.accentColor}` : 'none',
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full rounded-t-md transition-opacity"
        style={{
          backgroundColor: meta.accentColor,
          opacity: hovered ? 1 : 0.4,
        }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md',
              meta.bgClass,
            )}
            style={{ color: meta.accentColor }}
          >
            {meta.icon}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', statusDot)} />
            <span className="text-[11px] font-medium text-[#54698d]">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Module info */}
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-[#1b2533]">
            {mod.module_name}
          </h3>
          <p className="mt-0.5 text-xs text-[#706e6b]">{meta.description}</p>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-[#f3f2f2]" />

        {/* Seat usage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#706e6b]">Seat usage</span>
            <span className="text-[11px] font-medium text-[#1b2533]">
              {mod.used_seats} / {mod.purchased_seats}
            </span>
          </div>
          {mod.purchased_seats > 0 && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#f3f2f2]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${seatPercent}%`,
                  backgroundColor: isNearCapacity
                    ? '#c23934'
                    : meta.accentColor,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Open module footer */}
      <div
        className={cn(
          'flex items-center justify-between rounded-b-md border-t border-[#f3f2f2] px-5 py-3 transition-colors',
          hovered ? 'bg-[#f3f2f2]' : 'bg-transparent',
        )}
      >
        <span
          className="text-xs font-medium"
          style={{ color: meta.accentColor }}
        >
          Open {meta.stat}
        </span>
        <ArrowUpRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: meta.accentColor }}
        />
      </div>
    </button>
  );
}

// ─── Logo ────────────────────────────────────────────────────────

function LeadgazeLogo({
  size = 28,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const fg = inverted ? '#fff' : '#0176d3';
  const bg = inverted ? '#0176d3' : '#e8f4fd';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill={bg} />
      <path
        d="M8 22L14 10L20 18L24 14"
        stroke={fg}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="14" r="2.5" fill={fg} />
    </svg>
  );
}
