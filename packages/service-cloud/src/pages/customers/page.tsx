'use client';

import { useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Ticket } from 'lucide-react';
import { toast } from 'sonner';

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
import Link from 'next/link';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

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
import { ServiceCloudResourcePage, StatusBadge } from '../_components/resource-page';

export function ServiceCloudCustomersPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
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

  // --- Create Ticket from Customer state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketStatusId, setTicketStatusId] = useState('');
  const [ticketPriorityId, setTicketPriorityId] = useState('');
  const [ticketCategoryId, setTicketCategoryId] = useState('');

  // --- Customer Tickets Modal state & query ---
  const [ticketsModalCustomer, setTicketsModalCustomer] = useState<ServiceCloudRecord | null>(null);

  const { data: customerTickets = [], isLoading: isLoadingTickets } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'customer-tickets', workspaceId, ticketsModalCustomer?.id],
    queryFn: () => getServiceCloudResourceService('tickets', workspaceId, { customerId: ticketsModalCustomer?.id as string }),
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
    enabled: (createOpen || Boolean(ticketsModalCustomer)) && Boolean(workspaceId),
  });

  const statuses: any[] = lookups?.statuses ?? [];
  const priorities: any[] = lookups?.priorities ?? [];
  const categories: any[] = lookups?.categories ?? [];

  const statusById = new Map<string, any>(
    statuses.map((status: any) => [status.id, status]),
  );
  const priorityById = new Map<string, any>(
    priorities.map((priority: any) => [priority.id, priority]),
  );

  const statusOptions = statuses.map((s: any) => ({
    label: s.name,
    value: s.id,
  }));
  const openStatus =
    statuses.find((s: any) => s.lifecycle === 'open') ?? statuses[0];
  const priorityOptions = priorities.map((p: any) => ({
    label: p.name,
    value: p.id,
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

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canView) return <ServiceCloudAccessDenied label="customers" />;

  const newTicketToolbar = canCreateTickets ? (
    <Button type="button" onClick={openDialog}>
      <Plus className="mr-2 h-4 w-4" />
      New Ticket
    </Button>
  ) : null;

  return (
    <>
      <Tabs defaultValue="customers" className="space-y-4">
      <TabsList className="mb-0">
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
      </TabsList>
      <TabsContent value="customers">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="customers"
          title="Customers"
          createLabel="New Customer"
          description="People who contact support."
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          toolbar={newTicketToolbar}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
            { key: 'job_title', label: 'Job Title' },
          ]}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (customer) => (
                <button
                  type="button"
                  onClick={() => setTicketsModalCustomer(customer)}
                  className="font-medium text-leadgaze-primary hover:underline text-left"
                >
                  {customer.name}
                </button>
              ),
            },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'job_title', label: 'Job Title' },
          ]}
        />
      </TabsContent>
      <TabsContent value="organizations">
        <ServiceCloudResourcePage
          workspaceId={workspaceId}
          resource="organizations"
          title="Organizations"
          createLabel="New Organization"
          description="Companies and customer accounts supported by the team."
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'website', label: 'Website' },
            { key: 'industry', label: 'Industry' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
          ]}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'website', label: 'Website' },
            { key: 'industry', label: 'Industry' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
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
            <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                New Ticket for Customer
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-8">
              <div className="grid gap-4">
                {/* Customer Selection */}
                <div className="grid gap-2">
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
                      Organization will be auto-linked from the customer record.
                    </p>
                  ) : null}
                </div>

                {/* Subject */}
                <div className="grid gap-2">
                  <Label>
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                {/* Status / Priority / Category */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
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
              </div>
            </div>

            <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className='mb-2'>
                Cancel
              </Button>
              <Button
                onClick={submitCreateTicket} className='mb-2'
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
          <div className="flex max-h-[90vh] flex-col w-full max-w-full min-w-0">
            <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Tickets for {ticketsModalCustomer?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overflow-x-auto p-6 w-full max-w-full min-w-0">
              {isLoadingTickets ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading tickets...
                </div>
              ) : customerTickets.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No tickets found for this customer.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">#{ticket.ticket_number}</TableCell>
                        <TableCell>
                          <Link
                            href={`/home/services/tickets/${ticket.id}`}
                            className="font-medium text-primary hover:underline text-leadgaze-primary block max-w-[200px] sm:max-w-[400px] lg:max-w-[550px] truncate"
                            title={ticket.subject}
                          >
                            {ticket.subject}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            value={statusById.get(ticket.status_id)?.name as string}
                            color={statusById.get(ticket.status_id)?.color as string}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            value={priorityById.get(ticket.priority_id)?.name as string}
                            color={priorityById.get(ticket.priority_id)?.color as string}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.created_at ? formatDate(ticket.created_at) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <Button variant="outline" onClick={() => setTicketsModalCustomer(null)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
