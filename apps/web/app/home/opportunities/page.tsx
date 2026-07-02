'use client';

import React, { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
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
import { TablePagination } from '@kit/ui/table-pagination';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { AddColumnModal } from '@kit/ui/add-column-modal';
import { ColumnEditModal } from '@kit/ui/column-edit-modal';
import type { ColumnEditFieldShape } from '@kit/ui/column-edit-modal';
import { ColumnHeader } from '@kit/ui/column-header';
import { useDebounce } from '~/lib/hooks/use-debounce';
import {
  useCreateField,
  useDynamicColumns,
  useUpdateField,
} from '~/lib/hooks/use-dynamic-columns';
import type { AccessType, EntityField } from '~/lib/hooks/use-dynamic-columns';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import {
  useLeadsColumnPreferences,
  useSyncColumnVisibilityToDb,
} from '~/lib/hooks/use-leads-column-preferences';
import { useLocalization } from '~/lib/localization/localization-provider';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useModuleRoles, useRBAC } from '~/lib/rbac/rbac-provider';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import {
  Opportunity,
  getOpportunitiesService,
  getOpportunityStatusesService,
} from '~/services/opportunities.service';
import { getMembersService } from '~/services/team-members.service';

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
                      <TableHead className="w-12 whitespace-nowrap">
                        S. No.
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="sticky right-0 text-right">
                        Actions
                      </TableHead>
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
  const { currentWorkspace: workspace, user, canAccess } = useRBAC();
  const { formatDate, formatCurrency } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedCreatedId, setSelectedCreatedId] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] =
    useState<Opportunity | null>(null);
  const [editingField, setEditingField] = useState<EntityField | null>(null);
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;

  const SYSTEM_FIELDS = useMemo(
    () => [
      {
        id: 'sno',
        key: 'sno',
        label: 'S. No.',
        sortable: false,
        width: 'w-12',
      },
      { id: 'name', key: 'name', label: 'Name', sortKey: 'opportunity_name' },
      {
        id: 'account',
        key: 'account',
        label: 'Account',
        sortKey: 'account.account_name',
      },
      {
        id: 'stage',
        key: 'stage',
        label: 'Stage',
        sortKey: 'stage.status_name',
      },
      { id: 'amount', key: 'amount', label: 'Amount' },
      { id: 'currency', key: 'currency', label: 'Currency' },
      { id: 'probability', key: 'probability', label: 'Probability' },
      {
        id: 'close_date',
        key: 'close_date',
        label: 'Close Date',
        sortKey: 'expected_close_date',
      },
      { id: 'priority', key: 'priority', label: 'Priority' },
      { id: 'type', key: 'type', label: 'Type', sortKey: 'opportunity_type' },
      { id: 'source', key: 'source', label: 'Source', sortKey: 'lead_source' },
      { id: 'competitor', key: 'competitor', label: 'Competitor' },
      { id: 'is_closed', key: 'is_closed', label: 'Closed' },
      { id: 'is_won', key: 'is_won', label: 'Won' },
      { id: 'owner', key: 'owner', label: 'Owner', sortKey: 'owner.name' },
      {
        id: 'created_by',
        key: 'created_by',
        label: 'Created By',
        sortKey: 'created_by_account.name',
      },
      { id: 'created_at', key: 'created_at', label: 'Created On' },
      {
        id: 'updated_by',
        key: 'updated_by',
        label: 'Last Updated By',
        sortKey: 'updated_by_account.name',
      },
    ],
    [],
  );

  const {
    canViewColumn,
    visibleCustomFields,
    ctx: _fieldPermissionCtx,
    isLoading: _fieldPermissionsLoading,
  } = useFieldPermissions({
    entityType: 'opportunities',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id && !!user?.id,
  });

  const { mergedDefaults, persistVisibility } = useLeadsColumnPreferences({
    entityType: 'opportunities',
    workspaceId: workspace?.id,
    userId: user?.id,
    defaultVisibility: {
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
    },
    enabled: !!workspace?.id && !!user?.id,
  });

  const {
    fields: allEntityFields = [],
    isLoading: _fieldsLoading,
    updateFieldAccess,
    deleteField,
    refetch: refetchEntityFields,
  } = useDynamicColumns({
    entityType: 'opportunities',
    workspaceId: workspace?.id,
    userId: user?.id,
    productKey: 'sales',
    enabled: !!workspace?.id && !!user?.id,
  });
  const createField = useCreateField();
  const updateField = useUpdateField();

  const customFields = visibleCustomFields;

  const getEntityFieldByKey = (key: string): EntityField | null =>
    allEntityFields.find((f) => f.field_key === key) ?? null;

  const systemColumns = SYSTEM_FIELDS.map((field) => {
    const entityField = allEntityFields.find((f) => f.field_key === field.key);
    return {
      id: field.id,
      label: entityField?.field_label ?? field.label,
      required: true,
    };
  });

  const columns = [
    ...systemColumns,
    ...customFields.map((field) => ({
      id: field.field_key,
      label: field.field_label,
      required: false,
    })),
  ];

  const { visibility, toggleVisibility, isVisible, reset, mergeNewColumns } =
    useColumnVisibility('opportunities', mergedDefaults);

  useSyncColumnVisibilityToDb(
    visibility,
    persistVisibility,
    !!workspace?.id && !!user?.id,
  );

  React.useEffect(() => {
    mergeNewColumns(
      Object.fromEntries(customFields.map((cf) => [cf.field_key, true])),
    );
  }, [customFields, mergeNewColumns]);

  const showColumn = useMemo(
    () => (columnId: string) => isVisible(columnId) && canViewColumn(columnId),
    [isVisible, canViewColumn],
  );

  const openColumnEdit = (fieldKey: string) => {
    const existing = getEntityFieldByKey(fieldKey);
    if (existing) {
      setEditingField(existing);
      return;
    }

    const systemField = SYSTEM_FIELDS.find((field) => field.key === fieldKey);
    if (!workspace?.id || !systemField) return;

    setEditingField({
      id: '',
      workspace_id: workspace.id,
      entity_type: 'opportunities',
      field_key: fieldKey,
      field_label: systemField.label,
      field_type: 'text',
      description: null,
      is_system: true,
      is_required: false,
      is_active: true,
      display_order: 0,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as EntityField);
  };

  const renderCustomFieldValue = (value: unknown) => {
    if (value === undefined || value === null) {
      return '-';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '-';
      }
    }
    return String(value);
  };

  const canAddColumn = useMemo(() => {
    if (!workspace?.id || !user?.id) return false;
    const isOwner = workspace.owner_id === user.id;
    return (
      isOwner ||
      canAccess('opportunities', 'admin') ||
      canAccess('opportunities', 'update') ||
      canAccess('opportunities', 'create')
    );
  }, [workspace, user?.id, canAccess]);

  const handleUpdateField = async (
    fieldId: string,
    updates: {
      field_label?: string;
      access_type?: AccessType;
      access_members?: {
        member_type: 'role' | 'user';
        member_id: string;
        can_view: boolean;
        can_edit: boolean;
      }[];
    },
  ) => {
    try {
      console.debug('handleUpdateField called', { fieldId, updates });
      if (!fieldId && editingField) {
        await createField.mutateAsync({
          workspace_id: workspace?.id || '',
          entity_type: 'opportunities',
          product_key: 'sales',
          field_key: editingField.field_key,
          field_label:
            updates.field_label !== undefined
              ? updates.field_label
              : editingField.field_label,
          field_type: editingField.field_type || 'text',
          description: editingField.description ?? '',
          is_required: editingField.is_required,
          is_system: true,
          settings: editingField.settings || {},
          access_type: updates.access_type || 'public',
          access_members: updates.access_members,
        });
        console.debug('created field via createField for system field');
        setEditingField(null);
        refetchEntityFields();
        refetch();
        return;
      }

      if (updates.field_label !== undefined) {
        const res = await updateField.mutateAsync({
          fieldId,
          updates: {
            field_label: updates.field_label,
          },
        });
        console.debug('updateField result', res);
      }

      await updateFieldAccess.mutateAsync({
        fieldId,
        accessType: updates.access_type || 'public',
        members: updates.access_members,
      });
      setEditingField(null);
      refetchEntityFields();
      refetch();
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await deleteField.mutateAsync({ fieldId });
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const { getHeaderProps, getResizeHandleProps } =
    useColumnResize('opportunities');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { sortColumn, sortDirection, toggleSort, sortState } =
    useTableSort<Opportunity>('opportunities', [], {
      mode: 'server',
      onSortChange: () => setCurrentPage(1),
    });

  // Fetch roles and team members for ColumnEditModal (FLS configuration)
  const { data: moduleRoles = [] } = useModuleRoles('sales');
  const { data: teamMembersData } = useTeamMembers({
    workspaceId: workspace?.id,
    productKey: 'sales',
    enabled: !!workspace?.id,
  });
  const teamMembersForModal = teamMembersData?.data ?? [];

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
      sortState,
    ],
    queryFn: () =>
      getOpportunitiesService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        stageId: selectedStage,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
      }),
    enabled: !!workspace?.id,
  });

  const { data: stages = [] } = useQuery<
    Array<{ id: string; status_name: string; color?: string }>
  >({
    queryKey: ['opportunity-stages', workspace?.id],
    queryFn: () => getOpportunityStatusesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const { data: membersData } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: () => getMembersService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });
  const members = useMemo(
    () =>
      (membersData?.data || []) as Array<{
        user_id?: string;
        user?: {
          user_metadata?: { full_name?: string } | null;
          email?: string | null;
        };
      }>,
    [membersData],
  );

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
    const stageOptions: Array<{
      value: string;
      label: string;
      color?: string;
    }> = stages.map((stage) => ({
      value: stage.id,
      label: stage.status_name,
      color: stage.color,
    }));

    const memberOptions: Array<{ value: string; label: string }> = members
      .filter(
        (
          m,
        ): m is {
          user_id: string;
          user?: {
            user_metadata?: { full_name?: string } | null;
            email?: string | null;
          };
        } => Boolean(m.user_id),
      )
      .map((member) => ({
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
        selectedLabel:
          selectedStage === 'all'
            ? 'All stages'
            : stages.find((s) => s.id === selectedStage)?.status_name,
        options: stageOptions,
        onSelect: (val: string) => setSelectedStage(val || 'all'),
      },
      {
        key: 'created_by',
        label: 'Created By',
        selectedValue: selectedCreatedId === 'all' ? '' : selectedCreatedId,
        selectedLabel:
          selectedCreatedId === 'all'
            ? 'All members'
            : (() => {
                const member = members.find(
                  (m) => m.user_id === selectedCreatedId,
                );
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

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedOpportunities = filteredOpportunities;

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
                <TableRow className="group">
                  {SYSTEM_FIELDS.map((field) => {
                    if (!showColumn(field.id)) return null;
                    const entityField = getEntityFieldByKey(field.key);
                    return (
                      <ColumnHeader
                        key={field.id}
                        label={entityField?.field_label ?? field.label}
                        columnId={field.id}
                        sortKey={field.sortKey ?? null}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        sortable={field.sortable !== false}
                        className={cn('relative', field.width)}
                        isAdmin={canAddColumn}
                        field={entityField}
                        onEditClick={
                          canAddColumn
                            ? () => openColumnEdit(field.key)
                            : undefined
                        }
                        {...getHeaderProps(field.id)}
                      >
                        <span
                          className="col-resize-handle"
                          {...getResizeHandleProps(field.id)}
                        />
                      </ColumnHeader>
                    );
                  })}

                  {customFields.map((field) => {
                    if (!showColumn(field.field_key)) return null;
                    return (
                      <ColumnHeader
                        key={field.id}
                        columnId={field.field_key}
                        label={field.field_label}
                        field={field}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        sortable={true}
                        isAdmin={canAddColumn}
                        onEditClick={
                          canAddColumn
                            ? () => openColumnEdit(field.field_key)
                            : undefined
                        }
                        onDeleteField={
                          canAddColumn && !field.is_system
                            ? handleDeleteField
                            : undefined
                        }
                        {...getHeaderProps(field.field_key)}
                      >
                        <span
                          className="col-resize-handle"
                          {...getResizeHandleProps(field.field_key)}
                        />
                      </ColumnHeader>
                    );
                  })}

                  {canAddColumn ? (
                    <TableHead className="sticky-right-header bg-background z-10 w-12 px-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex h-8 w-full items-center justify-center gap-1 border-dashed text-xs font-medium"
                        onClick={() => setAddColumnModalOpen(true)}
                        title="Add Column"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add</span>
                      </Button>
                    </TableHead>
                  ) : (
                    <TableHead className="sticky-right-header bg-background z-10 w-12" />
                  )}
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
                          ? Object.values(visibility).filter((v) => v !== false)
                              .length + 1
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
                        className="group hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/home/sales/opportunities/${opportunity.id}`,
                          )
                        }
                      >
                        {showColumn('sno') && (
                          <TableCell className="text-muted-foreground w-12">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                        )}
                        {showColumn('name') && (
                          <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                            <span>{opportunity.opportunity_name}</span>
                          </TableCell>
                        )}
                        {showColumn('account') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.account?.account_name || '-'}
                          </TableCell>
                        )}
                        {showColumn('stage') && (
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
                        {showColumn('amount') && (
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(
                              opportunity.amount || 0,
                              opportunity.currency || 'USD',
                            )}
                          </TableCell>
                        )}
                        {showColumn('currency') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.currency || '-'}
                          </TableCell>
                        )}
                        {showColumn('probability') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.probability
                              ? `${opportunity.probability}%`
                              : '-'}
                          </TableCell>
                        )}
                        {showColumn('close_date') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.expected_close_date
                              ? formatDate(opportunity.expected_close_date)
                              : '-'}
                          </TableCell>
                        )}
                        {showColumn('priority') && (
                          <TableCell className="text-muted-foreground">
                            <PriorityBadge priority={opportunity.priority} />
                          </TableCell>
                        )}
                        {showColumn('type') && (
                          <TableCell className="text-muted-foreground capitalize">
                            {opportunity.opportunity_type?.replace('_', ' ') ||
                              '-'}
                          </TableCell>
                        )}
                        {showColumn('source') && (
                          <TableCell className="text-muted-foreground capitalize">
                            {opportunity.lead_source?.replace('_', ' ') || '-'}
                          </TableCell>
                        )}
                        {showColumn('competitor') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.competitor || '-'}
                          </TableCell>
                        )}
                        {showColumn('is_closed') && (
                          <TableCell className="text-muted-foreground text-center">
                            {opportunity.is_closed ? 'Yes' : 'No'}
                          </TableCell>
                        )}
                        {showColumn('is_won') && (
                          <TableCell className="text-muted-foreground text-center">
                            {opportunity.is_won ? 'Yes' : 'No'}
                          </TableCell>
                        )}
                        {showColumn('owner') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.owner?.name || '-'}
                          </TableCell>
                        )}
                        {showColumn('created_by') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.created_by_account?.name ||
                              opportunity.created_by ||
                              '-'}
                          </TableCell>
                        )}
                        {showColumn('created_at') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.created_at
                              ? formatDate(opportunity.created_at)
                              : '-'}
                          </TableCell>
                        )}
                        {showColumn('updated_by') && (
                          <TableCell className="text-muted-foreground">
                            {opportunity.updated_by_account?.name ||
                              opportunity.updated_by ||
                              '-'}
                          </TableCell>
                        )}

                        {customFields.map((field) =>
                          showColumn(field.field_key) ? (
                            <TableCell key={field.id}>
                              {renderCustomFieldValue(
                                (
                                  opportunity as {
                                    custom_fields?: Record<string, unknown>;
                                  }
                                ).custom_fields?.[field.field_key],
                              )}
                            </TableCell>
                          ) : null,
                        )}

                        <TableCell className="bg-card group sticky right-0 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <EntityActionsDropdown
                              id={opportunity.id}
                              viewPath={`/home/sales/opportunities/${opportunity.id}`}
                              canDelete={canAccess('opportunities', 'delete')}
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

        <AddColumnModal
          open={addColumnModalOpen}
          onOpenChange={setAddColumnModalOpen}
          entityType="opportunities"
          roles={moduleRoles}
          teamMembers={teamMembersForModal}
          isAdmin={canAddColumn}
          isSubmitting={createField.isPending}
          onSubmit={async (payload) => {
            await createField.mutateAsync({
              ...payload,
              workspace_id: workspace?.id || '',
              product_key: 'sales',
              entity_type: 'opportunities',
            });
            refetchEntityFields();
            refetch();
          }}
        />

        <ColumnEditModal
          open={Boolean(editingField)}
          onOpenChange={(open) => {
            if (!open) setEditingField(null);
          }}
          field={
            (editingField ??
            ({
              id: '',
              field_key: '',
              field_label: '',
              is_system: false,
              workspace_id: workspace?.id || '',
            } as EntityField)) as ColumnEditFieldShape
          }
          roles={moduleRoles}
          teamMembers={teamMembersForModal}
          onSave={(updates, accessType, members) =>
            handleUpdateField(editingField?.id || '', {
              ...updates,
              access_type: accessType,
              access_members: members,
            })
          }
          onDelete={handleDeleteField}
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
