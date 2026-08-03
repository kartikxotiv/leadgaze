'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Textarea } from '@kit/ui/textarea';
import { createRoundService, deleteRoundService, getDealsService, getInvestorsService, getPipelineStagesService, getRoundsService, updateRoundService } from '../../services';
import {
  FUNDRAISING_FEATURE_KEYS,
  FUNDRAISING_MODULE_KEYS,
  dateDisplay,
  useFundraisingPermissions,
} from '../../utils';

type Round = {
  id: string;
  workspace_id: string;
  round_name: string;
  round_type: string;
  target_amount: number;
  raised_amount: number;
  valuation: number | null;
  currency: string;
  status: string;
  start_date: string | null;
  start_date_display?: string | null;
  close_date: string | null;
  close_date_display?: string | null;
  description: string | null;
};

const roundTypes = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'bridge', label: 'Bridge' },
];

const emptyRound = { round_name: '', round_type: 'seed', target_amount: '', raised_amount: '0', valuation: '', currency: 'USD', status: 'planning', start_date: '', close_date: '', description: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function RoundFormDialog({ workspaceId, round, onDone }: { workspaceId: string; round?: Round | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    ...emptyRound,
    ...(round ? {
      round_name: round.round_name,
      round_type: round.round_type,
      target_amount: String(round.target_amount ?? ''),
      raised_amount: String(round.raised_amount ?? 0),
      valuation: round.valuation == null ? '' : String(round.valuation),
      currency: round.currency,
      status: round.status,
      start_date: round.start_date ?? '',
      close_date: round.close_date ?? '',
      description: round.description ?? '',
    } : {}),
  }));
  const mutation = useMutation({ mutationFn: (payload: Record<string, unknown>) => round ? updateRoundService(payload) : createRoundService(payload), onSuccess: () => { setOpen(false); onDone(); } });
  const submit = () => mutation.mutate({ id: round?.id, workspace_id: workspaceId, ...form, target_amount: Number(form.target_amount), raised_amount: Number(form.raised_amount || 0), valuation: form.valuation ? Number(form.valuation) : null, start_date: form.start_date || null, close_date: form.close_date || null, description: form.description || null });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{round ? <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button> : <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Create Round</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{round ? 'Edit Round' : 'Create Round'}</DialogTitle><DialogDescription>Manage funding round details.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Round Name"><Input value={form.round_name} onChange={(e) => setForm((p) => ({ ...p, round_name: e.target.value }))} /></Field>
          <Field label="Round Type">
            <Select value={form.round_type} onValueChange={(value) => setForm((p) => ({ ...p, round_type: value }))}>
              <SelectTrigger><SelectValue placeholder="Select round type" /></SelectTrigger>
              <SelectContent>
                {roundTypes.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Target Amount"><Input type="number" value={form.target_amount} onChange={(e) => setForm((p) => ({ ...p, target_amount: e.target.value }))} /></Field>
          <Field label="Raised Amount"><Input type="number" value={form.raised_amount} onChange={(e) => setForm((p) => ({ ...p, raised_amount: e.target.value }))} /></Field>
          <Field label="Valuation"><Input type="number" value={form.valuation} onChange={(e) => setForm((p) => ({ ...p, valuation: e.target.value }))} /></Field>
          <Field label="Currency"><Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} /></Field>
          <Field label="Status"><Select value={form.status} onValueChange={(status) => setForm((p) => ({ ...p, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planning">Planning</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></Field>
          <Field label="Start Date"><Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></Field>
          <Field label="Close Date"><Input type="date" value={form.close_date} onChange={(e) => setForm((p) => ({ ...p, close_date: e.target.value }))} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field></div>
        </div>
        <Button disabled={mutation.isPending || !form.round_name || !form.target_amount} onClick={submit}>{mutation.isPending ? 'Saving...' : 'Save Round'}</Button>
      </DialogContent>
    </Dialog>
  );
}

function RoundDetails({ workspaceId, round }: { workspaceId: string; round: Round }) {
  const { data: deals = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const { data: investors = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const { data: stages = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: !!workspaceId });
  const roundDeals = deals.filter((deal) => deal.round_id === round.id);
  const participatingInvestors = investors.filter((investor) => roundDeals.some((deal) => deal.investor_id === investor.id));
  const formatCurrency = (value: number | null) => value == null ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency: round.currency || 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader><DialogTitle>{round.round_name}</DialogTitle><DialogDescription>Round information, associated investors, and pipeline summary.</DialogDescription></DialogHeader>
      <div className="grid gap-6">
        <section className="grid gap-3 text-sm sm:grid-cols-4"><Info label="Type" value={round.round_type} /><Info label="Target" value={formatCurrency(round.target_amount)} /><Info label="Raised" value={formatCurrency(round.raised_amount)} /><Info label="Valuation" value={formatCurrency(round.valuation)} /><Info label="Status" value={round.status} /><Info label="Start" value={dateDisplay(round.start_date_display, round.start_date)} /><Info label="Close" value={dateDisplay(round.close_date_display, round.close_date)} /><Info label="Currency" value={round.currency} /></section>
        <section className="grid gap-3"><h3 className="font-semibold custom-sub-heading-dialog-form">Associated Investors</h3><div className="rounded-md border">{participatingInvestors.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No investors linked yet.</div> : participatingInvestors.map((investor) => <div key={investor.id} className="flex justify-between border-b p-3 text-sm last:border-b-0"><span>{investor.name}</span><span>{investor.investor_type ?? '-'}</span></div>)}</div></section>
        <section className="grid gap-3"><h3 className="font-semibold custom-sub-heading-dialog-form">Pipeline Summary</h3><div className="grid gap-3 sm:grid-cols-3">{stages.map((stage) => <Card key={stage.id}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{stage.name}</div><div className="text-2xl font-bold">{roundDeals.filter((deal) => deal.stage_id === stage.id).length}</div></CardContent></Card>)}</div></section>
      </div>
    </DialogContent>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}

function AccessDenied() {
  return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view funding rounds.</div>;
}

function FundraisingRoundsPageSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex justify-end">
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Valuation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Close</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-[32px] px-4 py-2" colSpan={9}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FundraisingRoundsPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canAccess, isLoading: isPermissionsLoading } = useFundraisingPermissions(workspaceId);
  const canView = canAccess(FUNDRAISING_MODULE_KEYS.rounds, FUNDRAISING_FEATURE_KEYS.view);
  const canCreate = canAccess(FUNDRAISING_MODULE_KEYS.rounds, FUNDRAISING_FEATURE_KEYS.create);
  const canEdit = canAccess(FUNDRAISING_MODULE_KEYS.rounds, FUNDRAISING_FEATURE_KEYS.edit);
  const canDelete = canAccess(FUNDRAISING_MODULE_KEYS.rounds, FUNDRAISING_FEATURE_KEYS.delete);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { data: rounds = [], isLoading } = useQuery<Round[]>({ queryKey: ['fundraising', 'rounds', workspaceId], queryFn: () => getRoundsService(workspaceId), enabled: !!workspaceId });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteRoundService(workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'rounds', workspaceId] }) });
  const filtered = rounds.filter((round) => `${round.round_name} ${round.round_type}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || round.status === status));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'rounds', workspaceId] });
  const openRound = (roundId: string) => router.push(`/home/funds/rounds/${roundId}`);
  const formatCurrency = (value: number | null, currency = 'USD') => value == null ? '-' : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

  if (isPermissionsLoading) {
    return <FundraisingRoundsPageSkeleton />;
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      {canCreate && <div className="flex justify-end"><RoundFormDialog workspaceId={workspaceId} onDone={refresh} /></div>}
      <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search rounds..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="planning">Planning</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Round Name</TableHead><TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead>Raised</TableHead><TableHead>Valuation</TableHead><TableHead>Status</TableHead><TableHead>Start</TableHead><TableHead>Close</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{isLoading ? [...Array(6)].map((_, i) => (<TableRow key={i}><TableCell className="h-[32px] px-4 py-2" colSpan={9}><Skeleton className="h-7 w-full" /></TableCell></TableRow>)) : filtered.map((round) => <TableRow key={round.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => openRound(round.id)}><TableCell className="font-medium"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" />{round.round_name}</div></TableCell><TableCell>{round.round_type}</TableCell><TableCell>{formatCurrency(round.target_amount, round.currency)}</TableCell><TableCell>{formatCurrency(round.raised_amount, round.currency)}</TableCell><TableCell>{formatCurrency(round.valuation, round.currency)}</TableCell><TableCell><Badge variant="outline">{round.status}</Badge></TableCell><TableCell>{dateDisplay(round.start_date_display, round.start_date)}</TableCell><TableCell>{dateDisplay(round.close_date_display, round.close_date)}</TableCell><TableCell className="text-right" onClick={(event: React.MouseEvent) => event.stopPropagation()}><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openRound(round.id)}><Eye className="h-4 w-4" /></Button>{canEdit && <RoundFormDialog workspaceId={workspaceId} round={round} onDone={refresh} />}{canDelete && <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(round.id)}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}
