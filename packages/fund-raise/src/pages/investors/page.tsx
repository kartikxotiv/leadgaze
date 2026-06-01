'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Eye, Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import { Textarea } from '@kit/ui/textarea';
import {
  createInvestorContactService,
  createInvestorService,
  deleteInvestorContactService,
  deleteInvestorService,
  getDealsService,
  getInvestorContactsService,
  getInvestorsService,
  updateInvestorService,
} from '../../services';
import {
  FUNDRAISING_FEATURE_KEYS,
  FUNDRAISING_MODULE_KEYS,
  dateTimeDisplay,
  dealDisplay,
  ownerDisplay,
  useFundraisingPermissions,
} from '../../utils';

type Investor = {
  id: string;
  workspace_id: string;
  name: string;
  investor_type: string | null;
  website: string | null;
  linkedin_url: string | null;
  description: string | null;
  ticket_size_min: number | null;
  ticket_size_max: number | null;
  currency: string;
  industry_focus: string[];
  geo_focus: string[];
  status: string;
  owner_id: string | null;
  owner_name?: string | null;
  created_at: string;
  created_at_display?: string | null;
};

type Contact = {
  id: string;
  investor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  linkedin_url: string | null;
  is_primary: boolean;
};

const investorTypes = ['VC', 'Angel', 'PE', 'Family Office', 'Corporate Investor'];

const emptyInvestor = {
  name: '',
  investor_type: 'VC',
  website: '',
  linkedin_url: '',
  description: '',
  industry_focus: '',
  geo_focus: '',
  ticket_size_min: '',
  ticket_size_max: '',
  status: 'active',
};

function InvestorFormDialog({
  workspaceId,
  investor,
  onDone,
}: {
  workspaceId: string;
  investor?: Investor | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    ...emptyInvestor,
    ...(investor
      ? {
          name: investor.name,
          investor_type: investor.investor_type ?? 'VC',
          website: investor.website ?? '',
          linkedin_url: investor.linkedin_url ?? '',
          description: investor.description ?? '',
          industry_focus: investor.industry_focus?.join(', ') ?? '',
          geo_focus: investor.geo_focus?.join(', ') ?? '',
          ticket_size_min: investor.ticket_size_min?.toString() ?? '',
          ticket_size_max: investor.ticket_size_max?.toString() ?? '',
          status: investor.status,
        }
      : {}),
  }));
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => (investor ? updateInvestorService(payload) : createInvestorService(payload)),
    onSuccess: () => {
      setOpen(false);
      onDone();
    },
  });

  const submit = () => {
    mutation.mutate({
      id: investor?.id,
      workspace_id: workspaceId,
      name: form.name,
      investor_type: form.investor_type,
      website: form.website || null,
      linkedin_url: form.linkedin_url || null,
      description: form.description || null,
      industry_focus: form.industry_focus ? form.industry_focus.split(',').map((value) => value.trim()).filter(Boolean) : [],
      geo_focus: form.geo_focus ? form.geo_focus.split(',').map((value) => value.trim()).filter(Boolean) : [],
      ticket_size_min: form.ticket_size_min ? Number(form.ticket_size_min) : null,
      ticket_size_max: form.ticket_size_max ? Number(form.ticket_size_max) : null,
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {investor ? <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button> : <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Investor</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{investor ? 'Edit Investor' : 'Add Investor'}</DialogTitle>
          <DialogDescription>Maintain investor organization details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></Field>
          <Field label="Investor Type">
            <Select value={form.investor_type} onValueChange={(value) => setForm((prev) => ({ ...prev, investor_type: value }))}>
              <SelectTrigger><SelectValue placeholder="Select investor type" /></SelectTrigger>
              <SelectContent>
                {investorTypes.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Website"><Input value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} /></Field>
          <Field label="LinkedIn URL"><Input value={form.linkedin_url} onChange={(event) => setForm((prev) => ({ ...prev, linkedin_url: event.target.value }))} /></Field>
          <Field label="Industry Focus"><Input value={form.industry_focus} onChange={(event) => setForm((prev) => ({ ...prev, industry_focus: event.target.value }))} /></Field>
          <Field label="Geo Focus"><Input value={form.geo_focus} onChange={(event) => setForm((prev) => ({ ...prev, geo_focus: event.target.value }))} /></Field>
          <Field label="Ticket Size Min"><Input type="number" value={form.ticket_size_min} onChange={(event) => setForm((prev) => ({ ...prev, ticket_size_min: event.target.value }))} /></Field>
          <Field label="Ticket Size Max"><Input type="number" value={form.ticket_size_max} onChange={(event) => setForm((prev) => ({ ...prev, ticket_size_max: event.target.value }))} /></Field>
          <Field label="Status"><Select value={form.status} onValueChange={(status) => setForm((prev) => ({ ...prev, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="blacklisted">Blacklisted</SelectItem></SelectContent></Select></Field>
          <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field></div>
        </div>
        <Button disabled={mutation.isPending || !form.name} onClick={submit}>{mutation.isPending ? 'Saving...' : 'Save Investor'}</Button>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function AccessDenied() {
  return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view investors.</div>;
}

function InvestorDetails({ workspaceId, investor, canAddContact, canDeleteContact }: { workspaceId: string; investor: Investor; canAddContact: boolean; canDeleteContact: boolean }) {
  const [contactForm, setContactForm] = useState({ name: '', designation: '', email: '', phone: '', linkedin_url: '', is_primary: false });
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ['fundraising', 'contacts', workspaceId, investor.id], queryFn: () => getInvestorContactsService(workspaceId), select: (rows) => rows.filter((row: Contact) => row.investor_id === investor.id), enabled: !!investor.id });
  const { data: deals = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const queryClient = useQueryClient();
  const createContact = useMutation({ mutationFn: createInvestorContactService, onSuccess: () => { setContactForm({ name: '', designation: '', email: '', phone: '', linkedin_url: '', is_primary: false }); queryClient.invalidateQueries({ queryKey: ['fundraising', 'contacts', workspaceId, investor.id] }); } });
  const deleteContact = useMutation({ mutationFn: (id: string) => deleteInvestorContactService(workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'contacts', workspaceId, investor.id] }) });
  const relatedDeals = deals.filter((deal) => deal.investor_id === investor.id);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader><DialogTitle>{investor.name}</DialogTitle><DialogDescription>Investor profile, contacts, related deals, and core-module anchors.</DialogDescription></DialogHeader>
      <div className="grid gap-6">
        <section className="grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Type" value={investor.investor_type ?? '-'} />
          <Info label="Status" value={investor.status} />
          <Info label="Ticket Size" value={`${investor.ticket_size_min ?? '-'} - ${investor.ticket_size_max ?? '-'}`} />
          <Info label="Industry Focus" value={investor.industry_focus?.join(', ') || '-'} />
          <Info label="Geo Focus" value={investor.geo_focus?.join(', ') || '-'} />
          <Info label="Owner" value={ownerDisplay(investor)} />
        </section>
        <section className="grid gap-3">
          <h3 className="font-semibold">Contacts</h3>
          {canAddContact && <div className="grid gap-2 sm:grid-cols-3"><Input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} /><Input placeholder="Designation" value={contactForm.designation} onChange={(e) => setContactForm((p) => ({ ...p, designation: e.target.value }))} /><Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} /><Input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} /><Input placeholder="LinkedIn" value={contactForm.linkedin_url} onChange={(e) => setContactForm((p) => ({ ...p, linkedin_url: e.target.value }))} /><Button disabled={!contactForm.name || createContact.isPending} onClick={() => createContact.mutate({ ...contactForm, workspace_id: workspaceId, investor_id: investor.id })}><UserPlus className="mr-2 h-4 w-4" /> Add Contact</Button></div>}
          <div className="rounded-md border">{contacts.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No contacts added.</div> : contacts.map((contact) => <div key={contact.id} className="flex items-center justify-between border-b p-3 text-sm last:border-b-0"><div><div className="font-medium">{contact.name}</div><div className="text-muted-foreground">{contact.designation ?? '-'} · {contact.email ?? '-'}</div></div>{canDeleteContact && <Button variant="ghost" size="sm" onClick={() => deleteContact.mutate(contact.id)}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div>
        </section>
        <section className="grid gap-3"><h3 className="font-semibold">Related Deals</h3><div className="rounded-md border">{relatedDeals.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No related deals.</div> : relatedDeals.map((deal) => <div key={deal.id} className="flex justify-between border-b p-3 text-sm last:border-b-0"><span>{dealDisplay(deal)}</span><span>{deal.status}</span></div>)}</div></section>
      </div>
    </DialogContent>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}

export function FundraisingInvestorsPage({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { canAccess, isLoading: isPermissionsLoading } = useFundraisingPermissions(workspaceId);
  const canView = canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.view);
  const canCreate = canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.create);
  const canEdit = canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.edit);
  const canDelete = canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.delete);
  const canAddContact = canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.addContact);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const { data: investors = [], isLoading } = useQuery<Investor[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteInvestorService(workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'investors', workspaceId] }) });
  const filtered = investors.filter((investor) => {
    const haystack = `${investor.name} ${investor.investor_type ?? ''} ${investor.industry_focus?.join(' ') ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (status === 'all' || investor.status === status) && (type === 'all' || investor.investor_type === type);
  });
  const types = Array.from(new Set(investors.map((investor) => investor.investor_type).filter(Boolean))) as string[];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'investors', workspaceId] });

  if (isPermissionsLoading) {
    return <div className="p-6"><Skeleton className="h-10 w-full" /></div>;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-bold">Investors</h1><p className="text-muted-foreground">Manage investor organizations and contacts.</p></div>{canCreate && <InvestorFormDialog workspaceId={workspaceId} onDone={refresh} />}</div>
      <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search investors..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="blacklisted">Blacklisted</SelectItem></SelectContent></Select><Select value={type} onValueChange={setType}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{types.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Investor Type</th><th className="p-3">Ticket Size</th><th className="p-3">Industry Focus</th><th className="p-3">Status</th><th className="p-3">Owner</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{isLoading ? [...Array(4)].map((_, i) => <tr key={i}><td className="p-3" colSpan={8}><Skeleton className="h-8 w-full" /></td></tr>) : filtered.map((investor) => <tr key={investor.id} className="border-b last:border-b-0"><td className="p-3 font-medium"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{investor.name}</div></td><td className="p-3">{investor.investor_type ?? '-'}</td><td className="p-3">{investor.ticket_size_min ?? '-'} - {investor.ticket_size_max ?? '-'}</td><td className="p-3">{investor.industry_focus?.join(', ') || '-'}</td><td className="p-3"><Badge variant="outline">{investor.status}</Badge></td><td className="p-3">{ownerDisplay(investor)}</td><td className="p-3">{dateTimeDisplay(investor.created_at_display, investor.created_at)}</td><td className="p-3 text-right"><div className="flex justify-end gap-1"><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></DialogTrigger><InvestorDetails workspaceId={workspaceId} investor={investor} canAddContact={canAddContact} canDeleteContact={canDelete} /></Dialog>{canEdit && <InvestorFormDialog workspaceId={workspaceId} investor={investor} onDone={refresh} />}{canDelete && <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(investor.id)}><Trash2 className="h-4 w-4" /></Button>}</div></td></tr>)}</tbody></table></div></CardContent></Card>
    </div>
  );
}
