'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Download, FileUp, Loader2, Plus, User } from 'lucide-react';
import { toast } from 'sonner';

import { useLocalization } from '@kit/shared/localization';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@kit/ui/tooltip';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { cn } from '@kit/ui/utils';

import {
  type ServiceCloudRecord,
  createServiceCloudResourceService,
  getServiceCloudResourceService,
  getServiceCloudTicketLookupsService,
} from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { PageHeader } from '@kit/ui/page';
import {
  ServiceCloudResourcePage,
  StatusBadge,
} from '../_components/resource-page';

function assigneeInitials(assignee: any) {
  const account = assignee?.account;
  const label = account?.name || account?.email || '?';

  return label
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('');
}

import { useRouter } from 'next/navigation';
import { ViewToggle } from '@kit/ui/view-toggle';
import { TicketsKanbanBoard } from './components/kanban/tickets-kanban-board';

function AssigneeStack({ assignees = [] }: { assignees?: any[] }) {
  if (assignees.length === 0) {
    return <span className="text-muted-foreground text-xs">Unassigned</span>;
  }

  const visibleAssignees = assignees.slice(0, 4);
  const overflowCount = assignees.length - visibleAssignees.length;

  return (
    <div className="flex items-center">
      {visibleAssignees.map((assignee: any) => {
        const account = assignee.account;

        return (
          <Avatar
            key={assignee.id}
            className="border-background -ml-2 h-7 w-7 border-2 first:ml-0"
            title={account?.name || account?.email || 'Unassigned'}
          >
            <AvatarImage src={account?.picture_url ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {assigneeInitials(assignee)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflowCount > 0 ? (
        <div className="border-background bg-muted -ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-medium">
          +{overflowCount}
        </div>
      ) : null}
    </div>
  );
}

export function ServiceCloudTicketsPage({
  workspaceId,
  isAdmin = false,
  onColumnAddClick,
  onColumnEditClick,
  customColumns = [],
  systemFields = [],
  canViewColumn,
  canEditField,
  currentUserId,
  teamMembers = [],
  canImport = false,
  onImportClick,
}: {
  workspaceId: string;
  isAdmin?: boolean;
  onColumnAddClick?: () => void;
  onColumnEditClick?: (columnKey: string) => void;
  customColumns?: any[];
  systemFields?: any[];
  /** Optional FLS function: columns for which this returns false are hidden. */
  canViewColumn?: (columnKey: string) => boolean;
  /** Optional FLS function: form fields for which this returns false are hidden in create/edit modals. */
  canEditField?: (fieldKey: string) => boolean;
  currentUserId?: string;
  teamMembers?: any[];
  canImport?: boolean;
  onImportClick?: () => void;
}) {
  const { formatDate } = useLocalization();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    if (typeof window === 'undefined') return 'table';
    return (localStorage.getItem('leadgaze-view-mode-tickets') as any) ?? 'table';
  });
  const handleViewModeChange = (mode: 'table' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('leadgaze-view-mode-tickets', mode);
  };
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const getLabel = (key: string, fallback: string) =>
    systemFields.find((f: any) => f.field_key === key)?.field_label ?? fallback;
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );
  const canCreate = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.create,
  );
  const canEdit = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.edit,
  );
  const canDelete = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.delete,
  );

  const searchParams = useSearchParams();
  const filterStatusParam = searchParams?.get('status');

  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [selectedPriorityIds, setSelectedPriorityIds] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);

  const {
    dateRange: createdOnRange,
    setDateRange: setCreatedOnRange,
    computedDates: computedCreatedOnDates,
    clearDateRange: clearCreatedOnRange,
  } = useDateRangeFilter();
  const {
    dateRange: updatedOnRange,
    setDateRange: setUpdatedOnRange,
    computedDates: computedUpdatedOnDates,
    clearDateRange: clearUpdatedOnRange,
  } = useDateRangeFilter('updated');

  // Optimized: single API call fetches statuses + priorities + categories in parallel on server
  const { data: lookups, isLoading: lookupsIsLoading } = useQuery({
    queryKey: ['service-cloud', 'ticket-lookups', workspaceId],
    queryFn: () => getServiceCloudTicketLookupsService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const allStatuses: any[] = lookups?.statuses ?? [];
  const allPriorities: any[] = lookups?.priorities ?? [];
  const allCategories: any[] = lookups?.categories ?? [];

  // Filter out private statuses/priorities that the current user cannot access
  const statuses = allStatuses.filter((s: any) => {
    if (s.access_type === 'public') return true;
    if (s.access_type === 'private') return false;
    return true;
  });

  const priorities = allPriorities.filter((p: any) => {
    if (p.access_type === 'public') return true;
    if (p.access_type === 'private') return false;
    return true;
  });

  const categories = allCategories;

  const defaultStatusIds = useMemo(() => {
    if (filterStatusParam === 'open') {
      return statuses.filter((s: any) => s.lifecycle === 'open').map((s: any) => s.id);
    }
    return statuses
      .filter((s: any) => s.lifecycle !== 'closed' && s.lifecycle !== 'resolved')
      .map((s: any) => s.id);
  }, [statuses, filterStatusParam]);

  const statusOptions = statuses.map((status: any) => ({
    label: status.name,
    value: status.id,
    color: status.color,
  }));
  const openStatus =
    statuses.find((status: any) => status.lifecycle === 'open') ?? statuses[0];
  const priorityOptions = priorities.map((priority: any) => ({
    label: priority.name,
    value: priority.id,
    color: priority.color,
  }));
  const categoryOptions = categories.map((category: any) => ({
    label: category.name,
    value: category.id,
  }));
  const statusById = useMemo(() => new Map<string, any>(
    allStatuses.map((status: any) => [status.id, status]),
  ), [allStatuses]);
  const priorityById = useMemo(() => new Map<string, any>(
    allPriorities.map((priority: any) => [priority.id, priority]),
  ), [allPriorities]);
  const categoryById = useMemo(() => new Map<string, any>(
    allCategories.map((cat: any) => [cat.id, cat]),
  ), [allCategories]);

  // CSV Export fields config
  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ticket_number', label: 'Ticket #' },
      { key: 'subject', label: 'Subject' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'category', label: 'Category' },
      { key: 'customer_name', label: 'Customer Name' },
      { key: 'customer_email', label: 'Customer Email' },
      { key: 'organization', label: 'Organization' },
      { key: 'assignees', label: 'Assignees' },
      { key: 'source', label: 'Source' },
      { key: 'created_at', label: 'Created At' },
      { key: 'updated_at', label: 'Updated At' },
    ],
    [],
  );

  const exportColumns = useMemo(() => {
    const cols = [
      ...EXPORT_COLUMNS,
      ...systemFields
        .filter((f: any) => !f.is_system)
        .map((f: any) => ({ key: f.field_key, label: f.field_label })),
    ];
    if (canViewColumn) {
      return cols.filter((col) => canViewColumn(col.key));
    }
    return cols;
  }, [EXPORT_COLUMNS, systemFields, canViewColumn]);

  const serializeTicketRow = useCallback(
    (ticket: any): Record<string, string> => {
      const base: Record<string, string> = {
        ticket_number: ticket.ticket_number ?? '',
        subject: ticket.subject ?? '',
        description: ticket.description ?? '',
        status: statusById.get(ticket.status_id)?.name ?? '',
        priority: priorityById.get(ticket.priority_id)?.name ?? '',
        category: categoryById.get(ticket.category_id)?.name ?? '',
        customer_name: ticket.customer?.name ?? '',
        customer_email: ticket.customer?.email ?? '',
        organization: ticket.organization?.name ?? '',
        assignees: Array.isArray(ticket.assignees)
          ? ticket.assignees
              .map((a: any) => a.account?.name || a.account?.email || '')
              .filter(Boolean)
              .join(', ')
          : '',
        source: ticket.source ?? '',
        created_at: ticket.created_at ? formatDate(ticket.created_at) : '',
        updated_at: ticket.updated_at ? formatDate(ticket.updated_at) : '',
      };

      // Append custom fields
      systemFields
        .filter((f: any) => !f.is_system)
        .forEach((cf: any) => {
          base[cf.field_key] = String(ticket.custom_fields?.[cf.field_key] ?? '');
        });

      return base;
    },
    [statusById, priorityById, categoryById, formatDate, systemFields],
  );

  const activeFilterCount =
    (assignedToMeOnly ? 1 : 0) +
    (selectedCreatedByIds.length > 0 ? 1 : 0) +
    (selectedStatusIds.length > 0 ? 1 : 0) +
    (selectedPriorityIds.length > 0 ? 1 : 0) +
    (selectedAssigneeIds.length > 0 ? 1 : 0) +
    (createdOnRange ? 1 : 0) +
    (updatedOnRange ? 1 : 0);

  const filterGroups = [
    {
      key: 'status',
      label: 'Status',
      selectedValues: selectedStatusIds,
      selectedLabel:
        selectedStatusIds.length === 0
          ? 'All statuses'
          : `${selectedStatusIds.length} selected`,
      options: statusOptions,
      onSelectValues: setSelectedStatusIds,
    },
    {
      key: 'priority',
      label: 'Priority',
      selectedValues: selectedPriorityIds,
      selectedLabel:
        selectedPriorityIds.length === 0
          ? 'All priorities'
          : `${selectedPriorityIds.length} selected`,
      options: priorityOptions,
      onSelectValues: setSelectedPriorityIds,
    },
    {
      key: 'assignees',
      label: 'Assignees',
      selectedValues: selectedAssigneeIds,
      selectedLabel:
        selectedAssigneeIds.length === 0
          ? 'All assignees'
          : selectedAssigneeIds.length === 1
            ? ((
                (Array.isArray(teamMembers) ? teamMembers : []).find(
                  (m: any) => m?.user_id === selectedAssigneeIds[0],
                ) as any
              )?.user?.user_metadata?.full_name ?? '1 selected')
            : `${selectedAssigneeIds.length} selected`,
      options: (Array.isArray(teamMembers) ? teamMembers : [])
        .filter((m: any) => m?.user_id)
        .reduce((acc: any[], m: any) => {
          if (!acc.some((x) => x.value === m.user_id)) {
            acc.push({
              value: m.user_id,
              label:
                m.user?.user_metadata?.full_name ||
                m.user?.email ||
                m.user_id,
            });
          }
          return acc;
        }, []),
      onSelectValues: setSelectedAssigneeIds,
    },
    {
      key: 'created_by',
      label: 'Created By',
      selectedValues: selectedCreatedByIds,
      selectedLabel:
        selectedCreatedByIds.length === 0
          ? 'All members'
          : selectedCreatedByIds.length === 1
            ? ((
                (Array.isArray(teamMembers) ? teamMembers : []).find(
                  (m: any) => m?.user_id === selectedCreatedByIds[0],
                ) as any
              )?.user?.user_metadata?.full_name ?? '1 selected')
            : `${selectedCreatedByIds.length} selected`,
      options: (Array.isArray(teamMembers) ? teamMembers : [])
        .filter((m: any) => m?.user_id)
        .reduce((acc: any[], m: any) => {
          if (!acc.some((x) => x.value === m.user_id)) {
            acc.push({
              value: m.user_id,
              label:
                m.user?.user_metadata?.full_name ||
                m.user?.email ||
                m.user_id,
            });
          }
          return acc;
        }, []),
      onSelectValues: setSelectedCreatedByIds,
    },
    {
      key: 'created_on',
      label: 'Created On',
      type: 'date',
      dateValue: createdOnRange,
      onDateChange: setCreatedOnRange,
    },
    {
      key: 'updated_on',
      label: 'Updated On',
      type: 'date',
      dateValue: updatedOnRange,
      onDateChange: setUpdatedOnRange,
    },
  ];

  const queryParams = {
    ...(assignedToMeOnly ? { assignedToMe: 'true' } : {}),
    ...(selectedCreatedByIds.length > 0 ? { createdByIds: selectedCreatedByIds.join(',') } : {}),
    ...(selectedStatusIds.length > 0
      ? { statusIds: selectedStatusIds.join(',') }
      : defaultStatusIds.length > 0
        ? { statusIds: defaultStatusIds.join(',') }
        : {}),
    ...(selectedPriorityIds.length > 0 ? { priorityIds: selectedPriorityIds.join(',') } : {}),
    ...(selectedAssigneeIds.length > 0 ? { assigneeIds: selectedAssigneeIds.join(',') } : {}),
    ...(computedCreatedOnDates?.from
      ? { createdAtFrom: computedCreatedOnDates.from }
      : {}),
    ...(computedCreatedOnDates?.to
      ? { createdAtTo: computedCreatedOnDates.to }
      : {}),
    ...(computedUpdatedOnDates?.from
      ? { updatedAtFrom: computedUpdatedOnDates.from }
      : {}),
    ...(computedUpdatedOnDates?.to
      ? { updatedAtTo: computedUpdatedOnDates.to }
      : {}),
  };



  // --- Custom Create Ticket state ---
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(
    'existing',
  );
  const [organizationMode, setOrganizationMode] = useState<
    'none' | 'existing' | 'new'
  >('none');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketStatusId, setTicketStatusId] = useState('');
  const [ticketPriorityId, setTicketPriorityId] = useState('');
  const [ticketCategoryId, setTicketCategoryId] = useState('');

  const { data: customers = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'ticket-create-customers', workspaceId],
    queryFn: () => getServiceCloudResourceService('customers', workspaceId),
    enabled: createOpen && Boolean(workspaceId),
  });

  const { data: organizations = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'ticket-create-organizations', workspaceId],
    queryFn: () => getServiceCloudResourceService('organizations', workspaceId),
    enabled: createOpen && Boolean(workspaceId),
  });

  const resetCreateForm = () => {
    setCustomerMode('existing');
    setOrganizationMode('none');
    setSelectedCustomerId('');
    setSelectedOrganizationId('');
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewOrganizationName('');
    setTicketSubject('');
    setTicketDescription('');
    setTicketStatusId(openStatus?.id ?? '');
    setTicketPriorityId('');
    setTicketCategoryId('');
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create organization if needed
      let orgId =
        organizationMode === 'existing' ? selectedOrganizationId || null : null;
      if (organizationMode === 'new' && newOrganizationName) {
        const org = await createServiceCloudResourceService('organizations', {
          name: newOrganizationName,
          workspace_id: workspaceId,
        });
        orgId = org?.id ?? null;
      }

      // Step 2: Create customer if needed
      let custId =
        customerMode === 'existing' ? selectedCustomerId || null : null;
      if (customerMode === 'new' && newCustomerName && newCustomerEmail) {
        const cust = await createServiceCloudResourceService('customers', {
          name: newCustomerName,
          email: newCustomerEmail,
          organization_id: orgId,
          workspace_id: workspaceId,
        });
        custId = cust?.id ?? null;
      }

      // Step 3: Create the ticket
      return createServiceCloudResourceService('tickets', {
        subject: ticketSubject,
        description: ticketDescription || null,
        status_id: ticketStatusId || openStatus?.id || null,
        priority_id: ticketPriorityId || null,
        category_id: ticketCategoryId || null,
        customer_id: custId,
        organization_id: orgId,
        source: 'manual',
        workspace_id: workspaceId,
      });
    },
    onSuccess: () => {
      toast.success('Ticket created');
      setCreateOpen(false);
      resetCreateForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ticket');
    },
  });

  const submitCreateTicket = () => {
    if (!ticketSubject) {
      toast.error('Subject is required');
      return;
    }
    if (customerMode === 'existing' && !selectedCustomerId) {
      toast.error('Select a customer or create a new one');
      return;
    }
    if (customerMode === 'new' && (!newCustomerName || !newCustomerEmail)) {
      toast.error('Customer name and email are required');
      return;
    }
    if (organizationMode === 'new' && !newOrganizationName) {
      toast.error('Organization name is required');
      return;
    }
    if (organizationMode === 'existing' && !selectedOrganizationId) {
      toast.error('Select an organization or choose none');
      return;
    }
    createTicketMutation.mutate();
  };

  const queryParamsForCounts = { ...queryParams };
  delete queryParamsForCounts.statusIds;
  delete queryParamsForCounts.assignedToMe;

  const { data: allTickets = [] } = useQuery({
    queryKey: ['service-cloud', 'tickets', workspaceId, queryParamsForCounts],
    queryFn: () =>
      getServiceCloudResourceService('tickets', workspaceId, queryParamsForCounts),
    enabled: Boolean(workspaceId),
  });

  const getStatusCount = (statusId: string) => {
    return allTickets.filter((t: any) => t.status_id === statusId).length;
  };

  const getAssignedToMeCount = () => {
    return allTickets.filter((t: any) =>
      t.assignees?.some((a: any) => a.account_id === currentUserId || a.user_id === currentUserId)
    ).length;
  };

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canView) return <ServiceCloudAccessDenied label="tickets" />;

  const tabsSlot = (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      <button
        onClick={() => {
          setSelectedStatusIds([]);
          setAssignedToMeOnly(false);
        }}
        className={`px-3 py-1 text-sm font-medium rounded-t-md border-b-2 whitespace-nowrap flex items-center gap-2 ${
          selectedStatusIds.length === 0 && !assignedToMeOnly
            ? 'border-leadgaze-primary text-leadgaze-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        <span className="flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          All Tickets
        </span>
        <span className={cn(
          "ml-1 rounded-full px-2 py-0.5 text-xs border",
          selectedStatusIds.length === 0 && !assignedToMeOnly ? "border-blue-200 bg-blue-50 text-leadgaze-primary" : "border-gray-200 bg-gray-50 text-gray-600"
        )}>
          {allTickets.length}
        </span>
      </button>
      
      <button
        onClick={() => {
          setAssignedToMeOnly(true);
          setSelectedStatusIds([]);
        }}
        className={`px-3 py-1 text-sm font-medium rounded-t-md border-b-2 whitespace-nowrap flex items-center gap-2 ${
          assignedToMeOnly
            ? 'border-leadgaze-primary text-leadgaze-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Assigned to me
        <span className={cn(
          "ml-1 rounded-full px-2 py-0.5 text-xs border",
          assignedToMeOnly ? "border-blue-200 bg-blue-50 text-leadgaze-primary" : "border-gray-200 bg-gray-50 text-gray-600"
        )}>
          {getAssignedToMeCount()}
        </span>
      </button>

      {statuses.map((status: any) => {
        const isSelected = selectedStatusIds.includes(status.id) && !assignedToMeOnly;
        return (
          <button
            key={status.id}
            onClick={() => {
              setSelectedStatusIds([status.id]);
              setAssignedToMeOnly(false);
            }}
            className={`px-3 py-1 text-sm font-medium rounded-t-md border-b-2 whitespace-nowrap flex items-center gap-2 ${
              isSelected
                ? 'border-leadgaze-primary text-leadgaze-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {status.name}
            <span className={cn(
              "ml-1 rounded-full px-2 py-0.5 text-xs border",
              isSelected ? "border-blue-200 bg-blue-50 text-leadgaze-primary" : "border-gray-200 bg-gray-50 text-gray-600"
            )}>
              {getStatusCount(status.id)}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden gap-2">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader title="Tickets">
          {canCreate && (
            <Button
              onClick={openCreateDialog}
              className="secondary-text-small-bold gap-1.5 px-2 bg-leadgaze-primary hover:bg-leadgaze-primary text-white"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          )}
        </PageHeader>
      </div>
      <ServiceCloudResourcePage
        workspaceId={workspaceId}
        viewMode={viewMode}
        kanbanSlot={(data, refetch) => (
          <TicketsKanbanBoard
            workspaceId={workspaceId}
            tickets={data}
            statuses={statuses}
            priorities={priorities}
            isLoading={lookupsIsLoading}
            canUpdate={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
            onClick={(id) => router.push(`/home/services/tickets/${id}`)}
            onDelete={() => {}}
            onCreateTicket={(statusId) => {
              setTicketStatusId(statusId);
              setCreateOpen(true);
            }}
            refetch={refetch}
          />
        )}
        resource="tickets"
        title=""
        description=""
        tabsSlot={tabsSlot}
        canCreate={false}
        canEdit={canEdit}
        canDelete={canDelete}
        isAdmin={isAdmin}
        onColumnAddClick={onColumnAddClick}
        onColumnEditClick={onColumnEditClick}
        canViewColumn={canViewColumn}
        canEditField={canEditField}
        currentUserId={currentUserId}
        systemFields={systemFields}
        enableExport={true}
        serializeRow={serializeTicketRow}
        exportColumns={exportColumns}
        queryParams={queryParams}
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setAssignedToMeOnly(false);
          setSelectedCreatedByIds([]);
          setSelectedStatusIds([]);
          setSelectedPriorityIds([]);
          setSelectedAssigneeIds([]);
          clearCreatedOnRange();
          clearUpdatedOnRange();
        }}
        toolbar={
          <div className="flex items-center gap-2">
            <ViewToggle view={viewMode} onChange={handleViewModeChange} />
          </div>
        }
        actions={[
          ...(canImport && onImportClick
            ? [
                {
                  key: 'import',
                  label: 'Import',
                  icon: Download,
                  onClick: onImportClick,
                  buttonVariant: 'outline' as const,
                },
              ]
            : []),
        ]}
        fields={[
          {
            key: 'subject',
            label: getLabel('subject', 'Subject'),
            required: true,
          },
          { key: 'description', label: getLabel('description', 'Description') },
          {
            key: 'status_id',
            label: getLabel('status_id', 'Status'),
            type: 'select',
            required: true,
            options: statusOptions,
          },
          {
            key: 'priority_id',
            label: getLabel('priority_id', 'Priority'),
            type: 'select',
            options: priorityOptions,
          },
          {
            key: 'category_id',
            label: getLabel('category_id', 'Category'),
            type: 'select',
            options: categoryOptions,
          },
        ]}
        columns={[
          {
            key: 'sno',
            label: 'S. No.',
            sortable: false,
            width: 'w-12',
            minWidth: 30,
            className: 'text-muted-foreground w-12',
            render: (_, index, pagination) => {
              if (index === undefined || !pagination) return '-';
              return (pagination.currentPage - 1) * pagination.pageSize + index + 1;
            },
          },
          {
            key: 'subject',
            label: getLabel('subject', 'Subject'),
            render: (ticket) => (
              <div className="flex items-center gap-2">
                <Link
                  href={`/home/services/tickets/${ticket.id}`}
                  className="text-primary font-medium hover:underline"
                >
                  {ticket.subject}
                </Link>
                {ticket.ticket_number && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          #{ticket.ticket_number}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ticket: #{ticket.ticket_number}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ),
          },
          {
            key: 'assignees',
            label: getLabel('assignees', 'Assignees'),
            render: (ticket) => <AssigneeStack assignees={ticket.assignees} />,
          },
          {
            key: 'status_id',
            label: getLabel('status_id', 'Status'),
            render: (ticket) => (
              <StatusBadge
                value={statusById.get(ticket.status_id)?.name as string}
                color={statusById.get(ticket.status_id)?.color as string}
              />
            ),
          },
          {
            key: 'priority_id',
            label: getLabel('priority_id', 'Priority'),
            render: (ticket) => (
              <StatusBadge
                value={priorityById.get(ticket.priority_id)?.name as string}
                color={priorityById.get(ticket.priority_id)?.color as string}
              />
            ),
          },
          {
            key: 'created_at',
            label: getLabel('created_at', 'Created'),
            render: (ticket) =>
              ticket.created_at ? formatDate(ticket.created_at) : '-',
          },
          ...customColumns,
        ]}
      />

      {/* Custom Create Ticket Dialog with Customer & Organization */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader>
              <DialogTitle>New Ticket</DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              <div className="grid gap-2">
                {(!canEditField || canEditField('subject')) && (
                  <div className="grid">
                    <Label>
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                    />
                  </div>
                )}

                {(!canEditField || canEditField('description')) && (
                  <div className="grid">
                    <Label>Description</Label>
                    <Textarea
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  {(!canEditField || canEditField('status')) && (
                    <div className="grid">
                      <Label>
                        Status <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={ticketStatusId || String(openStatus?.id ?? '')}
                        onValueChange={setTicketStatusId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                {opt.color ? (
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                                    style={{ backgroundColor: opt.color }}
                                  />
                                ) : null}
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(!canEditField || canEditField('priority')) && (
                    <div className="grid">
                      <Label>Priority</Label>
                      <Select
                        value={ticketPriorityId}
                        onValueChange={setTicketPriorityId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                {opt.color ? (
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                                    style={{ backgroundColor: opt.color }}
                                  />
                                ) : null}
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(!canEditField || canEditField('category')) && (
                    <div className="grid">
                      <Label>Category</Label>
                      <Select
                        value={ticketCategoryId}
                        onValueChange={setTicketCategoryId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Customer Section */}
                {(!canEditField || canEditField('customer')) && (
                  <div className="grid">
                    <Label>
                      Customer <span className="text-destructive">*</span>
                    </Label>
                    <RadioGroup
                      value={customerMode}
                      onValueChange={(value) =>
                        setCustomerMode(value as 'existing' | 'new')
                      }
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                        <div className="flex gap-2 items-center">
                        <RadioGroupItem value="existing" />
                        <span>Link existing</span>
                        </div>
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                        <div className="flex gap-2 items-center">
                        <RadioGroupItem value="new" />
                        <span>Create new</span>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>
                )}

                {(!canEditField || canEditField('customer')) &&
                customerMode === 'existing' ? (
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={String(customer.id)}
                        >
                          {customer.name}{' '}
                          {customer.email ? `(${customer.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (!canEditField || canEditField('customer')) &&
                  customerMode === 'new' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid">
                      <Label>
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="grid">
                      <Label>
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Organization Section */}
                {(!canEditField || canEditField('organization')) && (
                  <div className="grid">
                    <Label>Organization</Label>
                    <RadioGroup
                      value={organizationMode}
                      onValueChange={(value) =>
                        setOrganizationMode(
                          value as 'none' | 'existing' | 'new',
                        )
                      }
                      className="grid gap-2 sm:grid-cols-3"
                    >
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                        <div className="flex gap-2 items-center">
                        <RadioGroupItem value="none" />
                        <span>None</span>
                        </div>
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                        <div className="flex gap-2 items-center">
                        <RadioGroupItem value="existing" />
                        <span>Existing</span>
                        </div>
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                        <div className="flex gap-2 items-center">
                        <RadioGroupItem value="new" />
                        <span>Create new</span>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>
                )}

                {(!canEditField || canEditField('organization')) &&
                organizationMode === 'existing' ? (
                  <Select
                    value={selectedOrganizationId}
                    onValueChange={setSelectedOrganizationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (!canEditField || canEditField('organization')) &&
                  organizationMode === 'new' ? (
                  <div className="grid">
                    <Label>
                      Organization Name{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={newOrganizationName}
                      onChange={(e) => setNewOrganizationName(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitCreateTicket}
                disabled={createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Ticket
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
