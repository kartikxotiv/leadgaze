'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { getDealsService, getInvestorContactsService, getInvestorsService } from '../../services';
import { FUNDRAISING_FEATURE_KEYS, FUNDRAISING_MODULE_KEYS, useFundraisingPermissions } from '../../utils';

export function FundraisingInvestorDetailsPage({ workspaceId, investorId }: { workspaceId: string; investorId: string }) {
  const { canAccess, isLoading } = useFundraisingPermissions(workspaceId);
  const { data: investors = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'investors', workspaceId], queryFn: () => getInvestorsService(workspaceId), enabled: !!workspaceId });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'contacts', workspaceId], queryFn: () => getInvestorContactsService(workspaceId), enabled: !!workspaceId });
  const { data: deals = [] } = useQuery<any[]>({ queryKey: ['fundraising', 'deals', workspaceId], queryFn: () => getDealsService(workspaceId), enabled: !!workspaceId });
  const investor = investors.find((item) => item.id === investorId);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canAccess(FUNDRAISING_MODULE_KEYS.investors, FUNDRAISING_FEATURE_KEYS.view)) return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view this investor.</div>;

  if (!investor) return <div className="p-6 text-sm text-muted-foreground">Investor not found.</div>;

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div><h1 className="text-3xl font-bold">{investor.name}</h1><p className="text-muted-foreground">Investor details</p></div>
      <Card><CardContent className="grid gap-4 p-6 sm:grid-cols-3"><Info label="Type" value={investor.investor_type ?? '-'} /><Info label="Status" value={<Badge variant="outline">{investor.status}</Badge>} /><Info label="Ticket Size" value={`${investor.ticket_size_min ?? '-'} - ${investor.ticket_size_max ?? '-'}`} /><Info label="Industry Focus" value={investor.industry_focus?.join(', ') || '-'} /><Info label="Geo Focus" value={investor.geo_focus?.join(', ') || '-'} /><Info label="Owner" value={investor.owner_id ?? '-'} /></CardContent></Card>
      <Section title="Contacts" rows={contacts.filter((item) => item.investor_id === investorId).map((item) => `${item.name} · ${item.designation ?? '-'} · ${item.email ?? '-'}`)} empty="No contacts added." />
      <Section title="Related Deals" rows={deals.filter((item) => item.investor_id === investorId).map((item) => `${item.id} · ${item.status}`)} empty="No related deals." />
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Core modules use entity_type <code>fundraising_investor</code> and entity_id <code>{investorId}</code>.</CardContent></Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}

function Section({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return <Card><CardContent className="p-6"><h2 className="mb-3 font-semibold">{title}</h2>{rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="grid gap-2">{rows.map((row) => <div key={row} className="rounded-md border p-3 text-sm">{row}</div>)}</div>}</CardContent></Card>;
}
