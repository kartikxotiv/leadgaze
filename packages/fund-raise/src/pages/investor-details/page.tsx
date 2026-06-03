'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';

import { CoreEntityPanel } from '@kit/core/pages';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent } from '@kit/ui/card';

import {
  getDealsService,
  getInvestorContactsService,
  getInvestorsService,
} from '../../services';
import {
  FUNDRAISING_FEATURE_KEYS,
  FUNDRAISING_MODULE_KEYS,
  dealDisplay,
  ownerDisplay,
  useFundraisingPermissions,
} from '../../utils';

export function FundraisingInvestorDetailsPage({
  workspaceId,
  investorId,
}: {
  workspaceId: string;
  investorId: string;
}) {
  const { canAccess, isLoading } = useFundraisingPermissions(workspaceId);
  const { data: investors = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'investors', workspaceId],
    queryFn: () => getInvestorsService(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'contacts', workspaceId],
    queryFn: () => getInvestorContactsService(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ['fundraising', 'deals', workspaceId],
    queryFn: () => getDealsService(workspaceId),
    enabled: !!workspaceId,
  });
  const investor = investors.find((item) => item.id === investorId);

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (
    !canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.view)
  )
    return (
      <div className="text-muted-foreground p-6 text-sm">
        You do not have permission to view this investor.
      </div>
    );

  if (!investor)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Investor not found.
      </div>
    );

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{investor.name}</h1>
        <p className="text-muted-foreground">Investor details</p>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          <Info label="Type" value={investor.investor_type ?? '-'} />
          <Info
            label="Status"
            value={<Badge variant="outline">{investor.status}</Badge>}
          />
          <Info
            label="Ticket Size"
            value={`${investor.ticket_size_min ?? '-'} - ${investor.ticket_size_max ?? '-'}`}
          />
          <Info
            label="Industry Focus"
            value={investor.industry_focus?.join(', ') || '-'}
          />
          <Info
            label="Geo Focus"
            value={investor.geo_focus?.join(', ') || '-'}
          />
          <Info label="Owner" value={ownerDisplay(investor)} />
        </CardContent>
      </Card>
      <Section
        title="Contacts"
        rows={contacts
          .filter((item) => item.investor_id === investorId)
          .map(
            (item) =>
              `${item.name} · ${item.designation ?? '-'} · ${item.email ?? '-'}`,
          )}
        empty="No contacts added."
      />
      <Section
        title="Related Deals"
        rows={deals
          .filter((item) => item.investor_id === investorId)
          .map((item) => `${dealDisplay(item)} · ${item.status}`)}
        empty="No related deals."
      />
      <CoreSections
        workspaceId={workspaceId}
        entityType="fundraising_investor"
        entityId={investorId}
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

function Section({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: string[];
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-3 font-semibold">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <div className="grid gap-2">
            {rows.map((row) => (
              <div key={row} className="rounded-md border p-3 text-sm">
                {row}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
            Track reusable core records linked to this investor.
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
