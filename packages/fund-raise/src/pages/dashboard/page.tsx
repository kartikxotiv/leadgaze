'use client'
import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users2,
  Calendar,
  ArrowUpRight,
  FileText,
  Clock,
  Filter,
  Search,
  Plus,
  ChevronRight,
  Briefcase,
  AlertCircle,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';

const mockDashboardStats = {
  totalTarget: 5000000,
  totalRaised: 1850000,
  committedAmount: 950000,
  activeDeals: 14,
  investorConversations: 38,
};

const mockActiveRounds = [
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
  }
];

const mockInvestors = [
  {
    id: 'inv-1',
    name: 'Apex Capital',
    type: 'VC',
    ticketSize: '$250k - $1M',
    focus: 'SaaS, FinTech',
    status: 'Contacted',
    website: 'https://apex.cap',
  },
  {
    id: 'inv-2',
    name: 'Blue Horizon Ventures',
    type: 'VC',
    ticketSize: '$500k - $2M',
    focus: 'AI/ML, B2B SaaS',
    status: 'Due Diligence',
    website: 'https://bluehorizon.vc',
  },
  {
    id: 'inv-3',
    name: 'Sarah Jenkins (Angel)',
    type: 'Angel',
    ticketSize: '$50k - $150k',
    focus: 'EdTech, Future of Work',
    status: 'Pitch Shared',
    website: 'https://jenkinsangels.com',
  },
  {
    id: 'inv-4',
    name: 'Vanguard Syndicate',
    type: 'Syndicate',
    ticketSize: '$100k - $500k',
    focus: 'Web3, Infrastructure',
    status: 'Negotiation',
    website: 'https://vanguardsyndicate.xyz',
  },
  {
    id: 'inv-5',
    name: 'Summit Partners',
    type: 'PE',
    ticketSize: '$1M - $5M',
    focus: 'Growth SaaS',
    status: 'Lead',
    website: 'https://summitpartners.com',
  }
];

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

const mockRecentActivities = [
  {
    id: 'act-1',
    type: 'note',
    description: 'Updated Pitch Deck sent to Blue Horizon Ventures after initial call.',
    date: 'May 30, 2026',
  },
  {
    id: 'act-2',
    type: 'meeting',
    description: 'Partners meeting scheduled with Apex Capital for term sheet alignment.',
    date: 'May 29, 2026',
  },
  {
    id: 'act-3',
    type: 'commitment',
    description: 'Vanguard Syndicate confirmed commitment of $300,000 for Seed Extension.',
    date: 'May 28, 2026',
  }
];

export function FundraisingDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rounds' | 'investors' | 'deals'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalRaisedPercent = Math.round((mockDashboardStats.totalRaised / mockDashboardStats.totalTarget) * 100);

  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fundraising</h1>
          <p className="text-muted-foreground">Manage active funding rounds, investors, conversations, and commitments.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Create Funding Round
          </Button>
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {(['overview', 'rounds', 'investors', 'deals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 py-4 px-1 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Raised Goal</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(mockDashboardStats.totalTarget)}</div>
                <div className="mt-2 text-xs text-muted-foreground">Target across all active rounds</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Funds Secured</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(mockDashboardStats.totalRaised)}</div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <span className="font-semibold text-green-600 dark:text-green-500 mr-1">{totalRaisedPercent}%</span> of goal reached
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Soft Commitments</span>
                  <Percent className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{formatCurrency(mockDashboardStats.committedAmount)}</div>
                <div className="mt-2 text-xs text-muted-foreground">Committed by active prospective investors</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Active Deal Pipeline</span>
                  <Users2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{mockDashboardStats.activeDeals} Deals</div>
                <div className="mt-2 text-xs text-muted-foreground">{mockDashboardStats.investorConversations} investor conversations total</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Overall Fundraising Campaign Progress</CardTitle>
              <CardDescription>Visual breakdown of goals met, commitments, and remaining targets.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-green-500 transition-all duration-500"
                    style={{ width: `${totalRaisedPercent}%` }}
                  />
                  <div 
                    className="absolute top-0 bottom-0 bg-amber-400 opacity-60 transition-all duration-500"
                    style={{ 
                      left: `${totalRaisedPercent}%`, 
                      width: `${Math.min(100 - totalRaisedPercent, Math.round((mockDashboardStats.committedAmount / mockDashboardStats.totalTarget) * 100))}%` 
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
                    <span className="text-muted-foreground">Received / Closed ({formatCurrency(mockDashboardStats.totalRaised)})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                    <span className="text-muted-foreground">Soft Committed ({formatCurrency(mockDashboardStats.committedAmount)})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="h-3 w-3 rounded-full bg-secondary inline-block" />
                    <span className="text-muted-foreground">Remaining Gap ({formatCurrency(mockDashboardStats.totalTarget - mockDashboardStats.totalRaised - mockDashboardStats.committedAmount)})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Active Rounds</CardTitle>
                  <CardDescription>Overview of currently open fundraising rounds.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('rounds')}>
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockActiveRounds.map((round) => {
                  const roundProgress = Math.round((round.raisedAmount / round.targetAmount) * 100);
                  return (
                    <div key={round.id} className="rounded-lg border border-border p-4 hover:border-foreground/20 transition-all">
                      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-foreground">{round.roundName}</span>
                            <Badge variant="outline">{round.roundType}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Ends on {round.closeDate}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-foreground">{formatCurrency(round.raisedAmount)}</span>
                          <span className="text-xs text-muted-foreground"> / {formatCurrency(round.targetAmount)}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{roundProgress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${roundProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <CardDescription>Latest changes, notes, and milestones.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockRecentActivities.map((act) => (
                  <div key={act.id} className="relative pl-6 pb-2 last:pb-0">
                    <div className="absolute left-2.5 top-2.5 bottom-0 w-0.5 bg-border last:hidden" />
                    <div className="absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground block font-medium">{act.date}</span>
                    <p className="text-sm text-foreground font-medium mt-0.5">{act.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'rounds' && (
        <Card>
          <CardHeader>
            <CardTitle>Funding Rounds</CardTitle>
            <CardDescription>Track target amounts, valuation metrics, and opening dates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead className="bg-muted/40 text-xs font-semibold text-foreground uppercase border-y border-border">
                  <tr>
                    <th className="p-4">Round Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Target</th>
                    <th className="p-4">Raised</th>
                    <th className="p-4">Valuation</th>
                    <th className="p-4">Start Date</th>
                    <th className="p-4">End Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border border-b border-border">
                  {mockActiveRounds.map((round) => (
                    <tr key={round.id} className="hover:bg-muted/30">
                      <td className="p-4 font-medium text-foreground">{round.roundName}</td>
                      <td className="p-4">{round.roundType}</td>
                      <td className="p-4 text-foreground">{formatCurrency(round.targetAmount)}</td>
                      <td className="p-4 text-green-600 dark:text-green-500 font-medium">{formatCurrency(round.raisedAmount)}</td>
                      <td className="p-4">{formatCurrency(round.valuation)}</td>
                      <td className="p-4">{round.startDate}</td>
                      <td className="p-4">{round.closeDate}</td>
                      <td className="p-4">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none capitalize">{round.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'investors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
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
                      <th className="p-4">Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Ticket Size</th>
                      <th className="p-4">Industry Focus</th>
                      <th className="p-4">Pipeline Status</th>
                      <th className="p-4">Website</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border border-b border-border">
                    {mockInvestors
                      .filter((inv) => inv.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="p-4 font-medium text-foreground">{inv.name}</td>
                          <td className="p-4">{inv.type}</td>
                          <td className="p-4">{inv.ticketSize}</td>
                          <td className="p-4">{inv.focus}</td>
                          <td className="p-4">
                            <Badge variant="outline">{inv.status}</Badge>
                          </td>
                          <td className="p-4">
                            <a href={inv.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center">
                              Visit <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'deals' && (
        <Card>
          <CardHeader>
            <CardTitle>Deals & Conversations</CardTitle>
            <CardDescription>Track individual conversations, win probabilities, and commitment status.</CardDescription>
          </CardHeader>
          <CardContent>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border border-b border-border">
                  {mockDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-muted/30">
                      <td className="p-4 font-medium text-foreground">{deal.investorName}</td>
                      <td className="p-4">{deal.roundName}</td>
                      <td className="p-4">
                        <span className="flex items-center">
                          <span className="mr-2 h-2 w-2 rounded-full bg-blue-500" />
                          {deal.stage}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-foreground">{deal.probability}%</td>
                      <td className="p-4">{formatCurrency(deal.expectedAmount)}</td>
                      <td className="p-4 text-green-600 dark:text-green-500 font-medium">
                        {deal.committedAmount > 0 ? formatCurrency(deal.committedAmount) : '-'}
                      </td>
                      <td className="p-4">{deal.lastContact}</td>
                      <td className="p-4">
                        <Badge className={`border-none ${deal.status === 'won'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          {deal.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
