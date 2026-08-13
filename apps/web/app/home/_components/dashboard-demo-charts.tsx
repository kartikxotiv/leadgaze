'use client';

import { useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

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


const WIDGET_REGISTRY: Record<string, { label: string, component: (props: any) => React.ReactNode }> = {
  pipeline: { label: 'Lead Pipeline', component: (props) => (
    <CardWidgetContainer title="Lead Pipeline">
      <div className={`flex-1 ${props.heightClass} overflow-auto`}>
        <PipelineOverview metrics={props.metrics} />
      </div>
    </CardWidgetContainer>
  )},
  latest_leads: { label: 'Latest Leads', component: (props) => <LatestLeadsTable heightClass={props.heightClass} /> },
  upcoming_tasks: { label: 'Upcoming Tasks', component: (props) => (
    <CardWidgetContainer title="Upcoming Tasks" icon2={<Calendar className="w-5 h-5 text-leadgaze-muted dark:text-white" />}>
      <div className={`flex-1 ${props.heightClass} overflow-auto`}>
        <UpcomingTasks tasks={props.metrics.upcomingTasks} />
      </div>
    </CardWidgetContainer>
  )},
  growth_trends: { label: 'Monthly Trend', component: (props) => <AccountGrowthTrends heightClass={props.heightClass} /> },
  recent_actions: { label: 'Recent Actions', component: (props) => (
    <CardWidgetContainer title="Recent Action" icon2={<History className="w-4 h-4 text-leadgaze-muted" />}>
      <div className={`flex-1 ${props.heightClass} overflow-auto`}>
        <RecentActionsList />
      </div>
    </CardWidgetContainer>
  )},
  latest_accounts: { label: 'Latest Accounts', component: (props) => <LatestAccountsTable heightClass={props.heightClass} /> },
};

function SortableWidgetWrapper({ id, children, isFullWidth }: { id: string; children: React.ReactNode; isFullWidth?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group w-full h-full ${isFullWidth ? 'lg:col-span-2' : ''}`}>
      {/* Invisible Drag Zone over the header title area */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-0 left-0 w-[60%] h-14 z-40 cursor-grab active:cursor-grabbing"
        title="Drag to move"
      />
      {children}
    </div>
  );
}

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

  const [activeWidgets, setActiveWidgets] = useState<string[]>([
    'pipeline', 'growth_trends',
    'latest_leads', 'recent_actions',
    'upcoming_tasks', 'latest_accounts'
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveWidgets((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeWidget = (id: string) => {
    setActiveWidgets((prev) => prev.filter(w => w !== id));
  };
  
  const addWidget = (id: string) => {
    if (!activeWidgets.includes(id)) {
      setActiveWidgets((prev) => [...prev, id]);
    }
  };

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            {activeWidgets.map((id, index) => {
              const widget = WIDGET_REGISTRY[id];
              if (!widget) return null;

              // Determine layer based on index (2 cards per layer)
              // Layer 1: index 0, 1 -> h-[360px]
              // Layer 2: index 2, 3 -> h-[200px]
              // Layer 3+: index >= 4 -> h-[360px]
              const isSecondLayer = index === 2 || index === 3;
              const heightClass = isSecondLayer ? 'h-[200px]' : 'h-[360px]';

              const isLastAndOdd = index === activeWidgets.length - 1 && activeWidgets.length % 2 !== 0;

              return (
                <SortableWidgetWrapper key={id} id={id} isFullWidth={isLastAndOdd}>
                  {widget.component({ metrics, heightClass })}
                </SortableWidgetWrapper>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      
        </div>

        {/* Widget Library Sidebar */}
        {isWidgetLibraryOpen && (
          <div className="w-[300px] xl:w-[320px] shrink-0 sticky top-4 h-[calc(100vh-140px)]">
            <WidgetLibrary activeWidgets={activeWidgets} onAddWidget={addWidget} onRemoveWidget={removeWidget} />
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

function LatestLeadsTable({ heightClass = "h-[360px]" }: { heightClass?: string }) {
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
      <div className={`flex flex-col ${heightClass}`}>
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

function LatestAccountsTable({ heightClass = "h-[360px]" }: { heightClass?: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const mockAccounts = [
    { name: 'Stark Industries', industry: 'Technology', owner: 'Tony Stark' },
    { name: 'Wayne Enterprises', industry: 'Finance', owner: 'Bruce Wayne' },
    { name: 'Oscorp', industry: 'Healthcare', owner: 'Norman Osborn' },
    { name: 'LexCorp', industry: 'Technology', owner: 'Lex Luthor' },
    { name: 'Daily Bugle', industry: 'Media', owner: 'J.J. Jameson' },
    { name: 'Nelson & Murdock', industry: 'Legal', owner: 'Matt Murdock' },
    { name: 'Pym Technologies', industry: 'Research', owner: 'Hank Pym' },
    { name: 'Rand Enterprises', industry: 'Finance', owner: 'Danny Rand' },
    { name: 'Roxxon Energy', industry: 'Energy', owner: 'Hugh Jones' },
    { name: 'Hammer Industries', industry: 'Defense', owner: 'Justin Hammer' },
  ];

  const totalCount = mockAccounts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedAccounts = mockAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <CardWidgetContainer title="Latest Accounts">
      <div className={`flex flex-col ${heightClass}`}>
        <div className="flex-1 overflow-auto [&>div]:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.industry}</TableCell>
                  <TableCell>{a.owner}</TableCell>
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

function AccountGrowthTrends({ heightClass = "h-[360px]" }: { heightClass?: string }) {
  const data = [
    { name: 'JAN', value: 300, value2: 120 },
    { name: 'FEB', value: 250, value2: 90 },
    { name: 'MAR', value: 210, value2: 240 },
    { name: 'APR', value: 280, value2: 190 },
  ];

  return (
    <CardWidgetContainer 
      title="Revenu Chart"
      icon2={
        <div className="flex items-center gap-3">
          {/* <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-blue-600"></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-slate-300"></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Active Users</span>
          </div> */}
          <div className="relative flex items-center bg-slate-50 dark:bg-zinc-800/50 rounded p-1 px-2 border border-slate-100 dark:border-zinc-800 ml-2">
             <select className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-zinc-400 outline-none pr-4 appearance-none cursor-pointer">
                <option value="6">Last 6 month</option>
                <option value="12">Last 1 Year</option>
             </select>
             <ChevronDown className="w-3.5 h-3.5 absolute right-0 pointer-events-none" />
          </div>
        </div>
      }
    >
      <div className={`${heightClass} w-full p-4 pl-0`}>
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

function WidgetLibrary({ activeWidgets, onAddWidget, onRemoveWidget }: { activeWidgets: string[], onAddWidget: (id: string) => void, onRemoveWidget: (id: string) => void }) {
  const isWidgetActive = (id: string) => activeWidgets.includes(id);
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
            <WidgetItem label="Lead pipeline" disabled={isWidgetActive('pipeline')} onClick={() => onAddWidget('pipeline')} onRemove={() => onRemoveWidget('pipeline')} />
            <WidgetItem label="Monthly Trend" disabled={isWidgetActive('growth_trends')} onClick={() => onAddWidget('growth_trends')} onRemove={() => onRemoveWidget('growth_trends')} />
          </WidgetSection>

          <WidgetSection title="ACTIVITY">
            <WidgetItem label="Upcoming Tasks" disabled={isWidgetActive('upcoming_tasks')} onClick={() => onAddWidget('upcoming_tasks')} onRemove={() => onRemoveWidget('upcoming_tasks')} />
            <WidgetItem label="Recent Actions" disabled={isWidgetActive('recent_actions')} onClick={() => onAddWidget('recent_actions')} onRemove={() => onRemoveWidget('recent_actions')} />
            <WidgetItem label="Latest Leads" disabled={isWidgetActive('latest_leads')} onClick={() => onAddWidget('latest_leads')} onRemove={() => onRemoveWidget('latest_leads')} />
            <WidgetItem label="Latest Accounts" disabled={isWidgetActive('latest_accounts')} onClick={() => onAddWidget('latest_accounts')} onRemove={() => onRemoveWidget('latest_accounts')} />
          </WidgetSection>
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

function WidgetItem({ label, disabled, onClick, onRemove }: { label: string, disabled?: boolean, onClick?: () => void, onRemove?: () => void }) {
  return (
    <div onClick={disabled ? undefined : onClick} className={`group flex items-center gap-2.5 p-2 px-3 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 transition-all ${disabled ? 'opacity-70 border-slate-200 shadow-sm' : 'cursor-pointer border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md'}`}>
       <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
       {/* Icon mapping could be added here */}
       <span className="text-[13px] font-semibold text-slate-600 dark:text-zinc-300 flex-1">{label}</span>
       {disabled && onRemove && (
         <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hidden group-hover:flex p-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded cursor-pointer text-red-500 shadow-sm border border-red-100 dark:border-red-900/30">
           <X className="w-3.5 h-3.5" />
         </button>
       )}
    </div>
  )
}
