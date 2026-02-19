'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Filter, Plus, Search, Trash2 } from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  Opportunity,
  getOpportunitiesService,
  getOpportunityStatusesService,
} from '~/services/opportunities.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { OpportunityDialog } from './components/opportunity-dialog';

function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return (
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-red-600"
        >
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-600"
        >
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-600"
        >
          Low
        </Badge>
      );
    default:
      return <Badge variant="secondary">{priority || '-'}</Badge>;
  }
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] =
    useState<Opportunity | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { data: user } = useUser();

  const columns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'name', label: 'Name' },
      { id: 'account', label: 'Account' },
      { id: 'stage', label: 'Stage' },
      { id: 'amount', label: 'Amount' },
      { id: 'currency', label: 'Currency' },
      { id: 'probability', label: 'Probability' },
      { id: 'close_date', label: 'Close Date' },
      { id: 'priority', label: 'Priority' },
      { id: 'type', label: 'Type' },
      { id: 'source', label: 'Source' },
      { id: 'competitor', label: 'Competitor' },
      { id: 'is_closed', label: 'Closed' },
      { id: 'is_won', label: 'Won' },
      { id: 'close_reason', label: 'Close Reason' },
      { id: 'is_public', label: 'Public' },
      { id: 'owner', label: 'Owner' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('opportunities', {
      sno: true,
      name: true,
      account: true,
      stage: true,
      amount: true,
      currency: false,
      probability: false,
      close_date: true,
      priority: false,
      type: false,
      source: false,
      competitor: false,
      is_closed: false,
      is_won: false,
      close_reason: false,
      is_public: false,
      owner: true,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    data: opportunitiesData = {
      data: [],
      count: 0,
      totalAmount: 0,
      stageBreakdown: {},
    },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'opportunities',
      workspace?.id,
      currentPage,
      debouncedSearchTerm,
      selectedStage,
    ],
    queryFn: () =>
      getOpportunitiesService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        stageId: selectedStage,
      }),
    enabled: !!workspace?.id,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['opportunity-stages', workspace?.id],
    queryFn: () => getOpportunityStatusesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const opportunities = opportunitiesData.data;
  const totalCount = opportunitiesData.count;

  // Reset to first page when search or stage changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStage]);

  // No longer needed: deriving stages from current page leads to incomplete filters
  const availableStages: any[] = [];

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedOpportunities = opportunities; // Data is already paginated from server

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
      <div className="flex h-[100dvh] flex-col">
        <div className="bg-sidebar flex shrink-0 flex-col gap-2">
          <PageHeader
            className="bg-sidebar px-6 py-4"
            title={`Opportunities (${totalCount})`}
            description="Manage your sales pipeline"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-64 lg:w-72">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or account..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-10"
                />
              </div>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="h-9 w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((stage: any) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.status_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canAccess('opportunities', 'create') && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Opportunity
                </Button>
              )}

              <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>

          {/* Pipeline Summary Cards */}
          <div className="bg-sidebar px-6 pb-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <Card
                className={`hover:border-primary/50 bg-card cursor-pointer transition-all ${selectedStage === 'all' ? 'border-primary ring-primary ring-1' : ''}`}
                onClick={() => setSelectedStage('all')}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      All Opportunities ({totalCount})
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        }).format(opportunitiesData.totalAmount || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stages.map((stage: any) => {
                const stats = opportunitiesData.stageBreakdown[stage.id] || {
                  total_amount: 0,
                  count: 0,
                };
                const isSelected =
                  selectedStage === 'all' || selectedStage === stage.id;
                const displayCount = isSelected ? stats.count : 0;
                const displayAmount = isSelected ? stats.total_amount : 0;

                return (
                  <Card
                    key={stage.id}
                    className={`hover:border-primary/50 bg-card cursor-pointer transition-all ${selectedStage === stage.id ? 'border-primary ring-primary ring-1' : ''}`}
                    onClick={() => setSelectedStage(stage.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-muted-foreground truncate text-[10px] font-medium tracking-wider uppercase">
                            {stage.status_name} ({displayCount})
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }).format(displayAmount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <PageBody className="bg-sidebar sticky flex min-h-0 flex-1 flex-col overflow-hidden pt-6 pb-6">
          <div className="flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="flex-1 overflow-auto rounded-lg">
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        {isVisible('sno') && (
                          <TableHead className="w-12 whitespace-nowrap">
                            S. No.
                          </TableHead>
                        )}
                        {isVisible('name') && <TableHead>Name</TableHead>}
                        {isVisible('account') && <TableHead>Account</TableHead>}
                        {isVisible('stage') && <TableHead>Stage</TableHead>}
                        {isVisible('amount') && <TableHead>Amount</TableHead>}
                        {isVisible('currency') && (
                          <TableHead>Currency</TableHead>
                        )}
                        {isVisible('probability') && (
                          <TableHead>Probability</TableHead>
                        )}
                        {isVisible('close_date') && (
                          <TableHead>Close Date</TableHead>
                        )}
                        {isVisible('priority') && (
                          <TableHead>Priority</TableHead>
                        )}
                        {isVisible('type') && <TableHead>Type</TableHead>}
                        {isVisible('source') && <TableHead>Source</TableHead>}
                        {isVisible('competitor') && (
                          <TableHead>Competitor</TableHead>
                        )}
                        {isVisible('is_closed') && (
                          <TableHead>Closed</TableHead>
                        )}
                        {isVisible('is_won') && <TableHead>Won</TableHead>}
                        {isVisible('close_reason') && (
                          <TableHead>Close Reason</TableHead>
                        )}
                        {isVisible('is_public') && (
                          <TableHead>Public</TableHead>
                        )}
                        {isVisible('owner') && <TableHead>Owner</TableHead>}
                        {isVisible('created_by') && (
                          <TableHead>Created By</TableHead>
                        )}
                        {isVisible('created_at') && (
                          <TableHead>Created On</TableHead>
                        )}
                        {isVisible('updated_by') && (
                          <TableHead>Last Updated By</TableHead>
                        )}
                        <TableHead className="bg-card sticky right-0 px-4 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
                                : 7
                            }
                            className="h-24 text-center"
                          >
                            <div className="flex items-center justify-center">
                              <div className="text-gray-500">
                                Loading opportunities...
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedOpportunities.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
                                : 7
                            }
                            className="h-24 text-center"
                          >
                            <div className="text-gray-500">
                              {searchTerm
                                ? 'No opportunities match your search'
                                : 'No opportunities yet.'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedOpportunities.map(
                          (opportunity: Opportunity, index: number) => (
                            <TableRow
                              key={opportunity.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/home/opportunities/${opportunity.id}`,
                                )
                              }
                            >
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('name') && (
                                <TableCell className="font-medium">
                                  <span>{opportunity.opportunity_name}</span>
                                </TableCell>
                              )}
                              {isVisible('account') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.account?.account_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('stage') && (
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    style={{
                                      borderColor: opportunity.stage?.color,
                                      color: opportunity.stage?.color,
                                      backgroundColor: `${opportunity.stage?.color}15`,
                                    }}
                                  >
                                    {opportunity.stage?.status_name}
                                  </Badge>
                                </TableCell>
                              )}
                              {isVisible('amount') && (
                                <TableCell className="text-muted-foreground">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: opportunity.currency || 'USD',
                                    maximumFractionDigits: 0,
                                  }).format(opportunity.amount || 0)}
                                </TableCell>
                              )}
                              {isVisible('currency') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.currency || '-'}
                                </TableCell>
                              )}
                              {isVisible('probability') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.probability
                                    ? `${opportunity.probability}%`
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('close_date') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.expected_close_date
                                    ? new Date(
                                        opportunity.expected_close_date,
                                      ).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('priority') && (
                                <TableCell className="text-muted-foreground">
                                  <PriorityBadge
                                    priority={opportunity.priority}
                                  />
                                </TableCell>
                              )}
                              {isVisible('type') && (
                                <TableCell className="text-muted-foreground capitalize">
                                  {opportunity.opportunity_type?.replace(
                                    '_',
                                    ' ',
                                  ) || '-'}
                                </TableCell>
                              )}
                              {isVisible('source') && (
                                <TableCell className="text-muted-foreground capitalize">
                                  {opportunity.lead_source?.replace('_', ' ') ||
                                    '-'}
                                </TableCell>
                              )}
                              {isVisible('competitor') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.competitor || '-'}
                                </TableCell>
                              )}
                              {isVisible('is_closed') && (
                                <TableCell className="text-muted-foreground text-center">
                                  {opportunity.is_closed ? 'Yes' : 'No'}
                                </TableCell>
                              )}
                              {isVisible('is_won') && (
                                <TableCell className="text-muted-foreground text-center">
                                  {opportunity.is_won ? 'Yes' : 'No'}
                                </TableCell>
                              )}
                              {isVisible('close_reason') && (
                                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                  {opportunity.close_reason || '-'}
                                </TableCell>
                              )}
                              {isVisible('is_public') && (
                                <TableCell className="text-muted-foreground text-center">
                                  {opportunity.is_public ? (
                                    <Badge
                                      variant="outline"
                                      className="border-green-200 bg-green-50 text-green-600"
                                    >
                                      Public
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-200 bg-amber-50 text-amber-600"
                                    >
                                      Private
                                    </Badge>
                                  )}
                                </TableCell>
                              )}
                              {isVisible('owner') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.owner?.name || '-'}
                                </TableCell>
                              )}
                              {isVisible('created_by') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.created_by_account?.name ||
                                    opportunity.created_by ||
                                    '-'}
                                </TableCell>
                              )}
                              {isVisible('created_at') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.created_at
                                    ? new Date(
                                        opportunity.created_at,
                                      ).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('updated_by') && (
                                <TableCell className="text-muted-foreground">
                                  {opportunity.updated_by || '-'}
                                </TableCell>
                              )}
                              <TableCell className="bg-card sticky right-0 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <EntityActionsDropdown
                                    id={opportunity.id}
                                    viewPath={`/home/opportunities/${opportunity.id}`}
                                    canDelete={canAccess(
                                      'opportunities',
                                      'delete',
                                    )}
                                    onDelete={() => {
                                      setOpportunityToDelete(opportunity);
                                      setDeleteDialogOpen(true);
                                    }}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ),
                        )
                      )}
                    </TableBody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {totalCount > 0 && (
              <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 flex items-center justify-between border-t p-4 px-6">
                <div>
                  Showing{' '}
                  <span className="text-foreground font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="text-foreground font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{' '}
                  of{' '}
                  <span className="text-foreground font-medium">
                    {totalCount}
                  </span>{' '}
                  opportunities
                </div>
                <Pagination className="w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        className={
                          currentPage === 1
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        className={
                          currentPage === totalPages
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            <OpportunityDialog
              isOpen={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            />

            <DeleteEntityDialog
              isOpen={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              entityId={opportunityToDelete?.id || ''}
              entityType="opportunity"
              entityName={opportunityToDelete?.opportunity_name || ''}
              onSuccess={() => {
                setOpportunityToDelete(null);
                refetch();
              }}
            />
          </div>
        </PageBody>
      </div>
    </ModuleGuard>
  );
}
