'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Filter, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { formatDate } from '@kit/shared/utils';
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
}: {
  workspaceId: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
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

  // Optimized: single API call fetches statuses + priorities + categories in parallel on server
  const { data: lookups } = useQuery({
    queryKey: ['service-cloud', 'ticket-lookups', workspaceId],
    queryFn: () => getServiceCloudTicketLookupsService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const statuses: any[] = lookups?.statuses ?? [];
  const priorities: any[] = lookups?.priorities ?? [];
  const categories: any[] = lookups?.categories ?? [];

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
  const statusById = new Map<string, any>(
    statuses.map((status: any) => [status.id, status]),
  );
  const priorityById = new Map<string, any>(
    priorities.map((priority: any) => [priority.id, priority]),
  );

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

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canView) return <ServiceCloudAccessDenied label="tickets" />;

  return (
    <>
      <ServiceCloudResourcePage
        workspaceId={workspaceId}
        resource="tickets"
        title="Tickets"
        description="Create, assign, and track support requests."
        canCreate={false}
        canEdit={canEdit}
        canDelete={canDelete}
        queryParams={assignedToMeOnly ? { assignedToMe: 'true' } : {}}
        toolbar={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={assignedToMeOnly ? 'default' : 'outline'}
              onClick={() => setAssignedToMeOnly((current) => !current)}
            >
              {assignedToMeOnly ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Assigned to me
            </Button>
            {canCreate ? (
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            ) : null}
          </div>
        }
        fields={[
          { key: 'subject', label: 'Subject', required: true },
          { key: 'description', label: 'Description' },
          {
            key: 'status_id',
            label: 'Status',
            type: 'select',
            required: true,
            options: statusOptions,
          },
          {
            key: 'priority_id',
            label: 'Priority',
            type: 'select',
            options: priorityOptions,
          },
          {
            key: 'category_id',
            label: 'Category',
            type: 'select',
            options: categoryOptions,
          },
        ]}
        columns={[
          { key: 'ticket_number', label: 'Ticket #' },
          {
            key: 'subject',
            label: 'Subject',
            render: (ticket) => (
              <Link
                href={`/home/services/tickets/${ticket.id}`}
                className="text-primary font-medium hover:underline"
              >
                {ticket.subject}
              </Link>
            ),
          },
          {
            key: 'assignees',
            label: 'Assignees',
            render: (ticket) => <AssigneeStack assignees={ticket.assignees} />,
          },
          {
            key: 'status_id',
            label: 'Status',
            render: (ticket) => (
              <StatusBadge
                value={statusById.get(ticket.status_id)?.name as string}
              />
            ),
          },
          {
            key: 'priority_id',
            label: 'Priority',
            render: (ticket) => (
              <StatusBadge
                value={priorityById.get(ticket.priority_id)?.name as string}
              />
            ),
          },
          {
            key: 'created_at',
            label: 'Created',
            render: (ticket) =>
              ticket.created_at ? formatDate(ticket.created_at) : '-',
          },
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
            <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
              <DialogTitle>New Ticket</DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-8">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
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
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
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
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
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

                {/* Customer Section */}
                <div className="grid gap-2">
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
                    <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                      <RadioGroupItem value="existing" />
                      <span>Link existing</span>
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                      <RadioGroupItem value="new" />
                      <span>Create new</span>
                    </Label>
                  </RadioGroup>
                </div>

                {customerMode === 'existing' ? (
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
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Organization Section */}
                <div className="grid gap-2">
                  <Label>Organization</Label>
                  <RadioGroup
                    value={organizationMode}
                    onValueChange={(value) =>
                      setOrganizationMode(value as 'none' | 'existing' | 'new')
                    }
                    className="grid gap-2 sm:grid-cols-3"
                  >
                    <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                      <RadioGroupItem value="none" />
                      <span>None</span>
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                      <RadioGroupItem value="existing" />
                      <span>Existing</span>
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                      <RadioGroupItem value="new" />
                      <span>Create new</span>
                    </Label>
                  </RadioGroup>
                </div>

                {organizationMode === 'existing' ? (
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
                ) : organizationMode === 'new' ? (
                  <div className="grid gap-2">
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

            <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <Button className='mb-2' variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitCreateTicket}
                disabled={createTicketMutation.isPending}
                className='mb-2'
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
    </>
  );
}
