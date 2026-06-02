'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { getCommitmentsService, getDealsService, getInvestorsService, getPipelineStagesService, getRoundsService } from '../../services';
import { FUNDRAISING_FEATURE_KEYS, FUNDRAISING_MODULE_KEYS, dateDisplay, dealDisplay, investorDisplay, ownerDisplay, roundDisplay, stageDisplay, useFundraisingPermissions } from '../../utils';

export function FundraisingDealDetailsPage({ workspaceId, dealId }: { workspaceId: string; dealId: string }) {
  const { canAccess, isLoading } = useFundraisingPermissions(workspaceId);
  const { data: deals = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const { data: investors = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const { data: rounds = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'rounds', workspaceId], queryFn: () => getRoundsService(workspaceId), enabled: !!workspaceId });
  const { data: stages = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: !!workspaceId });
  const { data: commitments = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'commitments', workspaceId], queryFn: () => getCommitmentsService(workspaceId), enabled: !!workspaceId });
  const deal = deals.find((item) => item.id === dealId);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canAccess(FUNDRAISING_MODULE_KEYS.pipeline, FUNDRAISING_FEATURE_KEYS.view)) return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view this deal.</div>;

  if (!deal) return <div className="p-6 text-sm text-muted-foreground">Deal not found.</div>;

  const investorName = investorDisplay({ ...deal, investor_name: deal.investor_name ?? investors.find((item) => item.id === deal.investor_id)?.name });
  const roundName = roundDisplay({ ...deal, round_name: deal.round_name ?? rounds.find((item) => item.id === deal.round_id)?.round_name });
  const stageName = stageDisplay({ ...deal, stage_name: deal.stage_name ?? stages.find((item) => item.id === deal.stage_id)?.name });

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div><h1 className="text-3xl font-bold">{dealDisplay(deal)}</h1><p className="text-muted-foreground">Deal details</p></div>
      <Card><CardContent className="grid gap-4 p-6 sm:grid-cols-3"><Info label="Investor" value={investorName} /><Info label="Round" value={roundName} /><Info label="Stage" value={stageName} /><Info label="Expected Amount" value={deal.expected_amount ?? '-'} /><Info label="Probability" value={`${deal.probability}%`} /><Info label="Owner" value={ownerDisplay(deal)} /><Info label="Status" value={<Badge variant="outline">{deal.status}</Badge>} /></CardContent></Card>
      <Card><CardContent className="grid gap-4 p-6 sm:grid-cols-2"><Info label="Last Contact Date" value={dateDisplay(deal.last_contact_date_display, deal.last_contact_date)} /><Info label="Next Follow-Up Date" value={dateDisplay(deal.next_followup_date_display, deal.next_followup_date)} /></CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="mb-3 font-semibold">Commitments</h2>{commitments.filter((item) => item.deal_id === dealId).length === 0 ? <p className="text-sm text-muted-foreground">No commitments recorded.</p> : commitments.filter((item) => item.deal_id === dealId).map((item) => <div key={item.id} className="border-b py-2 text-sm last:border-b-0">{item.promised_amount} promised · {item.received_amount} received · {item.status}</div>)}</CardContent></Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
