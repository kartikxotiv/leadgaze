'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';

import { CoreEntityPanel } from '@kit/core/pages';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent } from '@kit/ui/card';

import {
  getDealsService,
  getInvestorsService,
  getPipelineStagesService,
  getRoundsService,
} from '../../services';
import {
  FUNDRAISING_FEATURE_KEYS,
  FUNDRAISING_MODULE_KEYS,
  dateDisplay,
  investorDisplay,
  useFundraisingPermissions,
} from '../../utils';

export function FundraisingRoundDetailsPage({
  workspaceId,
  roundId,
}: {
  workspaceId: string;
  roundId: string;
}) {
  const { canAccess, isLoading } = useFundraisingPermissions(workspaceId);
  const { data: rounds = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'rounds', workspaceId],
    queryFn: () => getRoundsService(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'deals', workspaceId],
    queryFn: () => getDealsService(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: investors = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'investors', workspaceId],
    queryFn: () => getInvestorsService(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'pipeline-stages', workspaceId],
    queryFn: () => getPipelineStagesService(workspaceId),
    enabled: !!workspaceId,
  });
  const round = rounds.find((item) => item.id === roundId);
  const roundDeals = deals.filter((item) => item.round_id === roundId);

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canAccess(FUNDRAISING_MODULE_KEYS.rounds, FUNDRAISING_FEATURE_KEYS.view))
    return (
      <div className="text-muted-foreground p-6 text-sm">
        You do not have permission to view this funding round.
      </div>
    );

  if (!round)
    return (
      <div className="text-muted-foreground p-6 text-sm">Round not found.</div>
    );

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{round.round_name}</h1>
        <p className="text-muted-foreground">Funding round details</p>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-4">
          <Info label="Type" value={round.round_type} />
          <Info label="Target" value={round.target_amount} />
          <Info label="Raised" value={round.raised_amount} />
          <Info label="Valuation" value={round.valuation ?? '-'} />
          <Info
            label="Status"
            value={<Badge variant="outline">{round.status}</Badge>}
          />
          <Info
            label="Start"
            value={dateDisplay(round.start_date_display, round.start_date)}
          />
          <Info
            label="Close"
            value={dateDisplay(round.close_date_display, round.close_date)}
          />
          <Info label="Currency" value={round.currency} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 font-semibold">Associated Investors</h2>
          {roundDeals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No investors linked.
            </p>
          ) : (
            roundDeals.map((deal) => (
              <div
                key={deal.id}
                className="border-b py-2 text-sm last:border-b-0"
              >
                {investorDisplay({
                  ...deal,
                  investor_name:
                    deal.investor_name ??
                    investors.find((item) => item.id === deal.investor_id)
                      ?.name,
                })}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 font-semibold">Pipeline Summary</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {stages.map((stage) => (
              <div key={stage.id} className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  {stage.name}
                </div>
                <div className="text-2xl font-bold">
                  {
                    roundDeals.filter((deal) => deal.stage_id === stage.id)
                      .length
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <CoreSections
        workspaceId={workspaceId}
        entityType="fundraising_round"
        entityId={roundId}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function CoreSections({
  workspaceId,
  entityType,
  entityId,
}: {
  workspaceId: string;
  entityType: string;
  entityId: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-6">
        <div>
          <h2 className="font-semibold">Notes, Emails & Documents</h2>
          <p className="text-muted-foreground text-sm">
            Track reusable core records linked to this funding round.
          </p>
        </div>
        <CoreEntityPanel
          workspaceId={workspaceId}
          entityType={entityType}
          entityId={entityId}
          capabilities={['notes', 'documents']}
        />
      </CardContent>
    </Card>
  );
}
