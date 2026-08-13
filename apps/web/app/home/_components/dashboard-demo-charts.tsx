'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, File, Menu, TrendingUp } from 'lucide-react';
import {
  AlertTriangle,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  FileText,
  Mail,
  Phone,
  Plus,
  Target,
  User,
  Users,
  Video,
  Calendar,
  ChevronDown,
  GripVertical,
  History,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
} from 'recharts';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TablePagination } from '@kit/ui/table-pagination';

import { useLocalization } from '~/lib/localization/localization-provider';
import { convertFromUSD, findLatestRateToUsd } from '@kit/shared/currency';
import type { ExchangeRateRecord } from '@kit/shared/currency';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  DashboardMetrics,
  DashboardTask,
  getDashboardMetricsService,
} from '~/services/dashboard.service';

import { CreateAccountDialog } from '../accounts/components/create-account-dialog';
import { CreateContactDialog } from '../contacts/components/create-contact-dialog';
import CreateLeadDialog from '../leads/components/create-lead-dialog';
import { OpportunityDialog } from '../opportunities/components/opportunity-dialog';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { Skeleton } from '@kit/ui/skeleton';

export default function DashboardDemo({
  dateFilter,
  dateRange,
  isWidgetLibraryOpen,
}: {
  dateFilter?: { from: string | null; to: string | null } | null;
  dateRange?: any;
  isWidgetLibraryOpen?: boolean;
}) {
  const { currentWorkspace } = useRBAC();
  const { formatCurrency } = useLocalization();
  const supabase = useSupabase();
  const workspaceId = currentWorkspace?.id;

  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-metrics', workspaceId, dateFilter],
    queryFn: () => getDashboardMetricsService(workspaceId!, dateFilter),
    enabled: !!workspaceId,
  });

  // OPTIMIZED: Use workspace initialization data instead of separate DB queries
  const workspaceCurrency = currentWorkspace?.localization?.default_currency || 'USD';
  const exchangeRates = currentWorkspace?.localization?.exchange_rates || [];
  const pipelineValueUsd = metrics?.opportunities?.totalAmount ?? 0;
  const rate = findLatestRateToUsd(exchangeRates as ExchangeRateRecord[], workspaceCurrency)?.exchange_rate || 1;
  const pipelineValue = convertFromUSD(pipelineValueUsd, rate);

  const queryClient = useQueryClient();
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isCreateOpportunityOpen, setIsCreateOpportunityOpen] = useState(false);

  const queryString = useMemo(() => {
    if (!dateRange || !dateRange.preset) return '';
    const params = new URLSearchParams();
    params.set('timeframePreset', dateRange.preset);
    if (dateRange.from) params.set('timeframeFrom', dateRange.from);
    if (dateRange.to) params.set('timeframeTo', dateRange.to);
    return `?${params.toString()}`;
  }, [dateRange]);

  const handleCreateSuccess = () => {
    refetch();
    // Also refetch recent contacts if table is visible
    queryClient.invalidateQueries({
      queryKey: ['contacts', 'recent', workspaceId],
    });
  };

  const leadsTrend = useMemo(() => generateDemoData(), []);
  const contactsTrend = useMemo(() => generateDemoData(), []);
  const accountsTrend = useMemo(() => generateDemoData(), []);
  const opportunitiesTrend = useMemo(() => generateDemoData(), []);

  if (isLoading || !metrics) {
    return <SalesDashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in flex flex-col pb-4 duration-500 w-full relative">
      <div className="flex w-full gap-6 items-start">
        <div className={`flex flex-col transition-all duration-300 ${isWidgetLibraryOpen ? 'w-[calc(100%-300px)] xl:w-[calc(100%-320px)]' : 'w-full'}`}>
          <div
            className={
              'grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 xl:pb-4 2xl:grid-cols-4 2xl:gap-4 2xl:pb-6'
            }
          >
            <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
                <div className="space-y-1">
                  <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
                Total Leads
              </CardTitle>
              <Link
                href={`/home/sales/leads${queryString}`}
                className="hover:underline"
              >
                <Figure>{metrics.leads.total}</Figure>
              </Link>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary dark:bg-primary">
              <File className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
            <CardDescription className="secondary-text-small text-leadgaze-success">
              Potential customers in the funnel
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
            <div className="space-y-1">
              <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
                Contacts
              </CardTitle>
              <Link
                href={`/home/sales/contacts${queryString}`}
                className="hover:underline"
              >
                <Figure>{metrics.contacts.total}</Figure>
              </Link>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-activity-5">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
            <CardDescription className="secondary-text-small text-leadgaze-success">
              Total individual relationships
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
            <div className="space-y-1">
              <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
                Accounts
              </CardTitle>
              <Link
                href={`/home/sales/accounts${queryString}`}
                className="hover:underline"
              >
                <Figure>{metrics.accounts.total}</Figure>
              </Link>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-activity-3">
              <Building2 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
            <CardDescription className="secondary-text-small text-leadgaze-success">
              Total company organizations
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
            <div className="space-y-1">
              <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
                Pipeline Value
              </CardTitle>
              <Link
                href={`/home/sales/opportunities${queryString}`}
                className="hover:underline"
              >
                <Figure>
                  {formatCurrency(pipelineValue, workspaceCurrency)}
                </Figure>
              </Link>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-activity-4">
              <Target className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
            <CardDescription className="secondary-text-small text-leadgaze-success">
              Total value of opportunities
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* <VisitorsChart /> */}

      {/* <PageViewsChart /> */}

      {/* <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
        <Card className="flex flex-1 flex-col overflow-hidden border-none shadow-none">
          <CardHeader className="shrink-0 p-2 pb-4">
            <CardTitle>Recent Contacts</CardTitle>
            <CardDescription>
              Latest contacts added to your workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <RecentContactsTable workspaceId={workspaceId!} />
          </CardContent>
        </Card>
      </div> */}

      {/* section 2 */}

      {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3 2xl:grid-cols-4 2xl:gap-4"> */}
      {/* <Button
          variant="outline"
          className="h-13 flex-col gap-2 rounded-xl border-slate-100 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          onClick={() => setIsCreateLeadOpen(true)}
        >
          <div className="flex items-center gap-2 xl:gap-1.5 2xl:gap-2">
            <Plus className="h-6 w-6 text-slate-500 xl:h-4 xl:w-4 2xl:h-6 2xl:w-6 dark:text-zinc-400" />
            <span className="text-[16px] font-semibold text-slate-700 xl:text-sm 2xl:text-[16px] dark:text-zinc-200">
              Add Lead
            </span>
          </div>
        </Button>         */}

      {/* <Button
          variant="outline"
          className="h-13 flex-col gap-2 rounded-xl border-slate-100 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          onClick={() => setIsCreateContactOpen(true)}
        >
          <div className="flex items-center gap-2 xl:gap-1.5 2xl:gap-2">
            <User className="h-6 w-6 text-slate-500 xl:h-4 xl:w-4 2xl:h-6 2xl:w-6 dark:text-zinc-400" />
            <span className="text-[16px] font-semibold text-slate-700 xl:text-sm 2xl:text-[16px] dark:text-zinc-200">
              Add Contact
            </span>
          </div>
        </Button> */}

      {/* <Button
          variant="outline"
          className="h-13 flex-col gap-2 rounded-xl border-slate-100 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          onClick={() => setIsCreateAccountOpen(true)}
        >
          <div className="flex items-center gap-2 xl:gap-1.5 2xl:gap-2">
            <Briefcase className="h-6 w-6 text-slate-500 xl:h-4 xl:w-4 2xl:h-6 2xl:w-6 dark:text-zinc-400" />
            <span className="text-[16px] font-semibold text-slate-700 xl:text-sm 2xl:text-[16px] dark:text-zinc-200">
              Add Account
            </span>
          </div>
        </Button> */}

      {/* <Button
          variant="outline"
          className="h-13 flex-col gap-2 rounded-xl border-slate-100 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          onClick={() => setIsCreateOpportunityOpen(true)}
        >
          <div className="flex items-center gap-2 xl:gap-1.5 2xl:gap-2">
            <BriefcaseBusiness className="h-6 w-6 text-slate-500 xl:h-4 xl:w-4 2xl:h-6 2xl:w-6 dark:text-zinc-400" />
            <span className="text-[16px] font-semibold text-slate-700 xl:text-sm 2xl:text-[16px] dark:text-zinc-200">
              Add Opportunity
            </span>
          </div>
        </Button> */}
      {/* </div> */}

      <CreateLeadDialog
        open={isCreateLeadOpen}
        onOpenChange={setIsCreateLeadOpen}
        onSuccess={handleCreateSuccess}
      />

      <CreateContactDialog
        open={isCreateContactOpen}
        onOpenChange={setIsCreateContactOpen}
        onSuccess={handleCreateSuccess}
      />

      <CreateAccountDialog
        open={isCreateAccountOpen}
        onOpenChange={setIsCreateAccountOpen}
        onSuccess={handleCreateSuccess}
      />

      <OpportunityDialog
        isOpen={isCreateOpportunityOpen}
        onOpenChange={setIsCreateOpportunityOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Section 3: Pipeline & Upcoming Tasks and Masonry */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-4 2xl:gap-4 mt-2">
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          <CardWidgetContainer title="Lead Pipeline">
            <div className="flex-1 h-[360px] overflow-auto">
              <PipelineOverview metrics={metrics} />
            </div>
          </CardWidgetContainer>

          <LatestLeadsTable />

          <CardWidgetContainer title="Upcoming Tasks" icon2={<Calendar className="w-5 h-5 text-leadgaze-muted dark:text-white" />}>
            <div className="flex-1 h-[360px] overflow-auto">
              <UpcomingTasks tasks={metrics.upcomingTasks} />
            </div>
          </CardWidgetContainer>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          <AccountGrowthTrends />
          
          <CardWidgetContainer title="Recent Action" icon2={<History className="w-4 h-4 text-leadgaze-muted" />}>
             <div className="flex-1 h-[360px] overflow-auto">
               <RecentActionsList />
             </div>
          </CardWidgetContainer>

          <LatestAccountsTable />
        </div>
      </div>
      
        </div>

        {/* Widget Library Sidebar */}
        {isWidgetLibraryOpen && (
          <div className="w-[300px] xl:w-[320px] shrink-0 sticky top-4 h-[calc(100vh-140px)]">
            <WidgetLibrary />
          </div>
        )}
      </div>

    </div>
  );
}

function PipelineOverview({ metrics }: { metrics: DashboardMetrics }) {
  const pipeline = metrics.pipeline || {
    newLeads: 0,
    contacted: 0,
    qualified: 0,
    proposalSent: 0,
    won: 0,
  };

  const stages = [
    { label: 'New Leads', value: pipeline.newLeads },
    { label: 'Contacted', value: pipeline.contacted },
    { label: 'Qualified', value: pipeline.qualified },
    { label: 'Proposal Sent', value: pipeline.proposalSent },
    { label: 'Won', value: pipeline.won },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="max-h-[400px] space-y-6 p-6 xl:max-h-[430px] xl:space-y-4 xl:p-4 2xl:max-h-[440px] 2xl:space-y-6 2xl:p-6 overflow-auto">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="primary-text-medium text-leadgaze-dark dark:text-white">
              {stage.label}
            </span>
            <span className="primary-text-regular text-leadgaze-muted dark:text-white">
              {stage.value}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden bar-bg rounded-full">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${(stage.value / maxValue) * 100}%`, backgroundColor: `var(--color-activity-${index + 1})` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingTasks({ tasks }: { tasks: DashboardTask[] }) {
  const { formatDate } = useLocalization();

  const formatDueDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    // Normalize both dates to midnight local time for comparison
    const dateMidnight = new Date(date);
    dateMidnight.setHours(0, 0, 0, 0);

    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    const timeDiff = dateMidnight.getTime() - todayMidnight.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    if (dayDiff > 1) return `In ${dayDiff} days`;
    if (dayDiff === -1) return 'Yesterday';
    if (dayDiff < -1) return 'Overdue';
    return formatDate(dateString);
  };

  const getTaskPriority = (task: DashboardTask) => {
    switch (task.priority?.toLowerCase()) {
      case 'high':
        return {
          label: 'high',
          bg: 'var(--color-status-danger-bg)',
          text: 'var(--color-status-danger-text)',
        };
      case 'low':
        return {
          label: 'low',
          bg: 'var(--color-status-neutral-bg)',
          text: 'var(--color-status-neutral-text)',
        };
      default:
        return {
          label: 'medium',
          bg: 'var(--color-status-warning-bg)',
          text: 'var(--color-status-warning-text)',
        };
    }
  };

  const latestTasks = useMemo(() => tasks ?? [], [tasks]);

  return (
    <div className="">
      {latestTasks.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-slate-400">
          <FileText className="mb-2 h-8 w-8 opacity-20" />
          <p className="text-sm">No upcoming tasks</p>
        </div>
      ) : (
        <div className="divide-y dark:divide-zinc-800 max-h-[300px] overflow-y-auto xl:max-h-[300px] 2xl:max-h-[300px] overflow-auto">
          {latestTasks.map((task) => {
            const relativeDate = formatDueDateShort(task.dueDate);
            const priority = getTaskPriority(task);
            return (
              <div
                key={task.id}
                className="flex items-center justify-between px-6 py-2 transition-colors hover:bg-slate-50/30 dark:hover:bg-zinc-800/30 border-b border-gray-300 last:border-0 xl:px-4 2xl:px-6"
              >
                <div className="flex items-start gap-4">

                  <div className="flex flex-col gap-0.5">
                    <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-200">
                      {task.title}
                      {task.entityName && (
                        <span className="font-normal text-leadgaze-muted dark:text-white">
                          {' '}
                          - {task.entityName}
                        </span>
                      )}
                    </span>
                    <span className="secondary-text-small text-leadgaze-muted dark:text-white">
                      {relativeDate}
                    </span>
                  </div>
                </div>
                <div
                  className="px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wider"
                  style={{ backgroundColor: priority.bg, color: priority.text }}
                >
                  {priority.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function generateDemoData() {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-us', {
    month: 'long',
    year: '2-digit',
  });

  const data: { value: string; name: string }[] = [];

  for (let n = 8; n > 0; n -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - n, 1);

    data.push({
      name: formatter.format(date),
      value: (Math.random() * 10).toFixed(1),
    });
  }

  const lastValue = data[data.length - 1]?.value;

  return [data, lastValue] as [typeof data, string];
}

// function Chart(
//   props: React.PropsWithChildren<{ data: { value: string; name: string }[] }>,
// ) {
//   const chartConfig = {
//     desktop: {
//       label: 'Desktop',
//       color: 'var(--chart-1)',
//     },
//     mobile: {
//       label: 'Mobile',
//       color: 'var(--chart-2)',
//     },
//   } satisfies ChartConfig;

//   return (
//     <ChartContainer config={chartConfig}>
//       <LineChart accessibilityLayer data={props.data}>
//         <CartesianGrid vertical={false} />
//         <XAxis
//           dataKey="name"
//           tickLine={false}
//           axisLine={false}
//           tickMargin={8}
//         />
//         <ChartTooltip
//           cursor={false}
//           content={<ChartTooltipContent hideLabel />}
//         />
//         <Line
//           dataKey="value"
//           type="natural"
//           stroke="var(--color-desktop)"
//           strokeWidth={2}
//           dot={false}
//         />
//       </LineChart>
//     </ChartContainer>
//   );
// }

function RecentContactsTable({ workspaceId }: { workspaceId: string }) {
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', 'recent', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts?workspaceId=${workspaceId}`);
      const json = await response.json();
      return json.data?.slice(0, 10) || [];
    },
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground animate-pulse py-8 text-center">
        Loading contacts...
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        No contacts found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto [&>div]:overflow-visible">
      <Table className="w-full caption-bottom text-sm">
        <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
          <TableRow className="bg-card">
            <TableHead>Contact</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="hidden md:table-cell">Job Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact: any) => (
            <TableRow key={contact.id}>
              <TableCell className={'flex flex-col'}>
                <span className="font-medium">
                  {contact.first_name} {contact.last_name}
                </span>
                <span
                  className={'text-muted-foreground hidden text-xs sm:inline'}
                >
                  {contact.email}
                </span>
              </TableCell>
              <TableCell>{contact.account?.account_name || '-'}</TableCell>
              <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                {contact.job_title || '-'}
              </TableCell>
              <TableCell>
                {contact.status ? (
                  <Badge
                    variant="outline"
                    style={{
                      color: contact.status.color,
                      borderColor: contact.status.color + '40',
                      backgroundColor: contact.status.color + '10',
                    }}
                    className="h-5 text-[10px]"
                  >
                    {contact.status.status_name}
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/home/sales/contacts/${contact.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// function BadgeWithTrend(props: React.PropsWithChildren<{ trend: string }>) {
//   const className = useMemo(() => {
//     switch (props.trend) {
//       case 'up':
//         return 'text-green-500';
//       case 'down':
//         return 'text-destructive';
//       case 'stale':
//         return 'text-orange-500';
//     }
//   }, [props.trend]);

//   return (
//     <Badge
//       variant={'outline'}
//       className={'border-transparent px-1.5 font-normal'}
//     >
//       <span className={className}>{props.children}</span>
//     </Badge>
//   );
// }

function Figure(props: React.PropsWithChildren) {
  return (
    <div
      className={'primary-heading-number text-leadgaze-dark dark:text-zinc-100'}
    >
      {props.children}
    </div>
  );
}

function SalesDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 4 stat cards */}
      <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 xl:pb-4 2xl:grid-cols-4 2xl:gap-4 2xl:pb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </CardHeader>
            <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead Pipeline + Upcoming Tasks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-4 2xl:gap-4">
        {/* Lead Pipeline skeleton */}
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <div className="space-y-6 p-6 xl:space-y-4 xl:p-4 2xl:space-y-6 2xl:p-6">
            {['New Leads', 'Contacted', 'Qualified', 'Proposal Sent', 'Won'].map((stage) => (
              <div key={stage} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-6" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Tasks skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-5 rounded" />
          </CardHeader>
          <div className="divide-y dark:divide-zinc-800">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-5 xl:p-3 2xl:p-5"
              >
                <div className="flex items-start gap-4">

                  <div className="flex flex-col gap-1.5">
                    <Skeleton className={`h-4 ${i === 1 ? 'w-48' : i === 2 ? 'w-40' : 'w-52'}`} />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                {/* Priority badge */}
                <Skeleton className="h-5 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// function Trend(
//   props: React.PropsWithChildren<{
//     trend: 'up' | 'down' | 'stale';
//   }>,
// ) {
//   const Icon = useMemo(() => {
//     switch (props.trend) {
//       case 'up':
//         return <ArrowUp className={'h-3 w-3 text-green-500'} />;
//       case 'down':
//         return <ArrowDown className={'text-destructive h-3 w-3'} />;
//       case 'stale':
//         return <Menu className={'h-3 w-3 text-orange-500'} />;
//     }
//   }, [props.trend]);

//   return (
//     <div>
//       <BadgeWithTrend trend={props.trend}>
//         <span className={'flex items-center space-x-1'}>
//           {Icon}
//           <span>{props.children}</span>
//         </span>
//       </BadgeWithTrend>
//     </div>
//   );
// }

// export function VisitorsChart() {
//   const chartData = useMemo(
//     () => [
//       { date: '2024-04-01', desktop: 222, mobile: 150 },
//       { date: '2024-04-02', desktop: 97, mobile: 180 },
//       { date: '2024-04-03', desktop: 167, mobile: 120 },
//       { date: '2024-04-04', desktop: 242, mobile: 260 },
//       { date: '2024-04-05', desktop: 373, mobile: 290 },
//       { date: '2024-04-06', desktop: 301, mobile: 340 },
//       { date: '2024-04-07', desktop: 245, mobile: 180 },
//       { date: '2024-04-08', desktop: 409, mobile: 320 },
//       { date: '2024-04-09', desktop: 59, mobile: 110 },
//       { date: '2024-04-10', desktop: 261, mobile: 190 },
//       { date: '2024-04-11', desktop: 327, mobile: 350 },
//       { date: '2024-04-12', desktop: 292, mobile: 210 },
//       { date: '2024-04-13', desktop: 342, mobile: 380 },
//       { date: '2024-04-14', desktop: 137, mobile: 220 },
//       { date: '2024-04-15', desktop: 120, mobile: 170 },
//       { date: '2024-04-16', desktop: 138, mobile: 190 },
//       { date: '2024-04-17', desktop: 446, mobile: 360 },
//       { date: '2024-04-18', desktop: 364, mobile: 410 },
//       { date: '2024-04-19', desktop: 243, mobile: 180 },
//       { date: '2024-04-20', desktop: 89, mobile: 150 },
//       { date: '2024-04-21', desktop: 137, mobile: 200 },
//       { date: '2024-04-22', desktop: 224, mobile: 170 },
//       { date: '2024-04-23', desktop: 138, mobile: 230 },
//       { date: '2024-04-24', desktop: 387, mobile: 290 },
//       { date: '2024-04-25', desktop: 215, mobile: 250 },
//       { date: '2024-04-26', desktop: 75, mobile: 130 },
//       { date: '2024-04-27', desktop: 383, mobile: 420 },
//       { date: '2024-04-28', desktop: 122, mobile: 180 },
//       { date: '2024-04-29', desktop: 315, mobile: 240 },
//       { date: '2024-04-30', desktop: 454, mobile: 380 },
//       { date: '2024-05-01', desktop: 165, mobile: 220 },
//       { date: '2024-05-02', desktop: 293, mobile: 310 },
//       { date: '2024-05-03', desktop: 247, mobile: 190 },
//       { date: '2024-05-04', desktop: 385, mobile: 420 },
//       { date: '2024-05-05', desktop: 481, mobile: 390 },
//       { date: '2024-05-06', desktop: 498, mobile: 520 },
//       { date: '2024-05-07', desktop: 388, mobile: 300 },
//       { date: '2024-05-08', desktop: 149, mobile: 210 },
//       { date: '2024-05-09', desktop: 227, mobile: 180 },
//       { date: '2024-05-10', desktop: 293, mobile: 330 },
//       { date: '2024-05-11', desktop: 335, mobile: 270 },
//       { date: '2024-05-12', desktop: 197, mobile: 240 },
//       { date: '2024-05-13', desktop: 197, mobile: 160 },
//       { date: '2024-05-14', desktop: 448, mobile: 490 },
//       { date: '2024-05-15', desktop: 473, mobile: 380 },
//       { date: '2024-05-16', desktop: 338, mobile: 400 },
//       { date: '2024-05-17', desktop: 499, mobile: 420 },
//       { date: '2024-05-18', desktop: 315, mobile: 350 },
//       { date: '2024-05-19', desktop: 235, mobile: 180 },
//       { date: '2024-05-20', desktop: 177, mobile: 230 },
//       { date: '2024-05-21', desktop: 82, mobile: 140 },
//       { date: '2024-05-22', desktop: 81, mobile: 120 },
//       { date: '2024-05-23', desktop: 252, mobile: 290 },
//       { date: '2024-05-24', desktop: 294, mobile: 220 },
//       { date: '2024-05-25', desktop: 201, mobile: 250 },
//       { date: '2024-05-26', desktop: 213, mobile: 170 },
//       { date: '2024-05-27', desktop: 420, mobile: 460 },
//       { date: '2024-05-28', desktop: 233, mobile: 190 },
//       { date: '2024-05-29', desktop: 78, mobile: 130 },
//       { date: '2024-05-30', desktop: 340, mobile: 280 },
//       { date: '2024-05-31', desktop: 178, mobile: 230 },
//       { date: '2024-06-01', desktop: 178, mobile: 200 },
//       { date: '2024-06-02', desktop: 470, mobile: 410 },
//       { date: '2024-06-03', desktop: 103, mobile: 160 },
//       { date: '2024-06-04', desktop: 439, mobile: 380 },
//       { date: '2024-06-05', desktop: 88, mobile: 140 },
//       { date: '2024-06-06', desktop: 294, mobile: 250 },
//       { date: '2024-06-07', desktop: 323, mobile: 370 },
//       { date: '2024-06-08', desktop: 385, mobile: 320 },
//       { date: '2024-06-09', desktop: 438, mobile: 480 },
//       { date: '2024-06-10', desktop: 155, mobile: 200 },
//       { date: '2024-06-11', desktop: 92, mobile: 150 },
//       { date: '2024-06-12', desktop: 492, mobile: 420 },
//       { date: '2024-06-13', desktop: 81, mobile: 130 },
//       { date: '2024-06-14', desktop: 426, mobile: 380 },
//       { date: '2024-06-15', desktop: 307, mobile: 350 },
//       { date: '2024-06-16', desktop: 371, mobile: 310 },
//       { date: '2024-06-17', desktop: 475, mobile: 520 },
//       { date: '2024-06-18', desktop: 107, mobile: 170 },
//       { date: '2024-06-19', desktop: 341, mobile: 290 },
//       { date: '2024-06-20', desktop: 408, mobile: 450 },
//       { date: '2024-06-21', desktop: 169, mobile: 210 },
//       { date: '2024-06-22', desktop: 317, mobile: 270 },
//       { date: '2024-06-23', desktop: 480, mobile: 530 },
//       { date: '2024-06-24', desktop: 132, mobile: 180 },
//       { date: '2024-06-25', desktop: 141, mobile: 190 },
//       { date: '2024-06-26', desktop: 434, mobile: 380 },
//       { date: '2024-06-27', desktop: 448, mobile: 490 },
//       { date: '2024-06-28', desktop: 149, mobile: 200 },
//       { date: '2024-06-29', desktop: 103, mobile: 160 },
//       { date: '2024-06-30', desktop: 446, mobile: 400 },
//     ],
//     [],
//   );

//   const chartConfig = {
//     visitors: {
//       label: 'Visitors',
//     },
//     desktop: {
//       label: 'Desktop',
//       color: 'var(--chart-1)',
//     },
//     mobile: {
//       label: 'Mobile',
//       color: 'var(--chart-2)',
//     },
//   } satisfies ChartConfig;

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Relationship Growth</CardTitle>
//         <CardDescription>
//           Showing total record growth for the last 6 months
//         </CardDescription>
//       </CardHeader>

//       <CardContent>
//         <ChartContainer className={'h-64 w-full'} config={chartConfig}>
//           <AreaChart accessibilityLayer data={chartData}>
//             <defs>
//               <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
//                 <stop
//                   offset="5%"
//                   stopColor="var(--color-desktop)"
//                   stopOpacity={0.8}
//                 />
//                 <stop
//                   offset="95%"
//                   stopColor="var(--color-desktop)"
//                   stopOpacity={0.1}
//                 />
//               </linearGradient>
//               <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
//                 <stop
//                   offset="5%"
//                   stopColor="var(--color-mobile)"
//                   stopOpacity={0.8}
//                 />
//                 <stop
//                   offset="95%"
//                   stopColor="var(--color-mobile)"
//                   stopOpacity={0.1}
//                 />
//               </linearGradient>
//             </defs>
//             <CartesianGrid vertical={false} />
//             <XAxis
//               dataKey="month"
//               tickLine={false}
//               axisLine={false}
//               tickMargin={8}
//               tickFormatter={(value: string) => value.slice(0, 3)}
//             />
//             <ChartTooltip
//               cursor={false}
//               content={<ChartTooltipContent indicator="dot" />}
//             />
//             <Area
//               dataKey="mobile"
//               type="natural"
//               fill="url(#fillMobile)"
//               fillOpacity={0.4}
//               stroke="var(--color-mobile)"
//               stackId="a"
//             />
//             <Area
//               dataKey="desktop"
//               type="natural"
//               fill="url(#fillDesktop)"
//               fillOpacity={0.4}
//               stroke="var(--color-desktop)"
//               stackId="a"
//             />
//           </AreaChart>
//         </ChartContainer>
//       </CardContent>

//       <CardFooter>
//         <div className="flex w-full items-start gap-2 text-sm">
//           <div className="grid gap-2">
//             <div className="flex items-center gap-2 leading-none font-medium">
//               Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
//             </div>
//             <div className="text-muted-foreground flex items-center gap-2 leading-none">
//               January - June 2024
//             </div>
//           </div>
//         </div>
//       </CardFooter>
//     </Card>
//   );
// }

// export function PageViewsChart() {
//   const [activeChart, setActiveChart] =
//     useState<keyof typeof chartConfig>('desktop');

//   const chartData = [
//     { date: '2024-04-01', desktop: 222, mobile: 150 },
//     { date: '2024-04-02', desktop: 97, mobile: 180 },
//     { date: '2024-04-03', desktop: 167, mobile: 120 },
//     { date: '2024-04-04', desktop: 242, mobile: 260 },
//     { date: '2024-04-05', desktop: 373, mobile: 290 },
//     { date: '2024-04-06', desktop: 301, mobile: 340 },
//     { date: '2024-04-07', desktop: 245, mobile: 180 },
//     { date: '2024-04-08', desktop: 409, mobile: 320 },
//     { date: '2024-04-09', desktop: 59, mobile: 110 },
//     { date: '2024-04-10', desktop: 261, mobile: 190 },
//     { date: '2024-04-11', desktop: 327, mobile: 350 },
//     { date: '2024-04-12', desktop: 292, mobile: 210 },
//     { date: '2024-04-13', desktop: 342, mobile: 380 },
//     { date: '2024-04-14', desktop: 137, mobile: 220 },
//     { date: '2024-04-15', desktop: 120, mobile: 170 },
//     { date: '2024-04-16', desktop: 138, mobile: 190 },
//     { date: '2024-04-17', desktop: 446, mobile: 360 },
//     { date: '2024-04-18', desktop: 364, mobile: 410 },
//     { date: '2024-04-19', desktop: 243, mobile: 180 },
//     { date: '2024-04-20', desktop: 89, mobile: 150 },
//     { date: '2024-04-21', desktop: 137, mobile: 200 },
//     { date: '2024-04-22', desktop: 224, mobile: 170 },
//     { date: '2024-04-23', desktop: 138, mobile: 230 },
//     { date: '2024-04-24', desktop: 387, mobile: 290 },
//     { date: '2024-04-25', desktop: 215, mobile: 250 },
//     { date: '2024-04-26', desktop: 75, mobile: 130 },
//     { date: '2024-04-27', desktop: 383, mobile: 420 },
//     { date: '2024-04-28', desktop: 122, mobile: 180 },
//     { date: '2024-04-29', desktop: 315, mobile: 240 },
//     { date: '2024-04-30', desktop: 454, mobile: 380 },
//     { date: '2024-05-01', desktop: 165, mobile: 220 },
//     { date: '2024-05-02', desktop: 293, mobile: 310 },
//     { date: '2024-05-03', desktop: 247, mobile: 190 },
//     { date: '2024-05-04', desktop: 385, mobile: 420 },
//     { date: '2024-05-05', desktop: 481, mobile: 390 },
//     { date: '2024-05-06', desktop: 498, mobile: 520 },
//     { date: '2024-05-07', desktop: 388, mobile: 300 },
//     { date: '2024-05-08', desktop: 149, mobile: 210 },
//     { date: '2024-05-09', desktop: 227, mobile: 180 },
//     { date: '2024-05-10', desktop: 293, mobile: 330 },
//     { date: '2024-05-11', desktop: 335, mobile: 270 },
//     { date: '2024-05-12', desktop: 197, mobile: 240 },
//     { date: '2024-05-13', desktop: 197, mobile: 160 },
//     { date: '2024-05-14', desktop: 448, mobile: 490 },
//     { date: '2024-05-15', desktop: 473, mobile: 380 },
//     { date: '2024-05-16', desktop: 338, mobile: 400 },
//     { date: '2024-05-17', desktop: 499, mobile: 420 },
//     { date: '2024-05-18', desktop: 315, mobile: 350 },
//     { date: '2024-05-19', desktop: 235, mobile: 180 },
//     { date: '2024-05-20', desktop: 177, mobile: 230 },
//     { date: '2024-05-21', desktop: 82, mobile: 140 },
//     { date: '2024-05-22', desktop: 81, mobile: 120 },
//     { date: '2024-05-23', desktop: 252, mobile: 290 },
//     { date: '2024-05-24', desktop: 294, mobile: 220 },
//     { date: '2024-05-25', desktop: 201, mobile: 250 },
//     { date: '2024-05-26', desktop: 213, mobile: 170 },
//     { date: '2024-05-27', desktop: 420, mobile: 460 },
//     { date: '2024-05-28', desktop: 233, mobile: 190 },
//     { date: '2024-05-29', desktop: 78, mobile: 130 },
//     { date: '2024-05-30', desktop: 340, mobile: 280 },
//     { date: '2024-05-31', desktop: 178, mobile: 230 },
//     { date: '2024-06-01', desktop: 178, mobile: 200 },
//     { date: '2024-06-02', desktop: 470, mobile: 410 },
//     { date: '2024-06-03', desktop: 103, mobile: 160 },
//     { date: '2024-06-04', desktop: 439, mobile: 380 },
//     { date: '2024-06-05', desktop: 88, mobile: 140 },
//     { date: '2024-06-06', desktop: 294, mobile: 250 },
//     { date: '2024-06-07', desktop: 323, mobile: 370 },
//     { date: '2024-06-08', desktop: 385, mobile: 320 },
//     { date: '2024-06-09', desktop: 438, mobile: 480 },
//     { date: '2024-06-10', desktop: 155, mobile: 200 },
//     { date: '2024-06-11', desktop: 92, mobile: 150 },
//     { date: '2024-06-12', desktop: 492, mobile: 420 },
//     { date: '2024-06-13', desktop: 81, mobile: 130 },
//     { date: '2024-06-14', desktop: 426, mobile: 380 },
//     { date: '2024-06-15', desktop: 307, mobile: 350 },
//     { date: '2024-06-16', desktop: 371, mobile: 310 },
//     { date: '2024-06-17', desktop: 475, mobile: 520 },
//     { date: '2024-06-18', desktop: 107, mobile: 170 },
//     { date: '2024-06-19', desktop: 341, mobile: 290 },
//     { date: '2024-06-20', desktop: 408, mobile: 450 },
//     { date: '2024-06-21', desktop: 169, mobile: 210 },
//     { date: '2024-06-22', desktop: 317, mobile: 270 },
//     { date: '2024-06-23', desktop: 480, mobile: 530 },
//     { date: '2024-06-24', desktop: 132, mobile: 180 },
//     { date: '2024-06-25', desktop: 141, mobile: 190 },
//     { date: '2024-06-26', desktop: 434, mobile: 380 },
//     { date: '2024-06-27', desktop: 448, mobile: 490 },
//     { date: '2024-06-28', desktop: 149, mobile: 200 },
//     { date: '2024-06-29', desktop: 103, mobile: 160 },
//     { date: '2024-06-30', desktop: 446, mobile: 400 },
//   ];

//   const chartConfig = {
//     views: {
//       label: 'Page Views',
//     },
//     desktop: {
//       label: 'Desktop',
//       color: 'var(--chart-1)',
//     },
//     mobile: {
//       label: 'Mobile',
//       color: 'var(--chart-2)',
//     },
//   } satisfies ChartConfig;

//   const total = useMemo(
//     () => ({
//       desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
//       mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0),
//     }),
//     [],
//   );

//   return (
//     <Card>
//       <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
//         <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
//           <CardTitle>Activity Trends</CardTitle>

//           <CardDescription>
//             Showing interaction trends for the last 3 months
//           </CardDescription>
//         </div>

//         <div className="flex">
//           {['desktop', 'mobile'].map((key) => {
//             const chart = key as keyof typeof chartConfig;
//             return (
//               <button
//                 key={chart}
//                 data-active={activeChart === chart}
//                 className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
//                 onClick={() => setActiveChart(chart)}
//               >
//                 <span className="text-muted-foreground text-xs">
//                   {chartConfig[chart].label}
//                 </span>
//                 <span className="text-lg leading-none font-bold sm:text-3xl">
//                   {total[key as keyof typeof total].toLocaleString()}
//                 </span>
//               </button>
//             );
//           })}
//         </div>
//       </CardHeader>

//       <CardContent className="px-2 sm:p-6">
//         <ChartContainer
//           config={chartConfig}
//           className="aspect-auto h-64 w-full"
//         >
//           <BarChart accessibilityLayer data={chartData}>
//             <CartesianGrid vertical={false} />
//             <XAxis
//               dataKey="date"
//               tickLine={false}
//               axisLine={false}
//               tickMargin={8}
//               minTickGap={32}
//               tickFormatter={(value) => {
//                 const date = new Date(value);
//                 return date.toLocaleDateString('en-US', {
//                   month: 'short',
//                   day: 'numeric',
//                 });
//               }}
//             />
//             <ChartTooltip
//               content={
//                 <ChartTooltipContent
//                   className="w-[150px]"
//                   nameKey="views"
//                   labelFormatter={(value) => {
//                     return new Date(value).toLocaleDateString('en-US', {
//                       month: 'short',
//                       day: 'numeric',
//                       year: 'numeric',
//                     });
//                   }}
//                 />
//               }
//             />
//             <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
//           </BarChart>
//         </ChartContainer>
//       </CardContent>
//     </Card>
//   );
// }

function LatestLeadsTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const mockLeads = [
    { name: 'Sarah Jenkins', status: 'NEW', value: '$42,000' },
    { name: 'Acme Corp IT', status: 'QUALIFIED', value: '$156,000' },
    { name: 'David Miller', status: 'CONTACTED', value: '$12,500' },
    { name: 'Emily Chen', status: 'NEW', value: '$89,000' },
    { name: 'Global Tech', status: 'PROPOSAL SENT', value: '$210,000' },
    { name: 'Michael Brown', status: 'CONTACTED', value: '$34,000' },
    { name: 'Peak Solutions', status: 'WON', value: '$45,000' },
    { name: 'Rachel Green', status: 'NEW', value: '$67,000' },
    { name: 'StartUp Inc', status: 'QUALIFIED', value: '$120,000' },
    { name: 'Tom Wilson', status: 'NEW', value: '$22,000' },
  ];

  const totalCount = mockLeads.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLeads = mockLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <CardWidgetContainer title="Latest Leads">
      <div className="flex flex-col h-[360px]">
        <div className="flex-1 overflow-auto [&>div]:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{l.name}</TableCell>
                  <TableCell>
                     <Badge variant="outline" className={`h-5 text-[10px] uppercase border-transparent font-semibold shadow-none ${l.status === 'NEW' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : l.status === 'QUALIFIED' ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400'}`}>{l.status}</Badge>
                  </TableCell>
                  <TableCell>{l.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t p-2 dark:border-zinc-800">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(val) => {
              setPageSize(val);
              setCurrentPage(1);
            }}
            entityLabel="leads"
          />
        </div>
      </div>
    </CardWidgetContainer>
  )
}

function LatestAccountsTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const mockAccounts = [
    { name: 'Sarah Jenkins', email: 'sarah.j@techwave.io', phone: '+55 1236547896' },
    { name: 'Noah Kim', email: 'noah.kim@acme.com', phone: '+1 9876543210' },
    { name: 'Emily Chen', email: 'echen@globaltech.net', phone: '+44 2071234567' },
    { name: 'David Miller', email: 'dmiller@peak.io', phone: '+61 212345678' },
    { name: 'Rachel Green', email: 'rachel@startup.io', phone: '+1 5551234567' },
    { name: 'Tom Wilson', email: 'tom@techwave.io', phone: '+55 1236547896' },
    { name: 'Alex Wong', email: 'alex@acme.com', phone: '+1 9876543210' },
    { name: 'Sophie Martin', email: 'sophie@globaltech.net', phone: '+44 2071234567' },
    { name: 'Chris Evans', email: 'chris@peak.io', phone: '+61 212345678' },
    { name: 'Jessica Lee', email: 'jessica@startup.io', phone: '+1 5551234567' },
  ];

  const totalCount = mockAccounts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedAccounts = mockAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <CardWidgetContainer title="Latest Accounts">
      <div className="flex flex-col h-[360px]">
        <div className="flex-1 overflow-auto [&>div]:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.phone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t p-2 dark:border-zinc-800">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(val) => {
              setPageSize(val);
              setCurrentPage(1);
            }}
            entityLabel="accounts"
          />
        </div>
      </div>
    </CardWidgetContainer>
  )
}

function RecentActionsList() {
  return (
    <div className="flex flex-col p-5 gap-5 pb-6">
       <div className="flex flex-col gap-1">
         <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 leading-tight">Call with Sarah Jenkins</span>
         <span className="text-xs text-muted-foreground font-medium">Product demo follow-up • 2h ago</span>
       </div>
       <div className="flex flex-col gap-1">
         <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 leading-tight">Email Sent: Proposal V2</span>
         <span className="text-xs text-muted-foreground font-medium">To: Global Tech Corp • 4h ago</span>
       </div>
       <div className="flex flex-col gap-1">
         <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 leading-tight">Discovery Meeting</span>
         <span className="text-xs text-muted-foreground font-medium">With Peak Solutions • Yesterday</span>
       </div>
    </div>
  )
}

function AccountGrowthTrends() {
  const data = [
    { name: 'JAN', value: 4000, value2: 2400 },
    { name: 'FEB', value: 3000, value2: 1398 },
    { name: 'MAR', value: 2000, value2: 9800 },
    { name: 'APR', value: 2780, value2: 3908 },
  ];
  return (
    <CardWidgetContainer 
      title="Account Growth Trends"
      icon2={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> <span className="text-[11px] font-medium text-slate-500">Gross Revenue</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> <span className="text-[11px] font-medium text-slate-500">Active Users</span></div>
          <div className="flex items-center gap-1 relative cursor-pointer text-[11px] font-medium text-slate-600 ml-2">
             <select className="appearance-none bg-transparent outline-none pr-4 cursor-pointer">
                <option value="1">Last 1 Month</option>
                <option value="3">Last 3 Months</option>
                <option value="6" selected>Last 6 Months</option>
                <option value="12">Last 1 Year</option>
             </select>
             <ChevronDown className="w-3.5 h-3.5 absolute right-0 pointer-events-none" />
          </div>
        </div>
      }
    >
      <div className="h-[360px] w-full p-4 pl-0">
        <ChartContainer config={{ 
           gross: { label: 'Gross Revenue', color: '#2563eb' },
           active: { label: 'Active Users', color: '#cbd5e1' }
        }} className="h-full w-full">
           <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={12} fontSize={11} fill="currentColor" className="text-muted-foreground font-medium" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="value2" stroke="#cbd5e1" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
           </LineChart>
        </ChartContainer>
      </div>
    </CardWidgetContainer>
  )
}

function WidgetLibrary() {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-zinc-900/40 rounded-xl border border-slate-200/60 dark:border-zinc-800 overflow-hidden">
       {/* Fixed Heading */}
       <div className="flex flex-col p-4 px-5 border-b border-slate-200/60 dark:border-zinc-800 bg-[#f8fafc] dark:bg-zinc-900 sticky top-0 z-10 shrink-0">
          <h3 className="font-bold text-[15px] text-slate-800 dark:text-zinc-100">Widget Library</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Drag to dashboard</p>
       </div>

       {/* Scrollable Content */}
       <div className="flex flex-col gap-6 p-5 overflow-y-auto flex-1 custom-scrollbar">
          <WidgetSection title="KPI CARDS">
            <WidgetItem label="Total Leads" disabled />
            <WidgetItem label="Qualified Leads" disabled />
            <WidgetItem label="Revenue" disabled />
            <WidgetItem label="Conversion Rate" disabled />
          </WidgetSection>

          <WidgetSection title="CHARTS">
            <WidgetItem label="Lead pipeline" disabled />
            <WidgetItem label="Monthly Trend" />
          </WidgetSection>

          <WidgetSection title="ACTIVITY">
            <WidgetItem label="Upcoming Tasks" disabled />
            <WidgetItem label="Recent Actions" disabled />
            <WidgetItem label="Latest Lead" disabled />
            <WidgetItem label="Latest Account" disabled />
          </WidgetSection>

          <div className="mt-2 pb-4">
            <Button variant="outline" className="w-full bg-white dark:bg-zinc-900 text-blue-600 border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 font-semibold shadow-sm">
               <Plus className="w-4 h-4 mr-2" /> Add Custom Widget
            </Button>
          </div>
       </div>
    </div>
  )
}

function WidgetSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
       <span className="text-[11px] font-bold text-slate-400 tracking-wider">{title}</span>
       <div className="flex flex-col gap-2">
         {children}
       </div>
    </div>
  )
}

function WidgetItem({ label, disabled }: { label: string, disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 p-2 px-3 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 transition-all ${disabled ? 'opacity-60 cursor-not-allowed border-slate-200 shadow-sm' : 'cursor-grab border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md'}`}>
       <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
       {/* Icon mapping could be added here */}
       <span className="text-[13px] font-semibold text-slate-600 dark:text-zinc-300">{label}</span>
    </div>
  )
}
