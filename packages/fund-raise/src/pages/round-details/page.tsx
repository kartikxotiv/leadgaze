'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { getDealsService, getInvestorsService, getPipelineStagesService, getRoundsService } from '../../services';

export function FundraisingRoundDetailsPage({ workspaceId, roundId }: { workspaceId: string; roundId: string }) {
  const { data: rounds = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'rounds', workspaceId], queryFn: () => getRoundsService(workspaceId), enabled: !!workspaceId });
  const { data: deals = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const { data: investors = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const { data: stages = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: !!workspaceId });
  const round = rounds.find((item) => item.id === roundId);
  const roundDeals = deals.filter((item) => item.round_id === roundId);

  if (!round) return <div className="p-6 text-sm text-muted-foreground">Round not found.</div>;

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div><h1 className="text-3xl font-bold">{round.round_name}</h1><p className="text-muted-foreground">Funding round details</p></div>
      <Card><CardContent className="grid gap-4 p-6 sm:grid-cols-4"><Info label="Type" value={round.round_type} /><Info label="Target" value={round.target_amount} /><Info label="Raised" value={round.raised_amount} /><Info label="Valuation" value={round.valuation ?? '-'} /><Info label="Status" value={<Badge variant="outline">{round.status}</Badge>} /><Info label="Start" value={round.start_date ?? '-'} /><Info label="Close" value={round.close_date ?? '-'} /><Info label="Currency" value={round.currency} /></CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="mb-3 font-semibold">Associated Investors</h2>{roundDeals.length === 0 ? <p className="text-sm text-muted-foreground">No investors linked.</p> : roundDeals.map((deal) => <div key={deal.id} className="border-b py-2 text-sm last:border-b-0">{investors.find((item) => item.id === deal.investor_id)?.name ?? deal.investor_id}</div>)}</CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="mb-3 font-semibold">Pipeline Summary</h2><div className="grid gap-3 sm:grid-cols-3">{stages.map((stage) => <div key={stage.id} className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{stage.name}</div><div className="text-2xl font-bold">{roundDeals.filter((deal) => deal.stage_id === stage.id).length}</div></div>)}</div></CardContent></Card>
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Core modules use entity_type <code>fundraising_round</code> and entity_id <code>{roundId}</code>.</CardContent></Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
