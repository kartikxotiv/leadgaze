'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import {
  createCommitmentService,
  createDealService,
  deleteCommitmentService,
  deleteDealService,
  getCommitmentsService,
  getDealsService,
  getInvestorsService,
  getPipelineStagesService,
  getRoundsService,
  updateDealService,
} from '../../services';

type Deal = { id: string; investor_id: string; round_id: string | null; stage_id: string; status: string; probability: number; expected_amount: number | null; currency: string; last_contact_date: string | null; next_followup_date: string | null; notes: string | null; owner_id: string | null };
type Lookup = { id: string; name?: string; round_name?: string; display_order?: number };
type Commitment = { id: string; deal_id: string; promised_amount: number; received_amount: number; currency: string; status: string; commitment_date: string | null; expected_close_date: string | null; received_date: string | null; notes: string | null };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function DealFormDialog({ workspaceId, deal, onDone }: { workspaceId: string; deal?: Deal | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ investor_id: deal?.investor_id ?? '', round_id: deal?.round_id ?? '__none__', stage_id: deal?.stage_id ?? '', probability: String(deal?.probability ?? 0), expected_amount: deal?.expected_amount == null ? '' : String(deal.expected_amount), next_followup_date: deal?.next_followup_date?.slice(0, 10) ?? '', last_contact_date: deal?.last_contact_date?.slice(0, 10) ?? '', notes: deal?.notes ?? '' });
  const { data: investors = [] } = useQuery<Lookup[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: open && !!workspaceId });
  const { data: rounds = [] } = useQuery<Lookup[]>({ queryKey: ['fundraising', 'rounds', workspaceId], queryFn: () => getRoundsService(workspaceId), enabled: open && !!workspaceId });
  const { data: stages = [] } = useQuery<Lookup[]>({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: open && !!workspaceId });
  const mutation = useMutation({ mutationFn: (payload: Record<string, unknown>) => deal ? updateDealService(payload) : createDealService(payload), onSuccess: () => { setOpen(false); onDone(); } });
  const submit = () => mutation.mutate({ id: deal?.id, workspace_id: workspaceId, investor_id: form.investor_id, round_id: form.round_id === '__none__' ? null : form.round_id, stage_id: form.stage_id, probability: Number(form.probability || 0), expected_amount: form.expected_amount ? Number(form.expected_amount) : null, next_followup_date: form.next_followup_date || null, last_contact_date: form.last_contact_date || null, notes: form.notes || null });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{deal ? <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button> : <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Create Deal</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{deal ? 'Edit Deal' : 'Create Deal'}</DialogTitle><DialogDescription>Track investor progress through the fundraising pipeline.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Investor"><Select value={form.investor_id} onValueChange={(value) => setForm((p) => ({ ...p, investor_id: value }))}><SelectTrigger><SelectValue placeholder="Select investor" /></SelectTrigger><SelectContent>{investors.map((item) => <SelectItem key={item.id} value={item.id}>{item.name ?? item.id}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Round"><Select value={form.round_id} onValueChange={(value) => setForm((p) => ({ ...p, round_id: value }))}><SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger><SelectContent><SelectItem value="__none__">No round</SelectItem>{rounds.map((item) => <SelectItem key={item.id} value={item.id}>{item.round_name ?? item.id}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Stage"><Select value={form.stage_id} onValueChange={(value) => setForm((p) => ({ ...p, stage_id: value }))}><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent>{stages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name ?? item.id}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Probability"><Input type="number" min={0} max={100} value={form.probability} onChange={(event) => setForm((p) => ({ ...p, probability: event.target.value }))} /></Field>
          <Field label="Expected Amount"><Input type="number" value={form.expected_amount} onChange={(event) => setForm((p) => ({ ...p, expected_amount: event.target.value }))} /></Field>
          <Field label="Last Contact"><Input type="date" value={form.last_contact_date} onChange={(event) => setForm((p) => ({ ...p, last_contact_date: event.target.value }))} /></Field>
          <Field label="Next Follow-Up"><Input type="date" value={form.next_followup_date} onChange={(event) => setForm((p) => ({ ...p, next_followup_date: event.target.value }))} /></Field>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm((p) => ({ ...p, notes: event.target.value }))} /></Field></div>
        </div>
        <Button disabled={mutation.isPending || !form.investor_id || !form.stage_id} onClick={submit}>{mutation.isPending ? 'Saving...' : 'Save Deal'}</Button>
      </DialogContent>
    </Dialog>
  );
}

function CommitmentSection({ workspaceId, dealId }: { workspaceId: string; dealId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ promised_amount: '', received_amount: '0', status: 'pending', commitment_date: '', expected_close_date: '', received_date: '', notes: '' });
  const { data: commitments = [] } = useQuery<Commitment[]>({ queryKey: ['fundraising', 'commitments', workspaceId, dealId], queryFn: () => getCommitmentsService(workspaceId), select: (rows) => rows.filter((row: Commitment) => row.deal_id === dealId), enabled: !!dealId });
  const createMutation = useMutation({ mutationFn: createCommitmentService, onSuccess: () => { setForm({ promised_amount: '', received_amount: '0', status: 'pending', commitment_date: '', expected_close_date: '', received_date: '', notes: '' }); queryClient.invalidateQueries({ queryKey: ['fundraising', 'commitments', workspaceId, dealId] }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteCommitmentService(workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'commitments', workspaceId, dealId] }) });
  return (
    <section className="grid gap-3">
      <h3 className="font-semibold">Commitments</h3>
      <div className="grid gap-2 sm:grid-cols-3"><Input placeholder="Promised amount" type="number" value={form.promised_amount} onChange={(e) => setForm((p) => ({ ...p, promised_amount: e.target.value }))} /><Input placeholder="Received amount" type="number" value={form.received_amount} onChange={(e) => setForm((p) => ({ ...p, received_amount: e.target.value }))} /><Select value={form.status} onValueChange={(status) => setForm((p) => ({ ...p, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="partially_received">Partially Received</SelectItem><SelectItem value="fully_received">Fully Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><Input type="date" value={form.commitment_date} onChange={(e) => setForm((p) => ({ ...p, commitment_date: e.target.value }))} /><Input type="date" value={form.expected_close_date} onChange={(e) => setForm((p) => ({ ...p, expected_close_date: e.target.value }))} /><Button disabled={!form.promised_amount || createMutation.isPending} onClick={() => createMutation.mutate({ workspace_id: workspaceId, deal_id: dealId, promised_amount: Number(form.promised_amount), received_amount: Number(form.received_amount || 0), status: form.status, commitment_date: form.commitment_date || null, expected_close_date: form.expected_close_date || null, received_date: form.received_date || null, notes: form.notes || null })}>Add Commitment</Button></div>
      <div className="rounded-md border">{commitments.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No commitments recorded.</div> : commitments.map((item) => <div key={item.id} className="flex items-center justify-between border-b p-3 text-sm last:border-b-0"><div><div className="font-medium">{item.promised_amount} promised · {item.received_amount} received</div><div className="text-muted-foreground">{item.status}</div></div><Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
    </section>
  );
}

function DealDetails({ workspaceId, deal, investors, rounds, stages, onChanged }: { workspaceId: string; deal: Deal; investors: Lookup[]; rounds: Lookup[]; stages: Lookup[]; onChanged: () => void }) {
  const investor = investors.find((item) => item.id === deal.investor_id);
  const round = rounds.find((item) => item.id === deal.round_id);
  const stage = stages.find((item) => item.id === deal.stage_id);
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>{investor?.name ?? 'Deal'}</DialogTitle><DialogDescription>Deal information, follow-ups, commitments, and core-module anchors.</DialogDescription></DialogHeader>
      <div className="grid gap-6">
        <section className="grid gap-3 text-sm sm:grid-cols-3"><Info label="Investor" value={investor?.name ?? deal.investor_id} /><Info label="Round" value={round?.round_name ?? '-'} /><Info label="Stage" value={stage?.name ?? deal.stage_id} /><Info label="Expected Amount" value={deal.expected_amount ?? '-'} /><Info label="Probability" value={`${deal.probability}%`} /><Info label="Owner" value={deal.owner_id ?? '-'} /></section>
        <section className="grid gap-3"><h3 className="font-semibold">Follow-Ups</h3><div className="grid gap-3 text-sm sm:grid-cols-2"><Info label="Last Contact Date" value={deal.last_contact_date ?? '-'} /><Info label="Next Follow-Up Date" value={deal.next_followup_date ?? '-'} /></div></section>
        <CommitmentSection workspaceId={workspaceId} dealId={deal.id} />
        <section className="text-sm text-muted-foreground">Notes, Meetings, Documents, and Activities should use entity_type <code>fundraising_deal</code> and entity_id <code>{deal.id}</code>.</section>
      </div>
    </DialogContent>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}

export function FundraisingDealsPage({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { data: deals = [] } = useQuery<Deal[]>({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const { data: investors = [] } = useQuery<Lookup[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const { data: rounds = [] } = useQuery<Lookup[]>({ queryKey: ['fundraising', 'rounds', workspaceId], queryFn: () => getRoundsService(workspaceId), enabled: !!workspaceId });
  const { data: stages = [] } = useQuery<Lookup[]>({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: !!workspaceId });
  const { data: commitments = [] } = useQuery<Commitment[]>({ queryKey: ['fundraising', 'commitments', workspaceId], queryFn: () => getCommitmentsService(workspaceId), enabled: !!workspaceId });
  const updateMutation = useMutation({ mutationFn: updateDealService, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'deals', workspaceId] }) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteDealService(workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'deals', workspaceId] }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'deals', workspaceId] });
  const investorName = (id: string) => investors.find((item) => item.id === id)?.name ?? id;
  const roundName = (id: string | null) => rounds.find((item) => item.id === id)?.round_name ?? '-';
  const committedAmount = (dealId: string) => commitments.filter((item) => item.deal_id === dealId).reduce((sum, item) => sum + (Number(item.promised_amount) || 0), 0);

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-bold">Pipeline</h1><p className="text-muted-foreground">Track investor progress through fundraising stages.</p></div><DealFormDialog workspaceId={workspaceId} onDone={refresh} /></div>
      <div className="grid min-h-[560px] auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage_id === stage.id);
          return (
            <div key={stage.id} className="rounded-md border bg-muted/20">
              <div className="flex items-center justify-between border-b p-3"><div className="font-semibold">{stage.name}</div><Badge variant="outline">{stageDeals.length}</Badge></div>
              <div className="grid gap-3 p-3">
                {stageDeals.map((deal) => (
                  <Card key={deal.id} className="rounded-md">
                    <CardContent className="grid gap-3 p-4">
                      <div><div className="font-medium">{investorName(deal.investor_id)}</div><div className="text-xs text-muted-foreground">{roundName(deal.round_id)}</div></div>
                      <div className="grid grid-cols-2 gap-2 text-xs"><Info label="Expected" value={deal.expected_amount ?? '-'} /><Info label="Committed" value={committedAmount(deal.id)} /><Info label="Follow-Up" value={deal.next_followup_date ?? '-'} /><Info label="Owner" value={deal.owner_id ?? '-'} /></div>
                      <div className="grid gap-2"><Select value={deal.stage_id} onValueChange={(stage_id) => updateMutation.mutate({ id: deal.id, workspace_id: workspaceId, stage_id })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={deal.next_followup_date?.slice(0, 10) ?? ''} onChange={(e) => updateMutation.mutate({ id: deal.id, workspace_id: workspaceId, next_followup_date: e.target.value || null })} /></div>
                      <div className="flex justify-end gap-1"><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></DialogTrigger><DealDetails workspaceId={workspaceId} deal={deal} investors={investors} rounds={rounds} stages={stages} onChanged={refresh} /></Dialog><DealFormDialog workspaceId={workspaceId} deal={deal} onDone={refresh} /><Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(deal.id)}><Trash2 className="h-4 w-4" /></Button></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {stages.length === 0 && <div className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">No pipeline stages configured. Add stages from Settings.</div>}
      </div>
    </div>
  );
}
