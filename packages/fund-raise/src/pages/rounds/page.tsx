'use client';

import React from 'react';
import {
  TrendingUp,
  Plus,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

const mockRounds = [
  {
    id: 'round-1',
    roundName: 'Series A',
    roundType: 'Equity',
    targetAmount: 3000000,
    raisedAmount: 1250000,
    valuation: 15000000,
    status: 'active',
    startDate: '2026-04-01',
    closeDate: '2026-09-30',
    description: 'Growth funding round targeting expansion of sales team and infrastructure.',
    minimumInvestment: 100000,
  },
  {
    id: 'round-2',
    roundName: 'Seed Extension',
    roundType: 'Convertible Note',
    targetAmount: 2000000,
    raisedAmount: 600000,
    valuation: 8000000,
    status: 'active',
    startDate: '2026-05-15',
    closeDate: '2026-08-31',
    description: 'Bridge round to reach Series A milestones with a valuation cap of $8M.',
    minimumInvestment: 250000,
  },
  {
    id: 'round-3',
    roundName: 'Pre-Seed',
    roundType: 'SAFE',
    targetAmount: 500000,
    raisedAmount: 500000,
    valuation: 4000000,
    status: 'completed',
    startDate: '2025-09-01',
    closeDate: '2025-12-15',
    description: 'Initial SAFE round for MVP development and product validation.',
    minimumInvestment: 25000,
  }
];

export function FundraisingRoundsPage() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Funding Rounds</h1>
          <p className="text-muted-foreground">Manage active equity rounds, SAFEs, convertible notes, and historical funding events.</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Create Funding Round
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockRounds.map((round) => {
          const progress = Math.round((round.raisedAmount / round.targetAmount) * 100);
          return (
            <Card key={round.id} className="flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={round.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {round.status}
                    </Badge>
                    <Badge variant="outline">{round.roundType}</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold mt-3">{round.roundName}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{round.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Raised Progress</span>
                      <span className="font-semibold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div 
                        className={`h-full ${round.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`} 
                        style={{ width: `${Math.min(progress, 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Target Amount</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(round.targetAmount)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Raised So Far</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-500">{formatCurrency(round.raisedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Valuation</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(round.valuation)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Min Investment</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(round.minimumInvestment)}</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="border-t border-border p-4 bg-muted/20 rounded-b-lg flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Calendar className="mr-1 h-3.5 w-3.5" /> Close: {round.closeDate}
                </span>
                <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary/90 p-0 flex items-center">
                  Manage Round <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
