'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { formatDate } from '@kit/shared/utils';
import { PageBody, PageHeader } from '@kit/ui/page';

import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import { ListToolBar } from '@kit/ui/list-toolbar';
import CustomTableContainer from '@kit/ui/custom-table-container';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  Opportunity,
  getOpportunitiesService,
  getOpportunityStatusesService,
} from '~/services/opportunities.service';
import { getMembersService } from '~/services/team-members.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { OpportunityDialog } from './components/opportunity-dialog';
import { TablePagination } from '@kit/ui/table-pagination';

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

function OpportunitiesPageSkeleton() {
  return (
    <ModuleGuard module="opportunities">
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-6 pb-0">
          <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                <Table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-12 whitespace-nowrap">S. No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="sticky right-0 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(12)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[52px] px-4 py-2" colSpan={8}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleGuard>
  );
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedCreatedId, setSelectedCreatedId] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] =
    useState<Opportunity | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;

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
      owner: true,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('opportunities');


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
      selectedCreatedId,
      pageSize,
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

  const { data: membersData } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: () => getMembersService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });
  const members = (membersData?.data || []) as any[];

  const totalCount = opportunitiesData.count;

  // Reset to first page when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStage, selectedCreatedId, pageSize]);

  // Client-side filtering for Created By if not supported by API
  const filteredOpportunities = useMemo(() => {
    let result = opportunitiesData.data;
    if (selectedCreatedId !== 'all') {
      result = result.filter(
        (opp: Opportunity) =>
          opp.created_by === selectedCreatedId ||
          opp.created_by_account?.id === selectedCreatedId,
      );
    }
    return result;
  }, [opportunitiesData.data, selectedCreatedId]);

  // Filter groups for ListToolBar
  const filterGroups = useMemo(() => {
    const stageOptions = stages.map((stage: any) => ({
      value: stage.id,
      label: stage.status_name,
      color: stage.color,
    }));

    const memberOptions = members
      .filter((m: any) => m.user_id)
      .map((member: any) => ({
        value: member.user_id,
        label:
          member.user?.user_metadata?.full_name ||
          member.user?.email ||
          member.user_id,
      }));

    return [
      {
        key: 'stage',
        label: 'Stage',
        selectedValue: selectedStage === 'all' ? '' : selectedStage,
        selectedLabel: selectedStage === 'all'
          ? 'All stages'
          : stages.find((s: any) => s.id === selectedStage)?.status_name,
        options: stageOptions,
        onSelect: (val: string) => setSelectedStage(val || 'all'),
      },
      {
        key: 'created_by',
        label: 'Created By',
        selectedValue: selectedCreatedId === 'all' ? '' : selectedCreatedId,
        selectedLabel: selectedCreatedId === 'all'
          ? 'All members'
          : (() => {
              const member = members.find((m) => m.user_id === selectedCreatedId);
              return (
                member?.user?.user_metadata?.full_name ||
                member?.user?.email ||
                selectedCreatedId
              );
            })(),
        options: memberOptions,
        onSelect: (val: string) => setSelectedCreatedId(val || 'all'),
      },
    ];
  }, [stages, selectedStage, members, selectedCreatedId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStage !== 'all') count++;
    if (selectedCreatedId !== 'all') count++;
    return count;
  }, [selectedStage, selectedCreatedId]);

  const handleClearFilters = () => {
    setSelectedStage('all');
    setSelectedCreatedId('all');
  };

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<Opportunity>(
    'opportunities',
    filteredOpportunities,
    { onSortChange: () => setCurrentPage(1) }
  );

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedOpportunities = sortedData;

  if (!workspace) {
    return <OpportunitiesPageSkeleton />;
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
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Opportunities (${totalCount})`}
          description="Manage your sales pipeline"
        />
      </div>

      {/* Full-width search / filter / actions toolbar */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
        <ListToolBar
          showSearch
          searchPlaceholder="Search by name or account..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterLabel="Show Filters"
          filterGroups={filterGroups}
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          actions={[
            {
              key: 'add',
              label: 'New Opportunity',
              icon: Plus,
              onClick: () => setIsCreateDialogOpen(true),
              show: canAccess('opportunities', 'create'),
              buttonVariant: 'default',
            },
          ]}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          }
        />
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <CustomTableContainer
            pagination={
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                entityLabel="opportunities"
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible('sno') && (
  <SortableTableHead
    label="S. No."
    columnId="sno"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    sortable={false}
    className="relative w-12 whitespace-nowrap"
    {...getHeaderProps('sno')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
  </SortableTableHead>
)}
                  {isVisible('name') && (
  <SortableTableHead
    label="Name"
    columnId="name"
    sortKey="opportunity_name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('name')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('name')} />
  </SortableTableHead>
)}
                  {isVisible('account') && (
  <SortableTableHead
    label="Account"
    columnId="account"
    sortKey="account.account_name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('account')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('account')} />
  </SortableTableHead>
)}
                  {isVisible('stage') && (
  <SortableTableHead
    label="Stage"
    columnId="stage"
    sortKey="stage.status_name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('stage')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('stage')} />
  </SortableTableHead>
)}
                  {isVisible('amount') && (
  <SortableTableHead
    label="Amount"
    columnId="amount"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('amount')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('amount')} />
  </SortableTableHead>
)}
                  {isVisible('currency') && (
  <SortableTableHead
    label="Currency"
    columnId="currency"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('currency')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('currency')} />
  </SortableTableHead>
)}
                  {isVisible('probability') && (
  <SortableTableHead
    label="Probability"
    columnId="probability"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('probability')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('probability')} />
  </SortableTableHead>
)}
                  {isVisible('close_date') && (
  <SortableTableHead
    label="Close Date"
    columnId="close_date"
    sortKey="expected_close_date"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('close_date')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('close_date')} />
  </SortableTableHead>
)}
                  {isVisible('priority') && (
  <SortableTableHead
    label="Priority"
    columnId="priority"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('priority')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('priority')} />
  </SortableTableHead>
)}
                  {isVisible('type') && (
  <SortableTableHead
    label="Type"
    columnId="type"
    sortKey="opportunity_type"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('type')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('type')} />
  </SortableTableHead>
)}
                  {isVisible('source') && (
  <SortableTableHead
    label="Source"
    columnId="source"
    sortKey="lead_source"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('source')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('source')} />
  </SortableTableHead>
)}
                  {isVisible('competitor') && (
  <SortableTableHead
    label="Competitor"
    columnId="competitor"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('competitor')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('competitor')} />
  </SortableTableHead>
)}
                  {isVisible('is_closed') && (
  <SortableTableHead
    label="Closed"
    columnId="is_closed"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('is_closed')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('is_closed')} />
  </SortableTableHead>
)}
                  {isVisible('is_won') && (
  <SortableTableHead
    label="Won"
    columnId="is_won"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('is_won')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('is_won')} />
  </SortableTableHead>
)}
                  {isVisible('owner') && (
  <SortableTableHead
    label="Owner"
    columnId="owner"
    sortKey="owner.name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('owner')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('owner')} />
  </SortableTableHead>
)}
                  {isVisible('created_by') && (
  <SortableTableHead
    label="Created By"
    columnId="created_by"
    sortKey="created_by_account.name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('created_by')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('created_by')} />
  </SortableTableHead>
)}
                  {isVisible('created_at') && (
  <SortableTableHead
    label="Created On"
    columnId="created_at"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('created_at')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('created_at')} />
  </SortableTableHead>
)}
                  {isVisible('updated_by') && (
  <SortableTableHead
    label="Last Updated By"
    columnId="updated_by"
    sortKey="updated_by_account.name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('updated_by')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('updated_by')} />
  </SortableTableHead>
)}
                  <TableHead className="sticky-right-header">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          className="h-[52px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + 1
                              : 7
                          }
                        >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
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
                            `/home/sales/opportunities/${opportunity.id}`,
                          )
                        }
                      >
                        {isVisible('sno') && (
                          <TableCell className="text-muted-foreground w-12">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                        )}
                        {isVisible('name') && (
                          <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
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
                              ? formatDate(opportunity.expected_close_date)
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
                              ? formatDate(opportunity.created_at)
                              : '-'}
                          </TableCell>
                        )}
                        {isVisible('updated_by') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.updated_by_account?.name ||
                              opportunity.updated_by ||
                              '-'}
                          </TableCell>
                        )}
                        <TableCell className="bg-card sticky right-0 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <EntityActionsDropdown
                              id={opportunity.id}
                              viewPath={`/home/sales/opportunities/${opportunity.id}`}
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
            </Table>
          </CustomTableContainer>
        </div>

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
      </PageBody>
    </ModuleGuard>
  );
}
