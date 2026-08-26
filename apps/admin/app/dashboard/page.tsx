'use client';

import Link from 'next/link';

import {
  ArrowUpCircle,
  Ban,
  Building2,
  CircleDollarSign,
  CircleX,
  Clock,
  CreditCard,
  Eye,
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
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
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
    icon: Building2,
    iconBg: 'bg-blue-50 dark:bg-blue-900/40',
    iconColor: 'text-blue-500 dark:text-blue-400',
    text: 'Prestige Worldwide workspace created',
    time: '2h ago',
  },
  {
    id: 2,
    icon: ArrowUpCircle,
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    text: 'Dunder Mifflin upgraded Starter → Growth',
    time: '5h ago',
  },
  {
    id: 3,
    icon: CircleX,
    iconBg: 'bg-red-50 dark:bg-red-900/40',
    iconColor: 'text-red-500 dark:text-red-400',
    text: 'Payment failed · Initech ($149/mo)',
    time: '1d ago',
  },
  {
    id: 4,
    icon: Eye,
    iconBg: 'bg-purple-50 dark:bg-purple-900/40',
    iconColor: 'text-purple-500 dark:text-purple-400',
    text: 'Admin impersonated Wayne Corp workspace',
    time: '1d ago',
  },
  {
    id: 5,
    icon: Ban,
    iconBg: 'bg-amber-50 dark:bg-amber-900/40',
    iconColor: 'text-amber-500 dark:text-amber-400',
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
    <Card className="flex min-h-32 flex-col justify-between xl:h-28 2xl:h-32">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
        <div className="space-y-1">
          <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
            {label}
          </CardTitle>
          <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
            {value}
          </div>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
        {delta !== null ? (
          <CardDescription className="secondary-text-small flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
                positive
                  ? 'bg-admin-dashboard-badge-green text-admin-dashboard-badge-text-green'
                  : 'bg-admin-dashboard-badge-red text-admin-dashboard-badge-text-red'
              }`}
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
      headerClassName="p-2 xl:p-2 2xl:p-2"
      icon2={
        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold bg-admin-dashboard-badge-green text-admin-dashboard-badge-text-green">
          <TrendingUp className="h-3.5 w-3.5" />
          12.4% YoY
        </span>
      }
      contentClassName="px-2 py-2"
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
      headerClassName="p-2 xl:p-2 2xl:p-2"
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
    >
      <div className="py-0 overflow-auto">
        <CardWidgetList className="gap-0 mb-1">
          {RECENT_ACTIVITY.map((item) => {
            const Icon = item.icon;
            return (
              <CardWidgetListItem
                key={item.id}
                icon={
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
                    <Icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                }
                title={item.text}
                subtitle={item.time}
                className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                titleClassFormat="primary-text-medium text-leadgaze-dark dark:text-white leading-snug"
              />
            );
          })}
        </CardWidgetList>
      </div>
    </CardWidgetContainer>
  );
}

function ModuleAdoption() {
  return (
    <CardWidgetContainer 
      title="Module Adoption"
      headerClassName="p-2 xl:p-2 2xl:p-2"
    >
      <div className="space-y-4 px-2 py-2 max-h-[280px] overflow-auto">
        {MODULE_ADOPTION.map((mod) => (
          <div key={mod.name}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <span className={`secondary-text-small-semibold px-2 py-0.5 rounded-[4px] ${
                  mod.name.toLowerCase() === 'crm' ? "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" :
                  mod.name.toLowerCase() === 'hrms' ? "bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" :
                  mod.name.toLowerCase() === 'inventory' ? "bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" :
                  "bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"
                }`}>
                  {mod.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {mod.workspaces} workspaces · {mod.seats.toLocaleString()} seats
                </span>
              </div>
              <div className="secondary-text-small-semibold font-bold text-leadgaze-dark dark:text-white">
                {mod.mrr}
              </div>
            </div>
            <div className="bar-bg h-2 w-full overflow-hidden rounded-full bg-[#EDEEF0]">
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
    <CardWidgetContainer 
      title="Subscription Breakdown"
      headerClassName="p-2 xl:p-2 2xl:p-2"
    >
      <div className="space-y-4 px-2 py-2 max-h-[280px] overflow-auto">
        {SUBSCRIPTION_BREAKDOWN.map((sub) => (
          <div key={sub.plan}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
                  {sub.plan}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-muted-foreground text-xs">{sub.count}</span>
              </div>
              <div className="secondary-text-small-semibold font-bold text-leadgaze-dark dark:text-white">
                {sub.mrr}
              </div>
            </div>
            <div className="bar-bg h-2 w-full overflow-hidden rounded-full bg-[#EDEEF0]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${sub.color}`}
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
      headerClassName="p-2 xl:p-2 2xl:p-2"
      icon2={
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
          asChild
        >
          <Link href="/organization">View all</Link>
        </Button>
      }
    >
      <div className="py-0 overflow-auto">
        <CardWidgetList className="gap-0 mb-1">
          {TOP_WORKSPACES.map((ws) => (
            <CardWidgetListItem
              key={ws.rank}
              icon={
                <div className="flex items-center gap-3 pl-1">
                  <span className="w-5 text-center text-sm text-leadgaze-muted">
                    {ws.rank}
                  </span>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-none text-xs font-bold text-white ${ws.color}`}
                  >
                    {ws.initials}
                  </div>
                </div>
              }
              title={ws.name}
              titleClassFormat="primary-text-medium text-leadgaze-dark dark:text-zinc-100"
              badge={
                <div className="flex flex-col items-end gap-1">
                  <span className="secondary-text-small-bold text-leadgaze-dark dark:text-white">
                    {ws.mrr}
                  </span>
                  <Badge className={`shrink-0 rounded-full border-0 px-2 py-0 text-[10px] font-semibold ${PLAN_BADGE_COLORS[ws.plan] ?? ''}`}>
                    {ws.plan}
                  </Badge>
                </div>
              }
              className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none py-3"
              isBadgeVerticalCenter={true}
              subtitle={
                <div className="mt-2 flex items-center w-full pr-8">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-[#2563EB]"
                      style={{ width: `${ws.barPct}%` }}
                    />
                  </div>
                </div>
              }
            />
          ))}
        </CardWidgetList>
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
        <div className="flex flex-col space-y-2 pb-4">
          {/* ── Row 1: 4 workspace stat cards ── */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.slice(0, 4).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* ── Row 2: 4 revenue/metric stat cards ── */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.slice(4).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          {/* ── Row 3: Revenue chart (2/3) + Recent Activity (1/3) ── */}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MonthlyRevenueChart />
            </div>
            <RecentActivity />
          </div>

          {/* ── Row 4: Module Adoption + Subscription Breakdown + Top Workspaces ── */}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            <ModuleAdoption />
            <SubscriptionBreakdown />
            <TopWorkspacesByMRR />
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}
