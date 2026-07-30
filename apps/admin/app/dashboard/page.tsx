'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  DollarSign,
  Download,
  Layers,
  MoreVertical,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { DownloadReportButton } from '@kit/ui/download-report-button';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';

import { AdminNavbar } from '~/components/admin-navbar';

// Mock platform metric summary matching Web Dashboard structure
const MOCK_PLATFORM_STATS = [
  {
    title: 'Total Workspaces',
    value: '124',
    change: '+12%',
    isPositive: true,
    subtext: 'Active organizations on platform',
    icon: Building2,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    title: 'Total Active Users',
    value: '1,840',
    change: '+8.4%',
    isPositive: true,
    subtext: 'Registered team members',
    icon: Users,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    title: 'Platform Subscriptions',
    value: '$42,850',
    change: '+15.2%',
    isPositive: true,
    subtext: 'Monthly recurring revenue (MRR)',
    icon: DollarSign,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    title: 'System Health',
    value: '99.98%',
    change: 'Operational',
    isPositive: true,
    subtext: 'All services & DB running',
    icon: ShieldCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
];

const MOCK_WORKSPACES = [
  {
    id: 'ws-1',
    name: 'Acme Corporation',
    plan: 'Enterprise',
    members: 42,
    status: 'Active',
    mrr: '$2,499/mo',
    created: '2026-01-15',
  },
  {
    id: 'ws-2',
    name: 'Stark Industries',
    plan: 'Pro',
    members: 18,
    status: 'Active',
    mrr: '$499/mo',
    created: '2026-02-10',
  },
  {
    id: 'ws-3',
    name: 'Wayne Enterprises',
    plan: 'Enterprise',
    members: 85,
    status: 'Active',
    mrr: '$4,999/mo',
    created: '2026-03-01',
  },
  {
    id: 'ws-4',
    name: 'Cyberdyne Systems',
    plan: 'Starter',
    members: 5,
    status: 'Trial',
    mrr: '$99/mo',
    created: '2026-07-20',
  },
  {
    id: 'ws-5',
    name: 'Umbrella Corp',
    plan: 'Pro',
    members: 24,
    status: 'Active',
    mrr: '$899/mo',
    created: '2026-05-12',
  },
];

export default function AdminDashboardPage() {
  const { dateRange, setDateRange } = useDateRangeFilter();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadReport = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <AppShell navbar={<AdminNavbar />}>
      <PageHeader
        title="Admin Dashboard"
        description="Platform oversight, system metrics, and tenant workspaces"
      >
        <PageHeaderActions>
          <DownloadReportButton
            onDownload={handleDownloadReport}
            isGenerating={isGenerating}
          />
          <ListToolBar
            className="border-none bg-transparent p-0 shadow-none"
            showFilter
            filterGroups={[
              {
                key: 'created_on',
                label: 'Timeframe',
                type: 'date',
                dateValue: dateRange,
                onDateChange: setDateRange,
              },
            ]}
            activeFilterCount={dateRange ? 1 : 0}
            onClearFilters={() => setDateRange(null)}
          />
        </PageHeaderActions>
      </PageHeader>

      <PageBody>
        <div className="flex flex-col gap-6 pb-8">
          {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MOCK_PLATFORM_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="flex flex-col justify-between transition-shadow hover:shadow-sm"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 pb-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        {stat.title}
                      </p>
                      <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {stat.value}
                      </h3>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium"
                      >
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {stat.change}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {stat.subtext}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Workspaces Table Section */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent Workspaces
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Platform tenant organizations and subscription tier
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/workspaces">
                    View All Workspaces
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Workspace</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_WORKSPACES.map((ws) => (
                      <TableRow key={ws.id}>
                        <TableCell className="pl-6 font-medium text-zinc-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold text-xs">
                              {ws.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{ws.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {ws.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ws.members} users
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {ws.mrr}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              ws.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-50'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 hover:bg-amber-50'
                            }
                          >
                            {ws.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Platform Overview & Quick Actions */}
            <div className="flex flex-col gap-6">
              {/* Module Usage Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Module Usage Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Active sub-modules across customer tenants
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'CRM & Sales', percentage: 78, color: 'bg-blue-600' },
                    { name: 'Service Cloud', percentage: 54, color: 'bg-emerald-500' },
                    { name: 'HRMS', percentage: 42, color: 'bg-purple-500' },
                    { name: 'Inventory & Operations', percentage: 31, color: 'bg-amber-500' },
                    { name: 'Fundraising Desk', percentage: 18, color: 'bg-indigo-500' },
                  ].map((mod) => (
                    <div key={mod.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span>{mod.name}</span>
                        <span className="text-muted-foreground">{mod.percentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${mod.color}`}
                          style={{ width: `${mod.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Platform Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Quick Platform Actions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Administrative tasks & platform management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <Button variant="outline" className="w-full justify-start gap-2.5" asChild>
                    <Link href="/workspaces">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span>Manage All Workspaces</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2.5" asChild>
                    <Link href="/users">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span>Platform User Directory</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2.5" asChild>
                    <Link href="/plans">
                      <Layers className="h-4 w-4 text-purple-600" />
                      <span>Subscription Plans & Tiers</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2.5" asChild>
                    <Link href="/billing">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      <span>Billing & Financial Reports</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}
