'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Ticket } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  convertCoreEmailToServiceCloudTicketService,
  detectEmailTicketService,
  getServiceCloudResourceService,
} from '../../services';

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function emailBodyPreview(email: any) {
  return (
    email.text_body ||
    email.snippet ||
    String(email.body || '').replace(/<[^>]+>/g, '')
  );
}

export function ServiceCloudEmailToTicketAction({
  workspaceId,
  email,
}: {
  workspaceId: string;
  email: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(
    'existing',
  );
  const [organizationMode, setOrganizationMode] = useState<
    'none' | 'existing' | 'new'
  >('none');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [subject, setSubject] = useState(email?.subject || '(No Subject)');
  const [description, setDescription] = useState(emailBodyPreview(email));
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  // Detect whether this email (or its thread) is already linked to a ticket.
  // Checked when the email changes. If a ticket is found, we show a "View Ticket"
  // button instead of the "Convert to Ticket" dialog.
  const { data: ticketDetection } = useQuery({
    queryKey: ['service-cloud', 'detect-email-ticket', workspaceId, email?.id],
    queryFn: () => detectEmailTicketService(workspaceId, email?.id),
    enabled: Boolean(workspaceId && email?.id),
    staleTime: 30_000,
  });

  const linkedTicket = ticketDetection?.ticket ?? null;

  const inferredCustomerEmail = normalizeEmail(
    email?.direction === 'inbound'
      ? email?.from_email
      : (email?.to_email ?? email?.to_emails?.[0]),
  );

  const { data: customers = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'email-ticket-customers', workspaceId],
    queryFn: () => getServiceCloudResourceService('customers', workspaceId),
    enabled: open && Boolean(workspaceId),
  });

  const { data: organizations = [] } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', 'email-ticket-organizations', workspaceId],
    queryFn: () => getServiceCloudResourceService('organizations', workspaceId),
    enabled: open && Boolean(workspaceId),
  });

  const suggestedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => normalizeEmail(customer.email) === inferredCustomerEmail,
      ),
    [customers, inferredCustomerEmail],
  );

  useEffect(() => {
    if (!open) return;

    setSubject(email?.subject || '(No Subject)');
    setDescription(emailBodyPreview(email));
    setCustomerEmail(inferredCustomerEmail);
    setCustomerName(
      email?.from_name || inferredCustomerEmail.split('@')[0] || '',
    );
  }, [email, inferredCustomerEmail, open]);

  useEffect(() => {
    if (!open) return;

    if (suggestedCustomer?.id) {
      setCustomerMode('existing');
      setSelectedCustomerId(String(suggestedCustomer.id));
      setSelectedOrganizationId(
        String(suggestedCustomer.organization_id ?? ''),
      );
      setOrganizationMode(
        suggestedCustomer.organization_id ? 'existing' : 'none',
      );
    } else {
      setCustomerMode('new');
      setSelectedCustomerId('');
    }
  }, [open, suggestedCustomer]);

  const mutation = useMutation({
    mutationFn: convertCoreEmailToServiceCloudTicketService,
    onSuccess: (result: any) => {
      toast.success(
        result?.alreadyLinked
          ? 'Email is already linked to a ticket'
          : `Created ticket #${result?.ticket?.ticket_number ?? ''}`,
      );
      setOpen(false);
      if (result?.ticket?.id) {
        router.push(`/home/services/tickets/${result.ticket.id}`);
      }
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to convert email to ticket'),
  });

  const submit = () => {
    if (customerMode === 'existing' && !selectedCustomerId) {
      toast.error('Select a customer or create a new one');
      return;
    }

    if (customerMode === 'new' && (!customerName || !customerEmail)) {
      toast.error('Customer name and email are required');
      return;
    }

    if (organizationMode === 'new' && !organizationName) {
      toast.error('Organization name is required');
      return;
    }

    if (organizationMode === 'existing' && !selectedOrganizationId) {
      toast.error('Select an organization or choose none');
      return;
    }

    mutation.mutate({
      workspaceId,
      emailId: email.id,
      subject,
      description,
      customerMode,
      customerId: customerMode === 'existing' ? selectedCustomerId : undefined,
      customer:
        customerMode === 'new'
          ? { name: customerName, email: customerEmail }
          : undefined,
      organizationMode,
      organizationId:
        organizationMode === 'existing' ? selectedOrganizationId : undefined,
      organization:
        organizationMode === 'new' ? { name: organizationName } : undefined,
    });
  };

  // If this email (or its thread) is already linked to a ticket,
  // show a "View Ticket" button instead of "Convert to Ticket".
  if (linkedTicket) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => router.push(`/home/services/tickets/${linkedTicket.id}`)}
      >
        <ExternalLink className="h-4 w-4" />#{linkedTicket.ticket_number}{' '}
        {linkedTicket.subject
          ? `• ${linkedTicket.subject.length > 30 ? linkedTicket.subject.slice(0, 30) + '…' : linkedTicket.subject}`
          : ''}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Ticket className="h-4 w-4" />
          Convert to Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>Convert Email to Ticket</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-8">
            <div className="grid gap-4">
              {suggestedCustomer ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Suggested customer found:{' '}
                  <strong>{suggestedCustomer.name}</strong> (
                  {suggestedCustomer.email})
                </div>
              ) : inferredCustomerEmail ? (
                <div className="text-muted-foreground rounded-md border p-3 text-sm">
                  No customer found for <strong>{inferredCustomerEmail}</strong>
                  . Create one below or select another customer.
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-28"
                />
              </div>

              <div className="grid gap-2">
                <Label>Customer</Label>
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
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name}{' '}
                        {customer.email ? `(${customer.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                    />
                  </div>
                </div>
              )}

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
                    {organizations.map((organization) => (
                      <SelectItem
                        key={organization.id}
                        value={String(organization.id)}
                      >
                        {organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : organizationMode === 'new' ? (
                <div className="grid gap-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(event.target.value)
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              Convert
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
