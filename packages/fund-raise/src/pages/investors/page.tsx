'use client';

import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';

const mockInvestors = [
  {
    id: 'inv-1',
    name: 'Apex Capital',
    type: 'VC',
    ticketSizeMin: 250000,
    ticketSizeMax: 1000000,
    focus: 'SaaS, FinTech, Enterprise',
    website: 'https://apex.cap',
    description: 'Early-stage venture capital firm investing in innovative enterprise applications.',
    contacts: [
      { name: 'David Miller', role: 'Partner', email: 'david@apex.cap' }
    ]
  },
  {
    id: 'inv-2',
    name: 'Blue Horizon Ventures',
    type: 'VC',
    ticketSizeMin: 500000,
    ticketSizeMax: 2000000,
    focus: 'AI/ML, B2B SaaS, Analytics',
    website: 'https://bluehorizon.vc',
    description: 'Multi-stage fund partnering with outstanding founders rewriting automation.',
    contacts: [
      { name: 'Sarah Connor', role: 'Associate', email: 'sarah@bluehorizon.vc' }
    ]
  },
  {
    id: 'inv-3',
    name: 'Sarah Jenkins (Angel)',
    type: 'Angel',
    ticketSizeMin: 50000,
    ticketSizeMax: 150000,
    focus: 'EdTech, Future of Work',
    website: 'https://jenkinsangels.com',
    description: 'Active angel investor supporting initial developer tools and workplace tools.',
    contacts: [
      { name: 'Sarah Jenkins', role: 'Angel Investor', email: 'sarah@jenkins.com' }
    ]
  },
  {
    id: 'inv-4',
    name: 'Vanguard Syndicate',
    type: 'Syndicate',
    ticketSizeMin: 100000,
    ticketSizeMax: 500000,
    focus: 'Web3, Infrastructure',
    website: 'https://vanguardsyndicate.xyz',
    description: 'Community-led syndicate focusing on decentralized networks and SaaS tools.',
    contacts: [
      { name: 'Alex Rivera', role: 'Lead Organizer', email: 'alex@vanguard.xyz' }
    ]
  }
];

export function FundraisingInvestorsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredInvestors = mockInvestors.filter(inv =>
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.focus.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investors</h1>
          <p className="text-muted-foreground">Manage and research venture capital firms, angel syndicates, and angel investors.</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Investor
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or focus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredInvestors.map((inv) => (
          <Card key={inv.id} className="flex flex-col justify-between hover:shadow-sm transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">{inv.name}</CardTitle>
                    <a href={inv.website} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center mt-0.5">
                      {inv.website.replace('https://', '')} <ArrowUpRight className="ml-0.5 h-3 w-3" />
                    </a>
                  </div>
                </div>
                <Badge variant="secondary">{inv.type}</Badge>
              </div>
              <CardDescription className="mt-3 line-clamp-2">{inv.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-y border-border py-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Ticket Size</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(inv.ticketSizeMin)} - {formatCurrency(inv.ticketSizeMax)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Sectors Focus</span>
                  <span className="font-semibold text-foreground truncate block" title={inv.focus}>
                    {inv.focus}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Primary Contact</span>
                {inv.contacts.map((contact, idx) => (
                  <div key={idx} className="flex flex-col space-y-1 rounded-md bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{contact.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{contact.role}</Badge>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-muted-foreground mt-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{contact.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
