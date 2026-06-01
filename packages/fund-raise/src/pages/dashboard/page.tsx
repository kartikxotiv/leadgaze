'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, DollarSign, TrendingUp, Users2, Calendar, Activity } from 'lucide-react';
import { Card, CardContent } from '@kit/ui/card';
import { getRoundsService, getInvestorsService, getDealsService, getPipelineStagesService } from '../../services';
import { FUNDRAISING_FEATURE_KEYS, FUNDRAISING_MODULE_KEYS, useFundraisingPermissions } from '../../utils';

export function FundraisingDashboardPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading: isPermissionsLoading } = useFundraisingPermissions(workspaceId);
  const canViewPipeline = canAccess(FUNDRAISING_MODULE_KEYS.pipeline, FUNDRAISING_FEATURE_KEYS.view);
  const canViewRounds = canAccess(FUNDRAISING_MODULE_KEYS.rounds, FUNDRAISING_FEATURE_KEYS.view);
  const canViewInvestors = canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.view);
  const { data: rounds = [] } = useQuery({ queryKey: ['fundraising', 'rounds', workspaceId], queryFn: () => getRoundsService(workspaceId), enabled: !!workspaceId });
  const { data: investors = [] } = useQuery({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const { data: deals = [] } = useQuery({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const { data: stages = [] } = useQuery({ queryKey: ['fundraising', 'pipeline-stages', workspaceId], queryFn: () => getPipelineStagesService(workspaceId), enabled: !!workspaceId });

  const totalTarget = rounds.reduce((sum: number, r: any) => sum + (Number(r.target_amount) || 0), 0);
  const totalRaised = rounds.reduce((sum: number, r: any) => sum + (Number(r.raised_amount) || 0), 0);
  const activeRounds = rounds.filter((r: any) => r.status === 'active').length;
  const activeDeals = deals.filter((d: any) => d.status === 'active').length;
  const upcoming = deals.filter((d: any) => d.next_followup_date).sort((a: any, b: any) => String(a.next_followup_date).localeCompare(String(b.next_followup_date))).slice(0, 5);
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  if (isPermissionsLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  }

  if (!canViewPipeline && !canViewRounds && !canViewInvestors) {
    return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view fundraising.</div>;
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fundraising</h1>
        <p className="text-muted-foreground">Quick view of rounds, investors, and pipeline health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canViewRounds && <Card><CardContent className="p-6"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total Target</span><DollarSign className="h-4 w-4" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(totalTarget)}</div></CardContent></Card>}
        {canViewRounds && <Card><CardContent className="p-6"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total Raised</span><TrendingUp className="h-4 w-4 text-green-500" /></div><div className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(totalRaised)}</div></CardContent></Card>}
        {canViewRounds && <Card><CardContent className="p-6"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Active Rounds</span><Calendar className="h-4 w-4" /></div><div className="mt-2 text-2xl font-bold">{activeRounds}</div></CardContent></Card>}
        {canViewPipeline && <Card><CardContent className="p-6"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Active Deals</span><Activity className="h-4 w-4" /></div><div className="mt-2 text-2xl font-bold">{activeDeals}</div></CardContent></Card>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {canViewPipeline && <Card><CardContent className="p-6"><h2 className="mb-4 text-base font-semibold">Pipeline Distribution</h2><div className="space-y-3">{stages.map((stage: any) => { const count = deals.filter((d: any) => d.stage_id === stage.id).length; return <div key={stage.id} className="flex items-center justify-between text-sm"><span>{stage.name}</span><span className="font-medium">{count}</span></div>; })}</div></CardContent></Card>}
        {canViewPipeline && <Card><CardContent className="p-6"><h2 className="mb-4 text-base font-semibold">Upcoming Follow-Ups</h2><div className="space-y-3">{upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p> : upcoming.map((deal: any) => <div key={deal.id} className="flex items-center justify-between text-sm"><span>{deal.investor_id}</span><span>{deal.next_followup_date}</span></div>)}</div></CardContent></Card>}
        {canViewInvestors && <Card><CardContent className="p-6"><h2 className="mb-4 text-base font-semibold">Total Investors</h2><div className="text-2xl font-bold">{investors.length}</div></CardContent></Card>}
        {canViewPipeline && <Card><CardContent className="p-6"><h2 className="mb-4 text-base font-semibold">Fundraising Health</h2><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users2 className="h-4 w-4" /> {stages.length} pipeline stages configured</div></CardContent></Card>}
      </div>
    </div>
  );
}
