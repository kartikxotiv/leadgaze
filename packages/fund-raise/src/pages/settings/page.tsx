'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { createPipelineStageService, deletePipelineStageService, getPipelineStagesService, updatePipelineStageService } from '../../services';
import {
  FUNDRAISING_FEATURE_KEYS,
  FUNDRAISING_MODULE_KEYS,
  useFundraisingPermissions,
} from '../../utils';

type Stage = { id: string; name: string; description: string | null; display_order: number; is_default: boolean; is_closed_won: boolean; is_closed_lost: boolean };

const investorTypes = ['VC', 'Angel', 'PE', 'Family Office', 'Corporate Investor'];
const roundTypes = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Bridge'];

function StageDialog({ workspaceId, stage, onDone }: { workspaceId: string; stage?: Stage | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: stage?.name ?? '', description: stage?.description ?? '', display_order: String(stage?.display_order ?? 0), is_default: !!stage?.is_default, is_closed_won: !!stage?.is_closed_won, is_closed_lost: !!stage?.is_closed_lost });
  const mutation = useMutation({ mutationFn: (payload: Record<string, unknown>) => stage ? updatePipelineStageService(payload) : createPipelineStageService(payload), onSuccess: () => { setOpen(false); onDone(); } });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{stage ? <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button> : <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Stage</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{stage ? 'Edit Stage' : 'Add Stage'}</DialogTitle><DialogDescription>Configure fundraising pipeline stages.</DialogDescription></DialogHeader>
        <div className="grid gap-4">
          <Field label="Name"><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></Field>
          <Field label="Description"><Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field>
          <Field label="Display Order"><Input type="number" value={form.display_order} onChange={(event) => setForm((prev) => ({ ...prev, display_order: event.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(event) => setForm((prev) => ({ ...prev, is_default: event.target.checked }))} /> Default stage</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_closed_won} onChange={(event) => setForm((prev) => ({ ...prev, is_closed_won: event.target.checked }))} /> Closed won</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_closed_lost} onChange={(event) => setForm((prev) => ({ ...prev, is_closed_lost: event.target.checked }))} /> Closed lost</label>
          <Button disabled={mutation.isPending || !form.name} onClick={() => mutation.mutate({ id: stage?.id, workspace_id: workspaceId, name: form.name, description: form.description || null, display_order: Number(form.display_order || 0), is_default: form.is_default, is_closed_won: form.is_closed_won, is_closed_lost: form.is_closed_lost })}>{mutation.isPending ? 'Saving...' : 'Save Stage'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

export function FundraisingSettingsPage({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { canAccess, isLoading: isPermissionsLoading } = useFundraisingPermissions(workspaceId);
  const canManageStages = canAccess(FUNDRAISING_MODULE_KEYS.pipeline, FUNDRAISING_FEATURE_KEYS.manageStages);
  const { data: stages = [] } = useQuery<Stage[]>({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: !!workspaceId });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deletePipelineStageService(workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'pipeline-stages', workspaceId] }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['fundraising', 'pipeline-stages', workspaceId] });

  if (isPermissionsLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  }

  if (!canManageStages) {
    return <div className="p-6 text-sm text-muted-foreground">You do not have permission to manage fundraising settings.</div>;
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Manage fundraising pipeline and static configuration.</p></div><StageDialog workspaceId={workspaceId} onDone={refresh} /></div>
      <Card><CardContent className="p-0"><div className="border-b p-4 font-semibold">Pipeline Stages</div><div>{stages.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No pipeline stages configured.</div> : stages.map((stage) => <div key={stage.id} className="flex items-center justify-between border-b p-4 last:border-b-0"><div><div className="font-medium">{stage.name}</div><div className="text-sm text-muted-foreground">Order {stage.display_order} · {stage.description ?? 'No description'}</div></div><div className="flex items-center gap-2">{stage.is_default && <Badge variant="outline">Default</Badge>}{stage.is_closed_won && <Badge>Won</Badge>}{stage.is_closed_lost && <Badge variant="destructive">Lost</Badge>}<StageDialog workspaceId={workspaceId} stage={stage} onDone={refresh} /><Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(stage.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div></CardContent></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-4"><h2 className="mb-3 font-semibold">Investor Types</h2><div className="flex flex-wrap gap-2">{investorTypes.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><h2 className="mb-3 font-semibold">Round Types</h2><div className="flex flex-wrap gap-2">{roundTypes.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div></CardContent></Card>
      </div>
    </div>
  );
}
