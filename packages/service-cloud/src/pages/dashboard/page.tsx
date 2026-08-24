
'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  Clock3,
  Ticket,
  Users,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { Skeleton } from '@kit/ui/skeleton';
import { useLocalization } from '@kit/shared/localization';
import { cn } from '@kit/ui/utils';

import { getServiceCloudDashboardService } from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';

function formatHours(seconds: number) {
  return `${Math.round((Number(seconds || 0) / 3600) * 10) / 10}h`;
}

function maxCount(rows: any[], key: string) {
  return Math.max(1, ...rows.map((row) => Number(row[key] ?? 0)));
}

function percent(value: number, max: number) {
  return `${Math.min(100, Math.round((Number(value || 0) / max) * 100))}%`;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
      {label}
    </div>
  );
}

function SortableWidgetWrapper({ id, children, isFullWidth, onRemove }: { id: string; children: React.ReactNode; isFullWidth?: boolean; onRemove?: () => void }) {
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
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-0 left-0 w-[60%] h-14 z-40 cursor-grab active:cursor-grabbing"
        title="Drag to move"
      />
      {onRemove && (
        <button 
          onClick={onRemove}
          className="absolute top-2 right-1 z-50 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove widget"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}

function SortableKpiWrapper({ id, children, onRemove }: { id: string; children: React.ReactNode; onRemove?: () => void }) {
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
    <div ref={setNodeRef} style={style} className="relative group w-full h-full">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-0 left-0 right-12 h-10 z-40 cursor-grab active:cursor-grabbing"
        title="Drag to move"
      />
      {onRemove && (
        <button 
          onClick={onRemove}
          className="absolute top-1 right-1 z-50 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove KPI"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
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
       {disabled ? (
         <Minus className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
       ) : (
         <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300 shrink-0" />
       )}
       <span className="text-[13px] font-semibold text-slate-600 dark:text-zinc-300 flex-1">{label}</span>
       {disabled && onRemove && (
         <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hidden group-hover:flex p-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded cursor-pointer text-red-500 shadow-sm border border-red-100 dark:border-red-900/30">
           <X className="w-3.5 h-3.5" />
         </button>
       )}
    </div>
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
       <div className="flex flex-col p-3 border-b bg-card border-[#C3C6D6] sticky top-0 z-10 shrink-0">
          <h3 className="primary-heading text-leadgaze-dark leading-none dark:text-white">Widget Library</h3>
          <p className="text-[11px] text-leadgaze-dark dark:text-white font-medium mt-0.5">Drag to dashboard</p>
       </div>
       <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1 custom-scrollbar">
          <WidgetSection title="KPI CARDS"> 
            <WidgetItem label="Total Tickets" disabled={isKpiActive('total_tickets')} onClick={() => onAddKpiCard('total_tickets')} onRemove={() => onRemoveKpiCard('total_tickets')} />
            <WidgetItem label="Open Tickets" disabled={isKpiActive('open_tickets')} onClick={() => onAddKpiCard('open_tickets')} onRemove={() => onRemoveKpiCard('open_tickets')} />
            <WidgetItem label="Customers" disabled={isKpiActive('customers')} onClick={() => onAddKpiCard('customers')} onRemove={() => onRemoveKpiCard('customers')} />
            <WidgetItem label="Organizations" disabled={isKpiActive('organizations')} onClick={() => onAddKpiCard('organizations')} onRemove={() => onRemoveKpiCard('organizations')} />
            <WidgetItem label="Logged Time" disabled={isKpiActive('logged_time')} onClick={() => onAddKpiCard('logged_time')} onRemove={() => onRemoveKpiCard('logged_time')} />
          </WidgetSection>

          <WidgetSection title="ACTIVITY & CHARTS">
            <WidgetItem label="Status Workload" disabled={isWidgetActive('status_workload')} onClick={() => onAddWidget('status_workload')} onRemove={() => onRemoveWidget('status_workload')} />
            <WidgetItem label="Recent Tickets" disabled={isWidgetActive('recent_tickets')} onClick={() => onAddWidget('recent_tickets')} onRemove={() => onRemoveWidget('recent_tickets')} />
            <WidgetItem label="Priority Pressure" disabled={isWidgetActive('priority_pressure')} onClick={() => onAddWidget('priority_pressure')} onRemove={() => onRemoveWidget('priority_pressure')} />
            <WidgetItem label="Customer Pressure" disabled={isWidgetActive('customer_pressure')} onClick={() => onAddWidget('customer_pressure')} onRemove={() => onRemoveWidget('customer_pressure')} />
            <WidgetItem label="Oldest Open Tickets" disabled={isWidgetActive('oldest_open_tickets')} onClick={() => onAddWidget('oldest_open_tickets')} onRemove={() => onRemoveWidget('oldest_open_tickets')} />
          </WidgetSection>
       </div>
    </div>
  )
}

export function ServiceCloudDashboardPage({
  workspaceId,
  dateFilter,
  dateRange,
  isWidgetLibraryOpen
}: {
  workspaceId: string;
  dateFilter?: { from: string | null; to: string | null } | null;
  dateRange?: any;
  isWidgetLibraryOpen?: boolean;
}) {
  const { formatDate } = useLocalization();
  const { canAccess, isLoading: isPermissionLoading } =
    useServiceCloudPermissions(workspaceId);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.dashboard,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [activeKpiCards, setActiveKpiCards] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('service_dashboard_active_widgets');
    if (saved) {
      try {
        setActiveWidgets(JSON.parse(saved));
      } catch (e) {
        setActiveWidgets(['status_workload', 'recent_tickets', 'priority_pressure', 'customer_pressure', 'oldest_open_tickets']);
      }
    } else {
       setActiveWidgets(['status_workload', 'recent_tickets', 'priority_pressure', 'customer_pressure', 'oldest_open_tickets']);
    }

    const savedKpi = localStorage.getItem('service_dashboard_active_kpi_cards');
    if (savedKpi) {
      try {
        setActiveKpiCards(JSON.parse(savedKpi));
      } catch (e) {
        setActiveKpiCards(['total_tickets', 'open_tickets', 'customers', 'organizations', 'logged_time']);
      }
    } else {
       setActiveKpiCards(['total_tickets', 'open_tickets', 'customers', 'organizations', 'logged_time']);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('service_dashboard_active_widgets', JSON.stringify(activeWidgets));
      localStorage.setItem('service_dashboard_active_kpi_cards', JSON.stringify(activeKpiCards));
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

  const removeWidget = (id: string) => setActiveWidgets((prev) => prev.filter(w => w !== id));
  const addWidget = (id: string) => { if (!activeWidgets.includes(id)) setActiveWidgets((prev) => [...prev, id]); };
  const removeKpiCard = (id: string) => setActiveKpiCards((prev) => prev.filter(w => w !== id));
  const addKpiCard = (id: string) => { if (!activeKpiCards.includes(id)) setActiveKpiCards((prev) => [...prev, id]); };

  const getKpiGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5';
  };

  const queryString = useMemo(() => {
    if (!dateRange || !dateRange.preset) return '';
    const params = new URLSearchParams();
    params.set('timeframePreset', dateRange.preset);
    if (dateRange.from) params.set('timeframeFrom', dateRange.from);
    if (dateRange.to) params.set('timeframeTo', dateRange.to);
    return `?${params.toString()}`;
  }, [dateRange]);

  const { data, isLoading } = useQuery({
    queryKey: ['service-cloud', 'dashboard', workspaceId, dateFilter],
    queryFn: () => getServiceCloudDashboardService(workspaceId, dateFilter),
    enabled: Boolean(workspaceId && canView),
  });

  if (isPermissionLoading || isLoading || !isMounted) {
    return <ServiceCloudDashboardSkeleton />;
  }

  if (!canView) {
    return <ServiceCloudAccessDenied label="Service Cloud" />;
  }

  const reports = data?.reports ?? {};
  const statusBreakdown = reports.statusBreakdown ?? [];
  const priorityBreakdown = reports.priorityBreakdown ?? [];
  const customerBreakdown = reports.customerBreakdown ?? [];
  const openTicketAging = reports.openTicketAging ?? [];
  const statusMax = maxCount(statusBreakdown, 'count');

  const getKpiData = (id: string) => {
    switch (id) {
      case 'total_tickets':
        return {
          label: 'TOTAL TICKETS',
          value: data?.totalTickets ?? 0,
          icon: Ticket,
          detail: 'All active service tickets',
          iconBg: 'bg-primary dark:bg-leadgaze-primary',
          link: '/home/services/tickets',
        };
      case 'open_tickets':
        return {
          label: 'OPEN TICKETS',
          value: data?.openTickets ?? 0,
          icon: AlertCircle,
          detail: 'Unresolved customer work',
          iconBg: 'bg-activity-4',
          link: '/home/services/tickets?status=open',
          detailClassName: 'text-[#BA1A1A]',
        };
      case 'customers':
        return {
          label: 'CUSTOMERS',
          value: data?.customers ?? 0,
          icon: Users,
          detail: 'Support customer records',
          iconBg: 'bg-activity-5',
          link: '/home/services/customers?tab=customers',
        };
      case 'organizations':
        return {
          label: 'ORGANIZATIONS',
          value: data?.organizations ?? 0,
          icon: Building2,
          detail: 'Linked companies',
          iconBg: 'bg-activity-3',
          link: '/home/services/customers?tab=organizations',
          detailClassName: 'text-leadgaze-dark dark:text-white',
        };
      case 'logged_time':
        return {
          label: 'LOGGED TIME',
          value: formatHours(data?.totalLoggedSeconds ?? 0),
          icon: Clock3,
          detail: 'Tracked support effort',
          iconBg: 'bg-activity-6',
        };
      default:
        return null;
    }
  };

  const getWidgetComponent = (id: string, index: number) => {
    // Logic for layering to handle masonry-like look
    const isSecondLayer = index === 2 || index === 3;
    const heightClass = isSecondLayer ? 'h-[200px]' : 'h-[320px]';

    switch (id) {
      case 'status_workload':
        return (
          <CardWidgetContainer
            title="Status Workload"
            description="Where the current support queue is concentrated."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className={`space-y-4 px-2 py-2 flex-1 ${heightClass} overflow-auto`}>
              {statusBreakdown.length === 0 ? (
                <EmptyState label="No ticket statuses found." />
              ) : (
                statusBreakdown.map((status: any) => {
                  let barColor = 'bg-leadgaze-success';
                  const nameLower = status.name.toLowerCase();
                  if (nameLower === 'new') barColor = 'var(--color-ticket-status-new)';
                  else if (nameLower === 'open') barColor = 'var(--color-ticket-status-open)';
                  else if (nameLower === 'in progress') barColor = 'var(--color-ticket-status-in-progress)';
                  else if (nameLower.includes('waiting')) barColor = 'var(--color-ticket-status-waiting)';
                  else if (nameLower === 'resolved') barColor = 'var(--color-ticket-status-resolved)';
                  else if (nameLower === 'closed') barColor = 'var(--color-ticket-status-closed)';

                  const isCustomColor = barColor.startsWith('var(') || barColor.startsWith('#');

                  return (
                    <div key={status.id}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">{status.name}</span>
                          <span className="text-muted-foreground text-xs">•</span>
                          <span className="text-muted-foreground text-xs">{formatHours(status.loggedSeconds ?? 0)} logged</span>
                        </div>
                        <div className="secondary-text-small-semibold font-bold text-leadgaze-dark dark:text-white">{status.count}</div>
                      </div>
                      <div className="bar-bg h-2 w-full overflow-hidden rounded-full bg-[#EDEEF0]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${!isCustomColor ? barColor : ''}`}
                          style={{
                            width: percent(status.count, statusMax),
                            ...(isCustomColor ? { backgroundColor: barColor } : {})
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardWidgetContainer>
        );
      case 'recent_tickets':
        return (
          <CardWidgetContainer
            title="Recent Tickets"
            description="Newest customer issues entering the queue."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className={`py-0 flex-1 ${heightClass} overflow-auto`}>
              {(data?.recentTickets ?? []).length === 0 ? (
                <EmptyState label="No tickets yet." />
              ) : (
                <CardWidgetList className="gap-0 mb-1">
                  {data.recentTickets.map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/home/services/tickets/${ticket.id}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        icon={
                          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                            <Ticket className="h-4 w-4" />
                          </div>
                        }
                        title={`#${ticket.ticket_number} ${ticket.subject}`}
                        subtitle={`${ticket.source} · ${formatDate(ticket.created_at)}`}
                        badge={
                          <Badge variant="outline" className="text-[11px] font-normal bg-[#E7E8EA] rounded-none dark:text-leadgaze-dark">
                            {ticket.email_count ?? 0} emails
                          </Badge>
                        }
                        className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                        isBadgeVerticalCenter={true}
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
        );
      case 'priority_pressure':
        return (
          <CardWidgetContainer
            title="Priority Pressure"
            description="Open work by severity."            
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className={`px-2 py-2 flex-1 ${heightClass} overflow-auto`}>
              {priorityBreakdown.length === 0 ? (
                <EmptyState label="No priority data yet." />
              ) : (
                <div className="space-y-2">
                  {priorityBreakdown.slice(0, 6).map((priority: any) => {
                    const nameLower = priority.name.toLowerCase();
                    const isUrgent = nameLower === 'urgent';
                    const isCritical = nameLower === 'critical';
                    
                    const textColor = isCritical ? 'var(--color-ticket-priority-critical-text)' : undefined;
                    const subTextColor = isUrgent || isCritical ? 'var(--color-ticket-priority-critical-text)' : undefined;
                    const badgeBg = isUrgent ? 'var(--color-ticket-priority-urgent-bg)' : isCritical ? 'var(--color-ticket-priority-critical-bg)' : '#E5E7EB';
                    const badgeColor = isUrgent ? 'var(--color-ticket-priority-critical-text)' : isCritical ? '#FFFFFF' : '#111827';
                    
                    const itemClass = cn(
                      "flex items-center justify-between p-2 border bg-white dark:bg-zinc-900",
                      isCritical ? "border-[#FADAD6]" : "border-border"
                    );

                    return (
                      <div key={priority.id} className={itemClass}>
                        <div>
                          <div className="secondary-text-small-semibold" style={{ color: textColor || 'inherit' }}>{priority.name}</div>
                          <div className="text-[10px] mt-1" style={{ color: subTextColor || 'var(--color-leadgaze-muted)' }}>{`${priority.openCount} open`}</div>
                        </div>
                        <Badge 
                          className="px-2 py-1 !secondary-text-small-semibold rounded-sm hover:opacity-100"
                          style={{ backgroundColor: badgeBg, color: badgeColor, border: 'none' }}
                        >
                          {priority.count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardWidgetContainer>
        );
      case 'customer_pressure':
        return (
          <CardWidgetContainer
            title="Customer Pressure"
            description="Customers with the most open service work."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className={`px-0 py-0 flex-1 ${heightClass} overflow-auto`}>
              {customerBreakdown.length === 0 ? (
                <EmptyState label="No customer ticket data." />
              ) : (
                <CardWidgetList className="gap-0 mb-1">
                  {customerBreakdown.slice(0, 6).map((customer: any) => (
                    <Link
                      key={customer.id}
                      href={`/home/services/customers${queryString}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        title={customer.name}
                        subtitle={
                          customer.email ||
                          customer.organization ||
                          'No contact context'
                        }
                        badge={<Badge className="bg-[var(--color-ticket-status-open)] rounded-none text-[11px] text-white">{customer.openTickets} open</Badge>}
                        metadata={
                          <span>
                            {customer.totalTickets} total ·{' '}
                            {formatHours(customer.loggedSeconds)} logged
                          </span>
                        }
                        className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                        isBadgeVerticalCenter={true}
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
        );
      case 'oldest_open_tickets':
        return (
          <CardWidgetContainer
            title="Oldest Open Tickets"
            description="Tickets most likely to need attention."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className={`py-0 flex-1 ${heightClass} overflow-auto`}>
              {openTicketAging.length === 0 ? (
                <EmptyState label="No open tickets." />
              ) : (
                <CardWidgetList className="gap-0 mb-1">
                  {openTicketAging.slice(0, 6).map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/home/services/tickets/${ticket.id}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        title={`#${ticket.ticketNumber} ${ticket.subject}`}
                        subtitle={`${ticket.customer} · ${ticket.assignee}`}
                        className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                        titleClassFormat="secondary-text-small-semibold !font-bold"
                        badge={
                          <span className={cn('text-[11px] font-normal', ticket.daysOpen >= 25 && 'text-[var(--color-ticket-priority-critical-text)] font-bold')}>
                            {ticket.daysOpen}d open
                          </span>
                        }
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col pb-4 duration-500 w-full relative">
      <div className={`flex w-full items-start ${isWidgetLibraryOpen ? 'gap-2' : ''}`}>
        <div className={`flex flex-col transition-all duration-300 ${isWidgetLibraryOpen ? 'w-[calc(100%-300px)] xl:w-[calc(100%-320px)]' : 'w-full'}`}>
          
          <DndContext id="kpi-dnd-service" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
            <SortableContext items={activeKpiCards} strategy={rectSortingStrategy}>
              <div className={`grid gap-2 pb-0 xl:gap-2 xl:pb-0 2xl:gap-2 2xl:pb-0 ${getKpiGridClass(activeKpiCards.length)}`}>
                {activeKpiCards.map((id) => {
                  const card = getKpiData(id);
                  if (!card) return null;
                  const Icon = card.icon;

                  return (
                    <SortableKpiWrapper key={id} id={id} onRemove={() => removeKpiCard(id)}>
                      <Card className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0 relative">
                          <div className="space-y-1">
                            <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white pointer-events-auto">
                              {card.label}
                            </CardTitle>
                            {card.link ? (
                              <Link
                                href={card.link.includes('?') ? `${card.link}&${queryString.replace('?', '')}` : `${card.link}${queryString}`}
                                className="hover:underline inline-block relative z-10 pointer-events-auto"
                              >
                                <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                                  {card.value}
                                </div>
                              </Link>
                            ) : (
                              <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100 relative z-10 pointer-events-auto">
                                {card.value}
                              </div>
                            )}
                          </div>
                          <div className={`flex h-8 w-8 items-center justify-center rounded relative z-10 pointer-events-none ${card.iconBg}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2 relative z-10 pointer-events-none">
                          <CardDescription className={cn("secondary-text-small", card.detailClassName || "text-leadgaze-success")}>
                            {card.detail}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </SortableKpiWrapper>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          <DndContext id="widget-dnd-service" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
                {activeWidgets.map((id, index) => {
                  const isLastAndOdd = index === activeWidgets.length - 1 && activeWidgets.length % 2 !== 0;

                  return (
                    <SortableWidgetWrapper key={id} id={id} isFullWidth={isLastAndOdd} onRemove={() => removeWidget(id)}>
                      {getWidgetComponent(id, index)}
                    </SortableWidgetWrapper>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

        </div>

        {/* Widget Library Sidebar */}
        <div 
          className={`shrink-0 sticky top-0 transition-all duration-300 overflow-hidden ${
            isWidgetLibraryOpen ? 'w-[300px] xl:w-[320px] opacity-100 h-[calc(100vh-92px)]' : 'w-0 opacity-0 h-0'
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

export function ServiceCloudDashboardSkeleton() {
  return (
    <div className="animate-in fade-in flex flex-col pb-4 duration-500 w-full relative">
      <div className="grid gap-2 pb-0 xl:gap-2 xl:pb-0 2xl:gap-2 2xl:pb-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex h-32 xl:h-28 2xl:h-32 flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </CardHeader>
            <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
        {/* Status Workload Skeleton */}
        <Card className="h-[320px] flex flex-col overflow-hidden">
          <CardHeader className="p-2 xl:p-2 2xl:p-2 border-b">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-52" />
          </CardHeader>
          <div className="space-y-4 px-2 py-4 flex-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-6" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        {/* Priority Pressure Skeleton */}
        <Card className="h-[320px] flex flex-col overflow-hidden">
          <CardHeader className="p-2 xl:p-2 2xl:p-2 border-b">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-44" />
          </CardHeader>
          <div className="px-2 py-4 space-y-2 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 border border-border bg-white dark:bg-zinc-900">
                <div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-12 mt-1" />
                </div>
                <Skeleton className="h-6 w-8 rounded-sm" />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Tickets Skeleton */}
        <Card className="h-[200px] flex flex-col overflow-hidden">
          <CardHeader className="p-2 xl:p-2 2xl:p-2 border-b">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-52" />
          </CardHeader>
          <div className="py-0 flex-1">
            <CardWidgetList className="gap-0 mb-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
                  <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-none" />
                </div>
              ))}
            </CardWidgetList>
          </div>
        </Card>

        {/* Customer Pressure Skeleton */}
        <Card className="h-[200px] flex flex-col overflow-hidden">
          <CardHeader className="p-2 xl:p-2 2xl:p-2 border-b">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-44" />
          </CardHeader>
          <div className="px-0 py-0 flex-1">
            <CardWidgetList className="gap-0 mb-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-none" />
                </div>
              ))}
            </CardWidgetList>
          </div>
        </Card>

        {/* Oldest Open Tickets Skeleton */}
        <Card className="h-[320px] flex flex-col overflow-hidden lg:col-span-2">
          <CardHeader className="p-2 xl:p-2 2xl:p-2 border-b">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-44" />
          </CardHeader>
          <div className="py-0 flex-1">
            <CardWidgetList className="gap-0 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-none" />
                </div>
              ))}
            </CardWidgetList>
          </div>
        </Card>
      </div>
    </div>
  );
}
