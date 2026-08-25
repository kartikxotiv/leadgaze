'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, PlusIcon, Ticket, TicketIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useLocalization } from '@kit/shared/localization';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';

import { formatDate } from '@kit/shared/utils';

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
import {
  ServiceCloudResourcePage,
  StatusBadge,
} from '../_components/resource-page';
import CustomTableContainer from '@kit/ui/custom-table-container';

export function ServiceCloudCustomersPage({
  workspaceId,
  isAdmin = false,
  onColumnAddClick,
  onColumnEditClick,
  customCustomerColumns = [],
  customOrganizationColumns = [],
  systemCustomerFields = [],
  systemOrganizationFields = [],
  canViewCustomerColumn,
  canViewOrganizationColumn,
  canViewCustomerField,
  canViewOrganizationField,
  canEditCustomerField,
  canEditOrganizationField,
  canViewTicketColumn,
  currentUserId,
  teamMembers = [],
}: {
  workspaceId: string;
  isAdmin?: boolean;
  onColumnAddClick?: (type: 'customers' | 'organizations') => void;
  onColumnEditClick?: (
    columnKey: string,
    type: 'customers' | 'organizations',
  ) => void;
  customCustomerColumns?: any[];
  customOrganizationColumns?: any[];
  systemCustomerFields?: any[];
  systemOrganizationFields?: any[];
  /** Optional FLS function for customer columns. Columns returning false are hidden. */
  canViewCustomerColumn?: (columnKey: string) => boolean;
  /** Optional FLS function for organization columns. Columns returning false are hidden. */
  canViewOrganizationColumn?: (columnKey: string) => boolean;
  /** Optional FLS function for customer details dialog. Fields returning false are hidden. */
  canViewCustomerField?: (fieldKey: string) => boolean;
  /** Optional FLS function for organization details dialog. Fields returning false are hidden. */
  canViewOrganizationField?: (fieldKey: string) => boolean;
  /** Optional FLS function for customer create/edit modal. Fields returning false are hidden. */
  canEditCustomerField?: (fieldKey: string) => boolean;
  /** Optional FLS function for organization create/edit modal. Fields returning false are hidden. */
  canEditOrganizationField?: (fieldKey: string) => boolean;
  /** Optional FLS function to hide columns in the customer tickets modal */
  canViewTicketColumn?: (columnKey: string) => boolean;
  currentUserId?: string;
  teamMembers?: any[];
}) {
  const { formatDate } = useLocalization();
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.customers,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );
  const canCreate = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.customers,
    SERVICE_CLOUD_FEATURE_KEYS.create,
  );
  const canEdit = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.customers,
    SERVICE_CLOUD_FEATURE_KEYS.edit,
  );
  const canDelete = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.customers,
    SERVICE_CLOUD_FEATURE_KEYS.delete,
  );
  const canCreateTickets = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.create,
  );

  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>([]);

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

  const activeFilterCount =
    (selectedCreatedByIds.length > 0 ? 1 : 0) +
    (createdOnRange ? 1 : 0) +
    (updatedOnRange ? 1 : 0);

  const filterGroups = [
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
    ...(selectedCreatedByIds.length > 0
      ? { createdByIds: selectedCreatedByIds.join(',') }
      : {}),
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

  // --- Create Ticket from Customer state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketStatusId, setTicketStatusId] = useState('');
  const [ticketPriorityId, setTicketPriorityId] = useState('');
  const [ticketCategoryId, setTicketCategoryId] = useState('');

  // --- Customer Tickets Modal state & query ---
  const [ticketsModalCustomer, setTicketsModalCustomer] =
    useState<ServiceCloudRecord | null>(null);

  const { getHeaderProps, getResizeHandleProps } = useColumnResize(
    'sc-customer-tickets-modal',
  );

  const { data: customerTickets = [], isLoading: isLoadingTickets } = useQuery<
    ServiceCloudRecord[]
  >({
    queryKey: [
      'service-cloud',
      'customer-tickets',
      workspaceId,
      ticketsModalCustomer?.id,
    ],
    queryFn: () =>
      getServiceCloudResourceService('tickets', workspaceId, {
        customerId: ticketsModalCustomer?.id as string,
      }),
    enabled: Boolean(ticketsModalCustomer?.id) && Boolean(workspaceId),
  });

  const { data: customers = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'customer-ticket-customers', workspaceId],
    queryFn: () => getServiceCloudResourceService('customers', workspaceId),
    enabled: createOpen && Boolean(workspaceId),
  });

  const { data: lookups } = useQuery({
    queryKey: ['service-cloud', 'ticket-lookups', workspaceId],
    queryFn: () => getServiceCloudTicketLookupsService(workspaceId),
    enabled:
      (createOpen || Boolean(ticketsModalCustomer)) && Boolean(workspaceId),
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

  const statusById = new Map<string, any>(
    allStatuses.map((status: any) => [status.id, status]),
  );
  const priorityById = new Map<string, any>(
    allPriorities.map((priority: any) => [priority.id, priority]),
  );

  const statusOptions = statuses.map((s: any) => ({
    label: s.name,
    value: s.id,
    color: s.color,
  }));
  const openStatus =
    statuses.find((s: any) => s.lifecycle === 'open') ?? statuses[0];
  const priorityOptions = priorities.map((p: any) => ({
    label: p.name,
    value: p.id,
    color: p.color,
  }));
  const categoryOptions = categories.map((c: any) => ({
    label: c.name,
    value: c.id,
  }));

  const selectedCustomer = customers.find(
    (c) => String(c.id) === selectedCustomerId,
  );

  const resetForm = () => {
    setSelectedCustomerId('');
    setTicketSubject('');
    setTicketDescription('');
    setTicketStatusId('');
    setTicketPriorityId('');
    setTicketCategoryId('');
  };

  const openDialog = () => {
    resetForm();
    setCreateOpen(true);
  };

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const customerId = selectedCustomerId || null;
      const organizationId = selectedCustomer?.organization_id || null;

      return createServiceCloudResourceService('tickets', {
        subject: ticketSubject,
        description: ticketDescription || null,
        status_id: ticketStatusId || openStatus?.id || null,
        priority_id: ticketPriorityId || null,
        category_id: ticketCategoryId || null,
        customer_id: customerId,
        organization_id: organizationId,
        source: 'manual',
        workspace_id: workspaceId,
      });
    },
    onSuccess: () => {
      toast.success('Ticket created');
      setCreateOpen(false);
      resetForm();
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
    if (!selectedCustomerId) {
      toast.error('Select a customer');
      return;
    }
    createTicketMutation.mutate();
  };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'customers';

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canView) return <ServiceCloudAccessDenied label="customers" />;

  const newTicketToolbar = canCreateTickets ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          onClick={openDialog}
          variant="outline"
          className="secondary-text-small-bold shrink-0 gap-1.5 px-2 text-leadgaze-dark dark:text-white"
        >
          <PlusIcon className="h-4 w-4" />
          New Tickets
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span>New Tickets</span>
      </TooltipContent>
    </Tooltip>
  ) : null;

  const getCustomerLabel = (key: string, fallback: string) =>
    systemCustomerFields.find((f: any) => f.field_key === key)?.field_label ??
    fallback;

  const getOrganizationLabel = (key: string, fallback: string) =>
    systemOrganizationFields.find((f: any) => f.field_key === key)
      ?.field_label ?? fallback;

  const tabsSlot = (
    <TabsList className="mb-1 h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
      <TabsTrigger 
        value="customers"
        className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
      >
        Customers
      </TabsTrigger>
      <TabsTrigger 
        value="organizations"
        className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
      >
        Organizations
      </TabsTrigger>
    </TabsList>
  );

  return (
    <>
      <Tabs
        defaultValue={tab}
        className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col space-y-2"
        onValueChange={(value) => router.push(`${pathname}?tab=${value}`)}
      >
        <TabsContent
          value="customers"
          className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 gap-2"
        >
          <ServiceCloudResourcePage
            workspaceId={workspaceId}
            resource="customers"
            title="Customers"
            pageHeaderTitle="Customers"
            createLabel="New Customers"
            description="People who contact support."
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            isAdmin={isAdmin}
            onColumnAddClick={
              onColumnAddClick ? () => onColumnAddClick('customers') : undefined
            }
            onColumnEditClick={
              onColumnEditClick
                ? (key) => onColumnEditClick(key, 'customers')
                : undefined
            }
            canViewColumn={canViewCustomerColumn}
            canViewField={canViewCustomerField}
            canEditField={canEditCustomerField}
            currentUserId={currentUserId}
            systemFields={systemCustomerFields}
            queryParams={queryParams}
            filterGroups={filterGroups}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => {
              setSelectedCreatedByIds([]);
              clearCreatedOnRange();
              clearUpdatedOnRange();
            }}
            toolbar={newTicketToolbar}
            tabsSlot={tabsSlot}
            fields={[
              {
                key: 'name',
                label: getCustomerLabel('name', 'Name'),
                required: true,
              },
              {
                key: 'email',
                label: getCustomerLabel('email', 'Email'),
                type: 'email',
              },
              { key: 'phone', label: getCustomerLabel('phone', 'Phone'), type: 'phone' },
              {
                key: 'job_title',
                label: getCustomerLabel('job_title', 'Job Title'),
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
                key: 'name',
                label: getCustomerLabel('name', 'Name'),
                render: (customer) => (
                  <button
                    type="button"
                    onClick={() => setTicketsModalCustomer(customer)}
                    className="text-leadgaze-primary text-left font-medium hover:underline"
                  >
                    {customer.name}
                  </button>
                ),
              },
              { key: 'email', label: getCustomerLabel('email', 'Email') },
              { key: 'phone', label: getCustomerLabel('phone', 'Phone') },
              {
                key: 'job_title',
                label: getCustomerLabel('job_title', 'Job Title'),
              },
              ...customCustomerColumns,
            ]}
          />
        </TabsContent>
        <TabsContent
          value="organizations"
          className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 gap-2"
        >
          <ServiceCloudResourcePage
            workspaceId={workspaceId}
            resource="organizations"
            title="Organizations"
            pageHeaderTitle="Customers"
            createLabel="New Organizations"
            description="Companies and customer accounts supported by the team."
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            isAdmin={isAdmin}
            onColumnAddClick={
              onColumnAddClick
                ? () => onColumnAddClick('organizations')
                : undefined
            }
            onColumnEditClick={
              onColumnEditClick
                ? (key) => onColumnEditClick(key, 'organizations')
                : undefined
            }
            canViewColumn={canViewOrganizationColumn}
            canViewField={canViewOrganizationField}
            canEditField={canEditOrganizationField}
            currentUserId={currentUserId}
            systemFields={systemOrganizationFields}
            queryParams={queryParams}
            filterGroups={filterGroups}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => {
              setSelectedCreatedByIds([]);
              clearCreatedOnRange();
              clearUpdatedOnRange();
            }}
            tabsSlot={tabsSlot}
            fields={[
              {
                key: 'name',
                label: getOrganizationLabel('name', 'Name'),
                required: true,
              },
              {
                key: 'website',
                label: getOrganizationLabel('website', 'Website'),
              },
              {
                key: 'industry',
                label: getOrganizationLabel('industry', 'Industry'),
              },
              {
                key: 'email',
                label: getOrganizationLabel('email', 'Email'),
                type: 'email',
              },
              { key: 'phone', label: getOrganizationLabel('phone', 'Phone'), type: 'phone' },
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
              { key: 'name', label: getOrganizationLabel('name', 'Name') },
              {
                key: 'website',
                label: getOrganizationLabel('website', 'Website'),
              },
              {
                key: 'industry',
                label: getOrganizationLabel('industry', 'Industry'),
              },
              { key: 'email', label: getOrganizationLabel('email', 'Email') },
              { key: 'phone', label: getOrganizationLabel('phone', 'Phone') },
              ...customOrganizationColumns,
            ]}
          />
        </TabsContent>

        {/* Create Ticket from Customer Dialog */}
        <Dialog
          open={createOpen}
          onOpenChange={(v) => {
            setCreateOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {/* <Ticket className="h-5 w-5" /> */}
                  New Ticket for Customer
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 space-y-2 overflow-y-auto custom-spacing-x-y">
                <div className="grid gap-2 sm:grid-cols-2">
                  {/* Customer Selection */}
                  <div className="grid">
                    <Label>
                      Customer <span className="text-destructive">*</span>
                    </Label>
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
                    {selectedCustomer?.organization_id ? (
                      <p className="text-muted-foreground text-xs">
                        Organization will be auto-linked from the customer
                        record.
                      </p>
                    ) : null}
                  </div>

                  {/* Subject */}
                  <div className="grid">
                    <Label>
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                    />
                  </div>
                  </div>
                  <div className="grid gap-2">

                  {/* Description */}
                  <div className="grid">
                    <Label>Description</Label>
                    <Textarea
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      className="min-h-24"
                    />
                  </div>

                  {/* Status / Priority / Category */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="grid">
                      <Label>Status</Label>
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
                  </div>
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
      </Tabs>

      {/* Customer Tickets Dialog */}
      <Dialog
        open={Boolean(ticketsModalCustomer)}
        onOpenChange={(v) => {
          if (!v) setTicketsModalCustomer(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-4xl lg:max-w-5xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex max-h-[90vh] w-full min-w-0 max-w-full flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {/* <Ticket className="h-5 w-5" /> */}
                Tickets for {ticketsModalCustomer?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="w-full min-w-0 max-w-full flex-1 overflow-x-auto overflow-y-auto p-2">
              {isLoadingTickets ? (
                <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading tickets...
                </div>
              ) : customerTickets.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No tickets found for this customer.
                </div>
              ) : (
                <CustomTableContainer>
                <div className="mb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(!canViewTicketColumn || canViewTicketColumn('ticket_number')) && (
                        <TableHead
                          className="relative"
                          {...getHeaderProps('ticket_number')}
                        >
                          Ticket #
                          <span
                            className="col-resize-handle"
                            {...getResizeHandleProps('ticket_number')}
                          />
                        </TableHead>
                      )}
                      {(!canViewTicketColumn || canViewTicketColumn('subject')) && (
                        <TableHead
                          className="relative"
                          {...getHeaderProps('subject')}
                        >
                          Subject
                          <span
                            className="col-resize-handle"
                            {...getResizeHandleProps('subject')}
                          />
                        </TableHead>
                      )}
                      {(!canViewTicketColumn || canViewTicketColumn('status_id')) && (
                        <TableHead
                          className="relative"
                          {...getHeaderProps('status')}
                        >
                          Status
                          <span
                            className="col-resize-handle"
                            {...getResizeHandleProps('status')}
                          />
                        </TableHead>
                      )}
                      {(!canViewTicketColumn || canViewTicketColumn('priority_id')) && (
                        <TableHead
                          className="relative"
                          {...getHeaderProps('priority')}
                        >
                          Priority
                          <span
                            className="col-resize-handle"
                            {...getResizeHandleProps('priority')}
                          />
                        </TableHead>
                      )}
                      {(!canViewTicketColumn || canViewTicketColumn('created_at')) && (
                        <TableHead
                          className="relative"
                          {...getHeaderProps('created')}
                        >
                          Created
                          <span
                            className="col-resize-handle"
                            {...getResizeHandleProps('created')}
                          />
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        {(!canViewTicketColumn || canViewTicketColumn('ticket_number')) && (
                          <TableCell className="font-mono text-sm">
                            #{ticket.ticket_number}
                          </TableCell>
                        )}
                        {(!canViewTicketColumn || canViewTicketColumn('subject')) && (
                          <TableCell>
                            <Link
                              href={`/home/services/tickets/${ticket.id}`}
                              className="text-primary text-leadgaze-primary block max-w-[200px] truncate font-medium hover:underline sm:max-w-[400px] lg:max-w-[550px]"
                              title={ticket.subject}
                            >
                              {ticket.subject}
                            </Link>
                          </TableCell>
                        )}
                        {(!canViewTicketColumn || canViewTicketColumn('status_id')) && (
                          <TableCell>
                            <StatusBadge
                              value={
                                statusById.get(ticket.status_id)?.name as string
                              }
                              color={
                                statusById.get(ticket.status_id)?.color as string
                              }
                            />
                          </TableCell>
                        )}
                        {(!canViewTicketColumn || canViewTicketColumn('priority_id')) && (
                          <TableCell>
                            <StatusBadge
                              value={
                                priorityById.get(ticket.priority_id)
                                  ?.name as string
                              }
                              color={
                                priorityById.get(ticket.priority_id)
                                  ?.color as string
                              }
                            />
                          </TableCell>
                        )}
                        {(!canViewTicketColumn || canViewTicketColumn('created_at')) && (
                          <TableCell className="text-muted-foreground text-sm">
                            {ticket.created_at
                              ? formatDate(ticket.created_at)
                              : '-'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                </CustomTableContainer>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTicketsModalCustomer(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
