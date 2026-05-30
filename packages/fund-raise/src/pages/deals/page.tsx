'use client';

import React, { useState } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';

const mockDeals = [
  {
    id: 'deal-1',
    investorName: 'Blue Horizon Ventures',
    roundName: 'Series A',
    stage: 'Due Diligence',
    probability: 65,
    expectedAmount: 500000,
    committedAmount: 0,
    status: 'active',
    lastContact: '2026-05-28',
  },
  {
    id: 'deal-2',
    investorName: 'Apex Capital',
    roundName: 'Series A',
    stage: 'Negotiation',
    probability: 85,
    expectedAmount: 750000,
    committedAmount: 500000,
    status: 'active',
    lastContact: '2026-05-29',
  },
  {
    id: 'deal-3',
    investorName: 'Vanguard Syndicate',
    roundName: 'Seed Extension',
    stage: 'Committed',
    probability: 100,
    expectedAmount: 300000,
    committedAmount: 300000,
    status: 'won',
    lastContact: '2026-05-30',
  },
  {
    id: 'deal-4',
    investorName: 'Sarah Jenkins (Angel)',
    roundName: 'Seed Extension',
    stage: 'Pitch Shared',
    probability: 40,
    expectedAmount: 100000,
    committedAmount: 0,
    status: 'active',
    lastContact: '2026-05-25',
  }
];

export function FundraisingDealsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredDeals = mockDeals.filter(deal =>
    deal.investorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.roundName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Deals</h1>
          <p className="text-muted-foreground">Track pipeline stages, closing probability, and commitments for active investor conversations.</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Start Deal Conversation
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals by investor or round..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="bg-muted/40 text-xs font-semibold text-foreground uppercase border-y border-border">
                <tr>
                  <th className="p-4">Investor</th>
                  <th className="p-4">Target Round</th>
                  <th className="p-4">Pipeline Stage</th>
                  <th className="p-4">Probability</th>
                  <th className="p-4">Expected Amt</th>
                  <th className="p-4">Committed Amt</th>
                  <th className="p-4">Last Contact</th>
                  <th className="p-4">Deal Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-b border-border">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{deal.investorName}</td>
                    <td className="p-4">{deal.roundName}</td>
                    <td className="p-4">
                      <span className="flex items-center">
                        <span className="mr-2 h-2 w-2 rounded-full bg-primary" />
                        {deal.stage}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-foreground">{deal.probability}%</span>
                        <div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-primary" style={{ width: `${deal.probability}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-foreground">{formatCurrency(deal.expectedAmount)}</td>
                    <td className="p-4 text-green-600 dark:text-green-500 font-medium">
                      {deal.committedAmount > 0 ? formatCurrency(deal.committedAmount) : '-'}
                    </td>
                    <td className="p-4">{deal.lastContact}</td>
                    <td className="p-4">
                      <Badge className={`border-none capitalize ${
                        deal.status === 'won' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {deal.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8">
                        View <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
