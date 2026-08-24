'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { DialogFooter } from '@kit/ui/dialog';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { 
  type ServiceCloudRecord,
  getServiceCloudTicketLookupsService, 
  getServiceCloudResourceService, 
  createServiceCloudResourceService 
} from '@kit/service-cloud';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  asFormOnly: boolean
}

export function GlobalCreateTicketForm({ onSuccess, onCancel, asFormOnly = false }: Props) {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id as string;
  const queryClient = useQueryClient();

  // State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketStatusId, setTicketStatusId] = useState<string>('');
  const [ticketPriorityId, setTicketPriorityId] = useState<string>('');
  const [ticketCategoryId, setTicketCategoryId] = useState<string>('');
  
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const [organizationMode, setOrganizationMode] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [newOrganizationName, setNewOrganizationName] = useState('');

  // 1. Fetch Lookups (Statuses, Priorities, Categories)
  const { data: lookups } = useQuery({
    queryKey: ['service-cloud', 'ticket-lookups', workspaceId],
    queryFn: () => getServiceCloudTicketLookupsService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const allStatuses: any[] = lookups?.statuses ?? [];
  const statuses = allStatuses.filter((s: any) => {
    if (s.access_type === 'public') return true;
    if (s.access_type === 'private') return false;
    return true;
  });
  const openStatus = statuses.find((status: any) => status.lifecycle === 'open') ?? statuses[0];

  const allPriorities: any[] = lookups?.priorities ?? [];
  const priorities = allPriorities.filter((p: any) => {
    if (p.access_type === 'public') return true;
    if (p.access_type === 'private') return false;
    return true;
  });
  
  const allCategories: any[] = lookups?.categories ?? [];
  const categories = allCategories;

  const { canEdit: canEditField } = useFieldPermissions({
    entityType: 'tickets',
    workspaceId,
    enabled: !!workspaceId,
    productKey: 'service_cloud',
  });

  const statusOptions = statuses.map((status: any) => ({
    label: status.name,
    value: status.id,
    color: status.color,
  }));
  const priorityOptions = priorities.map((priority: any) => ({
    label: priority.name,
    value: priority.id,
    color: priority.color,
  }));
  const categoryOptions = categories.map((category: any) => ({
    label: category.name,
    value: category.id,
  }));

  // 2. Fetch Customers for 'existing' dropdown
  const { data: customers = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'ticket-create-customers', workspaceId],
    queryFn: () => getServiceCloudResourceService('customers', workspaceId),
    enabled: Boolean(workspaceId),
  });

  // 3. Fetch Organizations for 'existing' dropdown
  const { data: organizations = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'ticket-create-organizations', workspaceId],
    queryFn: () => getServiceCloudResourceService('organizations', workspaceId),
    enabled: Boolean(workspaceId),
  });

  // 4. Create Ticket Mutation — matches tickets page.tsx logic exactly
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!ticketSubject.trim()) {
        throw new Error('Subject is required');
      }
      if (customerMode === 'existing' && !selectedCustomerId) {
        throw new Error('Select a customer or create a new one');
      }
      if (customerMode === 'new' && (!newCustomerName || !newCustomerEmail)) {
        throw new Error('Customer name and email are required');
      }
      if (organizationMode === 'new' && !newOrganizationName) {
        throw new Error('Organization name is required');
      }
      if (organizationMode === 'existing' && !selectedOrganizationId) {
        throw new Error('Select an organization or choose none');
      }

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
      toast.success('Ticket created successfully');
      queryClient.invalidateQueries({
        queryKey: ['service-cloud', 'tickets', workspaceId],
      });
      // Invalidate board/kanban specific queries
      queryClient.invalidateQueries({
        queryKey: ['service-cloud', 'tickets-board'],
      });
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: ['service-cloud', 'dashboard', workspaceId],
      });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create ticket');
    },
  });

  // Reset form when opened
  React.useEffect(() => {
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
  }, [openStatus?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      <form id="create-ticket-form" onSubmit={handleSubmit} className="flex-1 space-y-2 overflow-y-auto px-2">
        <div className="grid gap-2 pt-2">
          
          {(!canEditField || canEditField('subject')) && (
            <div className="grid">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Input value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} />
            </div>
          )}

          {(!canEditField || canEditField('description')) && (
            <div className="grid">
              <Label>Description</Label>
              <Textarea value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} className="min-h-24" />
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {(!canEditField || canEditField('status')) && (
              <div className="grid">
                <Label>Status <span className="text-destructive">*</span></Label>
                <Select value={ticketStatusId || String(openStatus?.id ?? '')} onValueChange={setTicketStatusId}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
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
                <Select value={ticketPriorityId} onValueChange={setTicketPriorityId}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
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
                <Select value={ticketCategoryId} onValueChange={setTicketCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Customer Section */}
          {(!canEditField || canEditField('customer')) && (
            <div className="grid">
              <Label>Customer <span className="text-destructive">*</span></Label>
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
                  type="email"
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
            <div className="pb-1"><Select
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
            </div>
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
      </form>
      
      <DialogFooter className="p-2 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 mt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>Cancel</Button>
        <Button type="submit" form="create-ticket-form" disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (!asFormOnly && <Plus className="h-4 w-4" />)}
          Add Ticket
        </Button>
      </DialogFooter>
    </div>
  );
}
