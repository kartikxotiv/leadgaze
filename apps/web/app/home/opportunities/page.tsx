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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getOpportunitiesService, Opportunity } from '~/services/opportunities.service';

export default function OpportunitiesPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  const {
    data: opportunities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities', workspace.id],
    queryFn: () => getOpportunitiesService(workspace.id),
    enabled: !!workspace.id,
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
        opp.opportunity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.account?.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage =
        selectedStage === 'all' || opp.stage_id === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, selectedStage]);

  if (error) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <PageHeader title="Opportunities" description="Manage your sales pipeline">
        {/* Future: Add Create Opportunity button */}
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
                <Select
                  value={selectedStage}
                  onValueChange={setSelectedStage}
                >
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
            <CardContent className="p-0 pt-6">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-900">
                        Opportunity Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Account
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Stage
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 text-right">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Close Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Owner
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">
                        Actions
                      </TableHead>
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
                        <TableRow
                          key={opp.id}
                          className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                        >
                          <TableCell className="font-medium text-gray-900">
                            {/* Link to detail page coming soon */}
                            {opp.opportunity_name}
                          </TableCell>
                          <TableCell className="text-gray-600">
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
                                  borderColor: opp.stage.color,
                                }}
                              >
                                {opp.stage.status_name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-900 font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: opp.currency || 'USD',
                            }).format(opp.amount || 0)}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {opp.owner?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" asChild className="h-auto p-0 text-blue-600 hover:text-blue-700">
                              <Link href={`/home/opportunities/${opp.id}`}>View</Link>
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
    </>
  );
}
