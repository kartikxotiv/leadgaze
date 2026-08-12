'use client';

import Link from 'next/link';

import {
  Building2,
  CircleDollarSign,
  Clock,
  CreditCard,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@kit/ui/chart';
import { PageBody, PageHeader } from '@kit/ui/page';

import { AdminNavbar } from '~/components/admin-navbar';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const STAT_CARDS = [
  {
    label: 'TOTAL WORKSPACES',
    value: '142',
    delta: '+8',
    deltaLabel: 'this month',
    positive: true,
    icon: Building2,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    label: 'ACTIVE WORKSPACES',
    value: '118',
    delta: '+5',
    deltaLabel: 'vs last month',
    positive: true,
    icon: UserCheck,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    label: 'TRIAL WORKSPACES',
    value: '18',
    delta: '+3',
    deltaLabel: 'new trials',
    positive: true,
    icon: Clock,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    label: 'PAYING WORKSPACES',
    value: '100',
    delta: '+5',
    deltaLabel: 'vs last month',
    positive: true,
    icon: CreditCard,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    label: 'MRR',
    value: '$48,200',
    delta: '+$1,200',
    deltaLabel: 'vs Jun',
    positive: true,
    icon: CircleDollarSign,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    label: 'ARR',
    value: '$578,400',
    delta: null,
    deltaLabel: 'Projected annualised',
    positive: true,
    icon: TrendingUp,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    label: 'ACTIVE USERS',
    value: '1,847',
    delta: '+124',
    deltaLabel: 'this month',
    positive: true,
    icon: Users,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    label: 'CHURN RATE',
    value: '2.4%',
    delta: '-0.3%',
    deltaLabel: 'vs last month',
    // positive=false because churn going down is good — but we show red for the value
    positive: false,
    icon: TrendingDown,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-50 dark:bg-red-950/40',
  },
];

const MONTHLY_REVENUE = [
  { month: 'Aug', current: 28000, prior: true },
  { month: 'Sep', current: 30500, prior: true },
  { month: 'Oct', current: 31000, prior: true },
  { month: 'Nov', current: 33000, prior: true },
  { month: 'Dec', current: 35500, prior: true },
  { month: 'Jan', current: 36800, prior: true },
  { month: 'Feb', current: 38200, prior: true },
  { month: 'Mar', current: 40100, prior: true },
  { month: 'Apr', current: 42500, prior: true },
  { month: 'May', current: 44000, prior: true },
  { month: 'Jun', current: 46800, prior: true },
  { month: 'Jul', current: 48200, prior: false },
];

const chartConfig = {
  current: {
    label: 'Revenue',
    color: '#3b5bdb',
  },
} satisfies ChartConfig;

const RECENT_ACTIVITY = [
  {
    id: 1,
    icon: '🏢',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'Prestige Worldwide workspace created',
    time: '2h ago',
  },
  {
    id: 2,
    icon: '↑',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'Dunder Mifflin upgraded Starter → Growth',
    time: '5h ago',
  },
  {
    id: 3,
    icon: '⊗',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    text: 'Payment failed · Initech ($149/mo)',
    time: '1d ago',
  },
  {
    id: 4,
    icon: '👁',
    iconBg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'Admin impersonated Wayne Corp workspace',
    time: '1d ago',
  },
  {
    id: 5,
    icon: '⚠',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'Bill Lumbergh account suspended',
    time: '2d ago',
  },
];

const MODULE_ADOPTION = [
  { name: 'CRM', workspaces: 142, seats: 1847, mrr: '$38,400', color: 'bg-blue-600', pct: 85 },
  { name: 'HRMS', workspaces: 48, seats: 620, mrr: '$7,200', color: 'bg-purple-500', pct: 34 },
  { name: 'Inventory', workspaces: 21, seats: 280, mrr: '$2,600', color: 'bg-amber-400', pct: 15 },
];

const SUBSCRIPTION_BREAKDOWN = [
  { plan: 'Enterprise', count: 12, mrr: '$28,800', color: 'bg-blue-700', pct: 100 },
  { plan: 'Growth (Monthly)', count: 45, mrr: '$13,050', color: 'bg-blue-400', pct: 45 },
  { plan: 'Starter (Monthly)', count: 43, mrr: '$6,407', color: 'bg-slate-400', pct: 22 },
  { plan: 'Trial Accounts', count: 18, mrr: '–', color: 'bg-amber-400', pct: 12 },
];

const TOP_WORKSPACES = [
  { rank: 1, name: 'Wayne Corp', initials: 'W', color: 'bg-blue-600', mrr: '$2,400', plan: 'Enterprise', barPct: 100 },
  { rank: 2, name: 'Pied Piper', initials: 'P', color: 'bg-purple-500', mrr: '$1,800', plan: 'Enterprise', barPct: 75 },
  { rank: 3, name: 'Acme Corp', initials: 'A', color: 'bg-emerald-500', mrr: '$1,290', plan: 'Growth', barPct: 54 },
  { rank: 4, name: 'Dunder Mifflin', initials: 'D', color: 'bg-amber-500', mrr: '$720', plan: 'Growth', barPct: 30 },
  { rank: 5, name: 'Stark Industries', initials: 'S', color: 'bg-red-500', mrr: '$890', plan: 'Growth', barPct: 37 },
];

const PLAN_BADGE_COLORS: Record<string, string> = {
  Enterprise: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Growth: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Starter: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  positive,
  icon: Icon,
  iconColor,
  iconBg,
}: (typeof STAT_CARDS)[number]) {
  return (
    <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
        <div className="space-y-1">
          <CardTitle className="secondary-text-small text-leadgaze-muted dark:text-white">
            {label}
          </CardTitle>
          <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
        {delta !== null ? (
          <CardDescription className="secondary-text-small flex items-center gap-1">
            <span
              className={`flex items-center gap-0.5 font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta}
            </span>
            <span className="text-leadgaze-muted">{deltaLabel}</span>
          </CardDescription>
        ) : (
          <CardDescription className="secondary-text-small text-leadgaze-muted">
            {deltaLabel}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyRevenueChart() {
  return (
    <CardWidgetContainer
      title="Monthly Revenue"
      icon2={
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          12.4% YoY
        </span>
      }
      contentClassName="px-4 pb-4"
    >
      <ChartContainer config={chartConfig} className="h-52 w-full">
        <BarChart data={MONTHLY_REVENUE} barCategoryGap="20%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <ChartTooltip
            cursor={{ fill: 'rgba(59,91,219,0.07)' }}
            content={
              <ChartTooltipContent
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
              />
            }
          />
          <Bar dataKey="current" radius={[3, 3, 0, 0]}>
            {MONTHLY_REVENUE.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.prior ? '#93aeed' : '#3b5bdb'} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#3b5bdb]" />
          Current Month
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#93aeed]" />
          Prior Months
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-emerald-400" />
          Workspace Growth
        </span>
      </div>
    </CardWidgetContainer>
  );
}

function RecentActivity() {
  return (
    <CardWidgetContainer
      title="Recent Activity"
      icon2={
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
          asChild
        >
          <Link href="/audit-logs">View all</Link>
        </Button>
      }
      contentClassName="px-0 pb-0"
    >
      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        {RECENT_ACTIVITY.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${item.iconBg}`}
            >
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="primary-text-medium text-leadgaze-dark dark:text-white leading-snug">
                {item.text}
              </p>
              <p className="mt-0.5 text-xs text-leadgaze-muted dark:text-zinc-500">
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </CardWidgetContainer>
  );
}

function ModuleAdoption() {
  return (
    <CardWidgetContainer title="Module Adoption">
      <div className="flex flex-col gap-4 p-6 xl:p-4 2xl:p-6">
        {MODULE_ADOPTION.map((mod) => (
          <div key={mod.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="primary-text-medium text-blue-600 dark:text-blue-400">
                  {mod.name}
                </span>
                <span className="primary-text-regular text-leadgaze-muted">
                  {mod.workspaces} workspaces · {mod.seats.toLocaleString()} seats
                </span>
              </div>
              <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-100">
                {mod.mrr}
              </span>
            </div>
            <div className="bar-bg h-2 w-full overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-500 ${mod.color}`}
                style={{ width: `${mod.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardWidgetContainer>
  );
}

function SubscriptionBreakdown() {
  return (
    <CardWidgetContainer title="Subscription Breakdown">
      <div className="flex flex-col gap-4 p-6 xl:p-4 2xl:p-6">
        {SUBSCRIPTION_BREAKDOWN.map((sub) => (
          <div key={sub.plan} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-200">
                  {sub.plan}
                </span>
                <span className="primary-text-regular text-leadgaze-muted">
                  · {sub.count}
                </span>
              </div>
              <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-100">
                {sub.mrr}
              </span>
            </div>
            <div className="bar-bg h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${sub.color}`}
                style={{ width: `${sub.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardWidgetContainer>
  );
}

function TopWorkspacesByMRR() {
  return (
    <CardWidgetContainer
      title="Top Workspaces by MRR"
      icon2={
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
          asChild
        >
          <Link href="/workspaces">View all</Link>
        </Button>
      }
      contentClassName="px-4 pb-2"
    >
      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        {TOP_WORKSPACES.map((ws) => (
          <div key={ws.rank} className="flex items-center gap-3 py-3">
            <span className="w-4 shrink-0 text-center primary-text-regular text-leadgaze-muted">
              {ws.rank}
            </span>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${ws.color}`}
            >
              {ws.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-100">
                  {ws.name}
                </span>
                <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-100 ml-2 shrink-0">
                  {ws.mrr}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="bar-bg h-1 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${ws.barPct}%` }}
                  />
                </div>
                <Badge
                  className={`shrink-0 rounded border-0 px-1.5 py-0 text-[10px] font-semibold ${PLAN_BADGE_COLORS[ws.plan] ?? ''}`}
                >
                  {ws.plan}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardWidgetContainer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  return (
    <AppShell navbar={<AdminNavbar />}>
      {/* Page header — identical pattern to web app's leads/contacts/dashboard */}
      <PageHeader title="Super Admin Dashboard" />

      <PageBody>
        <div className="flex flex-col pb-4">
          {/* ── Row 1: 4 workspace stat cards ── */}
          <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 xl:pb-4 2xl:grid-cols-4 2xl:gap-4 2xl:pb-6">
            {STAT_CARDS.slice(0, 4).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* ── Row 2: 4 revenue/metric stat cards ── */}
          <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 xl:pb-4 2xl:grid-cols-4 2xl:gap-4 2xl:pb-6">
            {STAT_CARDS.slice(4).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* ── Row 3: Revenue chart (2/3) + Recent Activity (1/3) ── */}
          <div className="grid grid-cols-1 gap-4 pb-6 lg:grid-cols-3 xl:gap-4 xl:pb-4 2xl:gap-4 2xl:pb-6">
            <div className="lg:col-span-2">
              <MonthlyRevenueChart />
            </div>
            <RecentActivity />
          </div>

          {/* ── Row 4: Module Adoption + Subscription Breakdown + Top Workspaces ── */}
          <div className="grid grid-cols-1 gap-4 pb-4 lg:grid-cols-3 xl:gap-4 2xl:gap-4">
            <ModuleAdoption />
            <SubscriptionBreakdown />
            <TopWorkspacesByMRR />
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}
