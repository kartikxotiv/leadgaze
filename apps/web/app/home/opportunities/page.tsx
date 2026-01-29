'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Filter, Plus, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  Opportunity,
  getOpportunitiesService,
} from '~/services/opportunities.service';

import { OpportunityDialog } from './components/opportunity-dialog';

export default function OpportunitiesPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const {
    data: opportunities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities', workspace?.id],
    queryFn: () => getOpportunitiesService(workspace!.id),
    enabled: !!workspace?.id,
  });

  // Get unique stages for filter dropdown
  const availableStages = useMemo(() => {
    const stages = new Map();
    opportunities?.forEach((opp: Opportunity) => {
      if (opp.stage && !stages.has(opp.stage.id)) {
        stages.set(opp.stage.id, opp.stage);
      }
    });
    return Array.from(stages.values());
  }, [opportunities]);

  // Filter and search
  const filteredOpportunities = useMemo(() => {
    return opportunities?.filter((opp: Opportunity) => {
      const matchesSearch =
        opp.opportunity_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        opp.account?.account_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStage =
        selectedStage === 'all' || opp.stage_id === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, selectedStage]);

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ModuleGuard module="opportunities">
        <PageHeader title="Opportunities" description="Manage your deals" />
        <PageBody>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-red-500">Failed to load opportunities</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageBody>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="opportunities">
      <PageHeader
        title="Opportunities"
        description="Manage your sales pipeline"
      >
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Opportunity
        </Button>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or account..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {availableStages.map((stage: any) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.status_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Opportunity Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading opportunities...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredOpportunities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm || selectedStage !== 'all'
                              ? 'No opportunities match your filters'
                              : 'No opportunities yet.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOpportunities.map((opp: Opportunity) => (
                        <TableRow key={opp.id}>
                          <TableCell className="font-medium">
                            {/* Link to detail page coming soon */}
                            {opp.opportunity_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {opp.account?.account_name || '-'}
                          </TableCell>
                          <TableCell>
                            {opp.stage && (
                              <Badge
                                variant="secondary"
                                className="gap-1"
                                style={{
                                  backgroundColor: `${opp.stage.color}20`,
                                  color: opp.stage.color,
                                  borderColor: `${opp.stage.color}40`,
                                }}
                              >
                                {opp.stage.status_name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: opp.currency || 'USD',
                            }).format(opp.amount || 0)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {opp.expected_close_date
                              ? new Date(
                                  opp.expected_close_date,
                                ).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {opp.owner?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="link"
                              asChild
                              className="text-primary h-auto p-0 hover:underline"
                            >
                              <Link href={`/home/opportunities/${opp.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>

      <OpportunityDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </ModuleGuard>
  );
}
