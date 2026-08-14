'use client';

import { useMemo, useState, useEffect } from 'react';
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
  Bell,
  CheckSquare,
  Activity,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';

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
  pipeline: { label: 'Opportunity Pipeline', component: (props) => (
    <CardWidgetContainer title="Opportunity Pipeline" headerClassName="p-2 xl:p-2 2xl:p-2">
      <div className={`flex-1 ${props.heightClass} overflow-auto`}>
        <PipelineOverview metrics={props.metrics} />
      </div>
    </CardWidgetContainer>
  )},
  latest_leads: { label: 'Latest Leads', component: (props) => <LatestLeadsTable heightClass={props.heightClass} data={props.metrics?.latestLeads} /> },
  upcoming_tasks: { label: 'Upcoming Tasks', component: (props) => (
    <CardWidgetContainer title="Upcoming Tasks" headerClassName="p-2 xl:p-2 2xl:p-2" icon2={<Calendar className="w-5 h-5 text-leadgaze-muted dark:text-white" />}>
      <div className={`flex-1 ${props.heightClass} overflow-auto`}>
        <UpcomingTasks tasks={props.metrics?.upcomingTasks} />
      </div>
    </CardWidgetContainer>
  )},
  growth_trends: { label: 'Revenue Chart', component: (props) => <AccountGrowthTrends heightClass={props.heightClass} data={props.metrics?.revenueChart} /> },
  recent_actions: { label: 'Recent Actions', component: (props) => (
    <CardWidgetContainer title="Recent Action" headerClassName="p-2 xl:p-2 2xl:p-2" icon2={<History className="w-4 h-4 text-leadgaze-muted" />}>
      <div className={`flex-1 ${props.heightClass} overflow-auto`}>
        <RecentActionsList data={props.metrics?.recentActions} />
      </div>
    </CardWidgetContainer>
  )},
  latest_accounts: { label: 'Latest Accounts', component: (props) => <LatestAccountsTable heightClass={props.heightClass} data={props.metrics?.latestAccounts} /> },
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

function SortableKpiWrapper({ id, children }: { id: string; children: React.ReactNode }) {
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
    <div ref={setNodeRef} style={style} className={`relative group w-full h-full`}>
      {/* Drag handle specifically covering the top title area */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-0 left-0 right-12 h-10 z-40 cursor-grab active:cursor-grabbing"
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

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [activeKpiCards, setActiveKpiCards] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('dashboard_active_widgets');
    if (saved) {
      try {
        setActiveWidgets(JSON.parse(saved));
      } catch (e) {
        // Fallback
        setActiveWidgets(['pipeline', 'growth_trends', 'latest_leads', 'recent_actions', 'upcoming_tasks', 'latest_accounts']);
      }
    } else {
       setActiveWidgets(['pipeline', 'growth_trends', 'latest_leads', 'recent_actions', 'upcoming_tasks', 'latest_accounts']);
    }

    const savedKpi = localStorage.getItem('dashboard_active_kpi_cards');
    if (savedKpi) {
      try {
        setActiveKpiCards(JSON.parse(savedKpi));
      } catch (e) {
        setActiveKpiCards(['total_leads', 'contacts', 'accounts', 'pipeline_value']);
      }
    } else {
       setActiveKpiCards(['total_leads', 'contacts', 'accounts', 'pipeline_value']);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('dashboard_active_widgets', JSON.stringify(activeWidgets));
      localStorage.setItem('dashboard_active_kpi_cards', JSON.stringify(activeKpiCards));
    }
  }, [activeWidgets, activeKpiCards, isMounted]);

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

  const handleKpiDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveKpiCards((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeKpiCard = (id: string) => {
    setActiveKpiCards((prev) => prev.filter(w => w !== id));
  };

  const addKpiCard = (id: string) => {
    if (!activeKpiCards.includes(id)) {
      setActiveKpiCards((prev) => [...prev, id]);
    }
  };

  const getKpiGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4';
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
      <div className="flex w-full gap-2 items-start">
        <div className={`flex flex-col transition-all duration-300 ${isWidgetLibraryOpen ? 'w-[calc(100%-300px)] xl:w-[calc(100%-320px)]' : 'w-full'}`}>
          <DndContext id="kpi-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
            <SortableContext items={activeKpiCards} strategy={rectSortingStrategy}>
              <div
                className={`grid gap-2 pb-0 xl:gap-2 xl:pb-0 2xl:gap-2 2xl:pb-0 ${getKpiGridClass(activeKpiCards.length)}`}
              >
                {activeKpiCards.map((id) => {
                  let kpiData = null;
                  if (id === 'total_leads') {
                    kpiData = {
                      title: 'Total Leads',
                      value: <Figure>{metrics.leads.total}</Figure>,
                      link: `/home/sales/leads${queryString}`,
                      icon: <File className="h-4 w-4 text-white" />,
                      iconBg: 'bg-primary dark:bg-primary',
                      description: 'Potential customers in the funnel',
                    };
                  } else if (id === 'contacts') {
                    kpiData = {
                      title: 'Contacts',
                      value: <Figure>{metrics.contacts.total}</Figure>,
                      link: `/home/sales/contacts${queryString}`,
                      icon: <Users className="h-4 w-4 text-white" />,
                      iconBg: 'bg-activity-5',
                      description: 'Total individual relationships',
                    };
                  } else if (id === 'accounts') {
                    kpiData = {
                      title: 'Accounts',
                      value: <Figure>{metrics.accounts.total}</Figure>,
                      link: `/home/sales/accounts${queryString}`,
                      icon: <Building2 className="h-4 w-4 text-white" />,
                      iconBg: 'bg-activity-3',
                      description: 'Total company organizations',
                    };
                  } else if (id === 'pipeline_value') {
                    kpiData = {
                      title: 'Pipeline Value',
                      value: <Figure>{formatCurrency(pipelineValue, workspaceCurrency)}</Figure>,
                      link: `/home/sales/opportunities${queryString}`,
                      icon: <Target className="h-4 w-4 text-white" />,
                      iconBg: 'bg-activity-4',
                      description: 'Total value of opportunities',
                    };
                  }

                  if (!kpiData) return null;

                  return (
                    <SortableKpiWrapper key={id} id={id}>
                      <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0 relative">
                          <div className="space-y-1">
                            <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white pointer-events-auto">
                              {kpiData.title}
                            </CardTitle>
                            <Link href={kpiData.link} className="hover:underline inline-block relative z-10 pointer-events-auto">
                              {kpiData.value}
                            </Link>
                          </div>
                          <div className={`flex h-8 w-8 items-center justify-center rounded relative z-10 pointer-events-none ${kpiData.iconBg}`}>
                            {kpiData.icon}
                          </div>
                        </CardHeader>
                        <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2 relative z-10 pointer-events-none">
                          <CardDescription className="secondary-text-small text-leadgaze-success">
                            {kpiData.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </SortableKpiWrapper>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
            {activeWidgets.map((id, index) => {
              const widget = WIDGET_REGISTRY[id];
              if (!widget) return null;

              // Determine layer based on index (2 cards per layer)
              // Layer 1: index 0, 1 -> h-[320px]
              // Layer 2: index 2, 3 -> h-[200px]
              // Layer 3+: index >= 4 -> h-[320px]
              const isSecondLayer = index === 2 || index === 3;
              const heightClass = isSecondLayer ? 'h-[200px]' : 'h-[320px]';

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
        <div 
          className={`shrink-0 sticky top-0 h-[calc(100vh-80px)] transition-all duration-300 overflow-hidden ${
            isWidgetLibraryOpen ? 'w-[300px] xl:w-[320px] opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <div className="w-[300px] xl:w-[320px] h-full">
            <WidgetLibrary 
              activeWidgets={activeWidgets} 
              onAddWidget={addWidget} 
              onRemoveWidget={removeWidget}
              activeKpiCards={activeKpiCards}
              onAddKpiCard={addKpiCard}
              onRemoveKpiCard={removeKpiCard}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function PipelineOverview({ metrics }: { metrics: DashboardMetrics }) {
  const pipeline = Array.isArray(metrics.pipeline) ? metrics.pipeline : [
    { label: 'New', value: 0 },
    { label: 'Qualify', value: 0 },
    { label: 'Meet & Present', value: 0 },
    { label: 'Propose', value: 0 },
    { label: 'Negotiation', value: 0 },
    { label: 'Closed Won', value: 0 },
    { label: 'Closed Lost', value: 0 }
  ];

  const stages = pipeline;

  const maxValue = Math.max(...stages.map((s: any) => s.value), 1);

  return (
    <div className="max-h-[400px] space-y-4 px-2 py-2 xl:max-h-[430px] 2xl:max-h-[440px] overflow-auto">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
              {stage.label}
            </span>
            <span className="secondary-text-small-semibold font-bold text-leadgaze-dark dark:text-white">
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
                className="flex items-center justify-between px-2 py-1 transition-colors hover:bg-slate-50/30 dark:hover:bg-zinc-800/30 border-b border-gray-300 last:border-0"
              >
                <div className="flex items-start gap-4">

                  <div className="flex flex-col gap-0.5">
                    <span className="primary-text-medium text-leadgaze-dark dark:text-white">
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
    <div className="flex flex-col pb-4 w-full relative">
      <div className="flex w-full gap-2 items-start">
        <div className="flex flex-col w-full">
          {/* 4 stat cards */}
          <div className="grid grid-cols-1 gap-2 pb-0 md:grid-cols-2 xl:grid-cols-4 xl:gap-2 xl:pb-0 2xl:grid-cols-4 2xl:gap-2 2xl:pb-0">
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

          {/* 6 widgets (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const isSecondLayer = i === 3 || i === 4;
              const heightClass = isSecondLayer ? 'h-[200px]' : 'h-[320px]';
              
              return (
                <Card key={i} className={`${heightClass} flex flex-col overflow-hidden`}>
                  <CardHeader className="border-b p-2 xl:p-2 2xl:p-2 flex flex-row items-center justify-between space-y-0">
                    <Skeleton className="h-4 w-32" />
                    {i % 2 === 0 && <Skeleton className="h-4 w-4 rounded" />}
                  </CardHeader>
                  <div className="p-4 flex flex-col gap-4 flex-1">
                    {isSecondLayer ? (
                      <>
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </>
                    ) : (
                      <>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-32 w-full flex-1" />
                        <Skeleton className="h-4 w-3/4" />
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}

function LatestLeadsTable({ heightClass = "h-[320px]", data = [] }: { heightClass?: string, data?: any[] }) {
  const leads = data;

  return (
    <CardWidgetContainer title="Latest Leads" headerClassName="p-2 xl:p-2 2xl:p-2">
      <div className={`flex flex-col ${heightClass}`}>
        {leads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Users className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">No latest leads</p>
          </div>
        ) : (
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
                {leads.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.name}</TableCell>
                    <TableCell>
                       <Badge variant="outline" className={`h-5 text-[10px] uppercase border-transparent font-semibold shadow-none ${(l.status?.toUpperCase() === 'NEW' || l.status?.toUpperCase() === 'OPEN') ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : (l.status?.toUpperCase() === 'QUALIFIED' || l.status?.toUpperCase() === 'WON') ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400'}`}>{l.status}</Badge>
                    </TableCell>
                    <TableCell>{typeof l.value === 'number' ? `$${l.value.toLocaleString()}` : l.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  )
}

function LatestAccountsTable({ heightClass = "h-[320px]", data = [] }: { heightClass?: string, data?: any[] }) {
  const accounts = data;

  return (
    <CardWidgetContainer title="Latest Accounts" headerClassName="p-2 xl:p-2 2xl:p-2">
      <div className={`flex flex-col ${heightClass}`}>
        {accounts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Building2 className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">No latest accounts</p>
          </div>
        ) : (
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
                {accounts.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.industry}</TableCell>
                    <TableCell>{a.owner}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  )
}

function RecentActionsList({ data = [] }: { data?: any[] }) {
  const actions = data;

  const timeAgo = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = (new Date(dateString).getTime() - Date.now()) / 1000;
    if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  };

  const getActionDetails = (module?: string, action?: string) => {
    const mod = String(module || '').toLowerCase();
    const act = String(action || 'UPDATE').toUpperCase();

    let icon = <Activity className="h-3.5 w-3.5 text-slate-500" />;
    let moduleName = 'Activity';

    if (mod.includes('email')) {
      icon = <Mail className="h-3.5 w-3.5 text-blue-500" />;
      moduleName = 'Email';
    } else if (mod.includes('meeting')) {
      icon = <Calendar className="h-3.5 w-3.5 text-indigo-500" />;
      moduleName = 'Meeting';
    } else if (mod.includes('lead')) {
      icon = <User className="h-3.5 w-3.5 text-blue-500" />;
      moduleName = 'Lead';
    } else if (mod.includes('document') || mod.includes('file')) {
      icon = <FileText className="h-3.5 w-3.5 text-emerald-500" />;
      moduleName = 'Document';
    } else if (mod.includes('task')) {
      icon = <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />;
      moduleName = 'Task';
    } else if (mod.includes('call')) {
      icon = <Phone className="h-3.5 w-3.5 text-emerald-500" />;
      moduleName = 'Call';
    } else if (mod.includes('reminder')) {
      icon = <Bell className="h-3.5 w-3.5 text-orange-500" />;
      moduleName = 'Reminder';
    } else if (mod.includes('contact')) {
      icon = <Users className="h-3.5 w-3.5 text-blue-500" />;
      moduleName = 'Contact';
    } else if (mod.includes('account')) {
      icon = <Building2 className="h-3.5 w-3.5 text-purple-500" />;
      moduleName = 'Account';
    } else if (mod.includes('opportunit')) {
      icon = <Target className="h-3.5 w-3.5 text-red-500" />;
      moduleName = 'Opportunity';
    }

    const badgeColor = act === 'CREATE' || act === 'CREATED' 
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
      : act === 'DELETE' || act === 'DELETED'
        ? 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
        : 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';

    const actionText = act === 'CREATE' ? 'CREATED' : act === 'UPDATE' ? 'UPDATED' : act === 'DELETE' ? 'DELETED' : act;

    return { icon, moduleName, badgeColor, actionText };
  };

  return (
    <div className="flex flex-col gap-0 h-full">
       {actions.length === 0 ? (
         <div className="flex h-40 flex-col items-center justify-center text-slate-400 mt-4">
           <History className="mb-2 h-8 w-8 opacity-20" />
           <p className="text-sm">No recent actions</p>
         </div>
       ) : (
         actions.map((a, i) => {
           const details = getActionDetails(a.module, a.action);
           
           return (
             <div key={i} className="flex items-center justify-between gap-4 px-3 py-2.5 border-b last:border-0 border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
               <div className="flex items-center gap-2 min-w-0">
                 {details.icon}
                 <span className="primary-text-medium text-leadgaze-dark dark:text-white">{details.moduleName}</span>
                 <Badge variant="outline" className={`h-[18px] text-[9px] px-1.5 uppercase font-bold shadow-none ${details.badgeColor}`}>
                   {details.actionText}
                 </Badge>
                 <span className="text-[13px] text-slate-600 dark:text-zinc-300 font-medium truncate ml-1">{a.entityName || 'No Details'}</span>
               </div>
               <div className="flex items-center shrink-0">
                 <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium whitespace-nowrap">
                   {a.actorName ? `by ${a.actorName}` : 'by System'} • {timeAgo(a.createdAt)}
                 </span>
               </div>
             </div>
           );
         })
       )}
    </div>
  )
}

function AccountGrowthTrends({ heightClass = "h-[320px]", data = [] }: { heightClass?: string, data?: any[] }) {
  const [timeRange, setTimeRange] = useState("6");
  
  // Default mock data if no real data is passed yet
  const chartData = data.length > 0 ? data : [
    { name: 'JAN', value: 300, value2: 120 },
    { name: 'FEB', value: 250, value2: 90 },
    { name: 'MAR', value: 210, value2: 240 },
    { name: 'APR', value: 280, value2: 190 },
    { name: 'MAY', value: 310, value2: 210 },
    { name: 'JUN', value: 350, value2: 250 },
    { name: 'JUL', value: 400, value2: 280 },
    { name: 'AUG', value: 420, value2: 300 },
    { name: 'SEP', value: 450, value2: 320 },
    { name: 'OCT', value: 480, value2: 350 },
    { name: 'NOV', value: 500, value2: 380 },
    { name: 'DEC', value: 520, value2: 400 },
  ];

  // Slice the data to show only the selected number of months
  const filteredData = useMemo(() => {
    const numMonths = parseInt(timeRange);
    return chartData.slice(-numMonths);
  }, [chartData, timeRange]);

  return (
    <CardWidgetContainer 
      title="Revenue Chart"
      headerClassName="p-2 xl:p-2 2xl:p-2"
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
          <div className="ml-2 w-32">
             <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-8 text-[11px] font-bold text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-800">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </div>
      }
    >
      <div className={`${heightClass} w-full p-4 pl-0`}>
        <ChartContainer config={{ 
           value: { label: 'Actual Won Revenue', color: '#2563eb' },
           value2: { label: 'Expected Pipeline Revenue', color: '#cbd5e1' }
        }} className="h-full w-full">
           <LineChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

function WidgetLibrary({ 
  activeWidgets, onAddWidget, onRemoveWidget,
  activeKpiCards, onAddKpiCard, onRemoveKpiCard
}: { 
  activeWidgets: string[], onAddWidget: (id: string) => void, onRemoveWidget: (id: string) => void,
  activeKpiCards: string[], onAddKpiCard: (id: string) => void, onRemoveKpiCard: (id: string) => void
}) {
  const isWidgetActive = (id: string) => activeWidgets.includes(id);
  const isKpiActive = (id: string) => activeKpiCards.includes(id);

  return (
    <div className="flex flex-col h-full bg-card border border-[#C3C6D6] overflow-hidden">
       {/* Fixed Heading */}
       <div className="flex flex-col p-3 border-b bg-card border-[#C3C6D6] sticky top-0 z-10 shrink-0">
          <h3 className="primary-heading text-leadgaze-dark leading-none dark:text-white">Widget Library</h3>
          <p className="text-[11px] text-leadgaze-dark dark:text-white font-medium mt-0.5">Drag to dashboard</p>
       </div>

       {/* Scrollable Content */}
       <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1 custom-scrollbar">
          <WidgetSection title="KPI CARDS"> 
            <WidgetItem label="Total Leads" disabled={isKpiActive('total_leads')} onClick={() => onAddKpiCard('total_leads')} onRemove={() => onRemoveKpiCard('total_leads')} />
            <WidgetItem label="Contacts" disabled={isKpiActive('contacts')} onClick={() => onAddKpiCard('contacts')} onRemove={() => onRemoveKpiCard('contacts')} />
            <WidgetItem label="Account" disabled={isKpiActive('accounts')} onClick={() => onAddKpiCard('accounts')} onRemove={() => onRemoveKpiCard('accounts')} />
            <WidgetItem label="Pipeline Value" disabled={isKpiActive('pipeline_value')} onClick={() => onAddKpiCard('pipeline_value')} onRemove={() => onRemoveKpiCard('pipeline_value')} />
          </WidgetSection>

          <WidgetSection title="CHARTS">
            <WidgetItem label="Opportunity Pipeline" disabled={isWidgetActive('pipeline')} onClick={() => onAddWidget('pipeline')} onRemove={() => onRemoveWidget('pipeline')} />
            <WidgetItem label="Revenue Chart" disabled={isWidgetActive('growth_trends')} onClick={() => onAddWidget('growth_trends')} onRemove={() => onRemoveWidget('growth_trends')} />
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
    <div className="flex flex-col gap-1">
       <span className="secondary-text-small-bold text-[#737685] tracking-wider">{title}</span>
       <div className="flex flex-col gap-1">
         {children}
       </div>
    </div>
  )
}

function WidgetItem({ label, disabled, onClick, onRemove }: { label: string, disabled?: boolean, onClick?: () => void, onRemove?: () => void }) {
  return (
    <div onClick={disabled ? undefined : onClick} className={`group flex items-center gap-2.5 p-2 border bg-white border-[#C3C6D6] dark:bg-transparent transition-all ${disabled ? 'opacity-70 border-slate-200 shadow-sm' : 'cursor-pointer border-blue-400'}`}>
       <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300 shrink-0" />
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
