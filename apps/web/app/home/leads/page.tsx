'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { FileUp, Loader2, Plus, Settings2 } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { CsvImportDialog } from '@kit/ui/csv-import-dialog';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
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
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { AddColumnModal } from '~/components/leads/add-column-modal';
import { ColumnEditModal } from '~/components/leads/column-edit-modal';
import { ColumnHeader } from '~/components/leads/column-header';
import { filterExportColumns } from '~/lib/field-permission';
import { useDebounce } from '~/lib/hooks/use-debounce';
import {
  type AccessType,
  type EntityField,
  type FieldAccessMember,
  useCreateField,
  useDynamicColumns,
  useUpdateField,
} from '~/lib/hooks/use-dynamic-columns';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import {
  useLeadsColumnPreferences,
  useSyncColumnVisibilityToDb,
} from '~/lib/hooks/use-leads-column-preferences';
import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { useLocalization } from '~/lib/localization/localization-provider';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import {
  getLeadStatusesService,
  getLeadsService,
} from '~/services/leads.service';
import { Lead } from '~/services/leads.service';
import { getMembersService } from '~/services/team-members.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import CreateLeadDialog from './components/create-lead-dialog';

// System fields that exist in the database
const SYSTEM_FIELDS: Array<{
  id: string;
  key: string;
  label: string;
  sortKey?: string;
  sortable?: boolean;
  width?: string;
}> = [
  { id: 'sno', key: 'sno', label: 'S. No.', sortable: false, width: 'w-12' },
  { id: 'name', key: 'name', label: 'Name', sortKey: 'first_name' },
  { id: 'first_name', key: 'first_name', label: 'First Name' },
  { id: 'last_name', key: 'last_name', label: 'Last Name' },
  { id: 'job_title', key: 'job_title', label: 'Job Title' },
  { id: 'email', key: 'email', label: 'Email' },
  { id: 'alt_email', key: 'alt_email', label: 'Alt Email' },
  { id: 'phone', key: 'phone', label: 'Phone', sortable: false },
  { id: 'mobile', key: 'mobile', label: 'Mobile', sortable: false },
  { id: 'company', key: 'company', label: 'Company', sortKey: 'company_name' },
  {
    id: 'company_website',
    key: 'company_website',
    label: 'Company Website',
    sortable: false,
  },
  {
    id: 'company_linkedin',
    key: 'company_linkedin',
    label: 'Company LinkedIn',
    sortable: false,
  },
  { id: 'linkedin', key: 'linkedin', label: 'LinkedIn', sortable: false },
  { id: 'department', key: 'department', label: 'Department' },
  {
    id: 'industry',
    key: 'industry',
    label: 'Industry',
    sortKey: 'industry.industry_name',
  },
  { id: 'company_size', key: 'company_size', label: 'Company Size' },
  { id: 'location', key: 'location', label: 'Location' },
  { id: 'timezone', key: 'timezone', label: 'Timezone', sortable: false },
  {
    id: 'status',
    key: 'status',
    label: 'Status',
    sortKey: 'status.status_name',
  },
  {
    id: 'source',
    key: 'source',
    label: 'Source',
    sortKey: 'source.source_name',
  },
  { id: 'trigger', key: 'trigger', label: 'Trigger' },
  { id: 'notes', key: 'notes', label: 'Notes', sortable: false },
  { id: 'score', key: 'score', label: 'Score', sortable: false },
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
];

// Default visibility for system fields
const DEFAULT_VISIBILITY: Record<string, boolean> = {
  sno: true,
  name: true,
  first_name: false,
  last_name: false,
  job_title: false,
  email: true,
  alt_email: false,
  phone: false,
  mobile: false,
  company: true,
  company_website: false,
  company_linkedin: false,
  linkedin: false,
  department: false,
  industry: false,
  company_size: false,
  location: false,
  timezone: false,
  status: true,
  source: false,
  trigger: false,
  notes: false,
  score: true,
  created_by: false,
  created_at: false,
  updated_by: true,
};

export default function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const productKey = useMemo(
    () => getModuleKeyFromPath(pathname ?? '/home/sales'),
    [pathname],
  );
  const { currentWorkspace: workspace, canAccess, user } = useRBAC();
  const { formatDate } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>(
    [],
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);

  const itemsPerPage = pageSize;
  const {
    dateRange: createdOnRange,
    setDateRange: setCreatedOnRange,
    computedDates: computedCreatedOnDates,
    clearDateRange: clearCreatedOnRange,
  } = useDateRangeFilter();
  const {
    dateRange: updatedOnRange,
    setDateRange: setUpdatedOnRange,
    computedDates: computedUpdatedOnDates,
    clearDateRange: clearUpdatedOnRange,
  } = useDateRangeFilter();

  const {
    canViewColumn,
    visibleCustomFields,
    ctx: fieldPermissionCtx,
    isLoading: fieldPermissionsLoading,
  } = useFieldPermissions({
    entityType: 'leads',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id && !!user?.id,
  });

  const { mergedDefaults, persistVisibility } = useLeadsColumnPreferences({
    entityType: 'leads',
    workspaceId: workspace?.id,
    userId: user?.id,
    defaultVisibility: DEFAULT_VISIBILITY,
    enabled: !!workspace?.id && !!user?.id,
  });

  // Fetch ALL entity fields (system + custom)
  const {
    fields: allEntityFields = [],
    isLoading: fieldsLoading,
    updateFieldAccess,
    deleteField,
    refetch: refetchEntityFields,
  } = useDynamicColumns({
    entityType: 'leads',
    workspaceId: workspace?.id,
    userId: user?.id,
    productKey,
    enabled: !!workspace?.id && !!user?.id,
  });
  const createField = useCreateField();
  const updateField = useUpdateField();

  // Custom fields filtered by FLS
  const customFields = visibleCustomFields;

  // State for editing any column's privacy settings
  const [editingField, setEditingField] = useState<EntityField | null>(null);

  // Look up entity_field record for a system field key
  const getEntityFieldByKey = (key: string): EntityField | null => {
    return allEntityFields.find((f) => f.field_key === key) ?? null;
  };

  const openColumnEdit = (fieldKey: string) => {
    const existing = getEntityFieldByKey(fieldKey);
    if (existing) {
      setEditingField(existing);
      return;
    }

    const systemField = SYSTEM_FIELDS.find(
      (field) => field.key === fieldKey || field.id === fieldKey,
    );
    if (!workspace?.id || !systemField) return;

    setEditingField({
      id: '',
      workspace_id: workspace.id,
      entity_type: 'leads',
      field_key: systemField.key,
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

  const trailingColumnCount = 1;

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    if (!workspace?.id || !user?.id) return false;
    const isOwner = workspace.owner_id === user.id;
    return (
      isOwner || canAccess('leads', 'admin') || canAccess('leads', 'update')
    );
  }, [workspace, user, canAccess]);

  // Check if user can add columns (admin, update, or create permission)
  const canAddColumn = useMemo(() => {
    if (!workspace?.id || !user?.id) return false;
    const isOwner = workspace.owner_id === user.id;
    return (
      isOwner ||
      canAccess('leads', 'admin') ||
      canAccess('leads', 'update') ||
      canAccess('leads', 'create')
    );
  }, [workspace, user, canAccess]);

  const activeFilterCount =
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedCreatedByIds.length > 0 ? 1 : 0) +
    (createdOnRange ? 1 : 0) +
    (updatedOnRange ? 1 : 0);

  // Build complete columns list (system + custom)
  const systemColumns = SYSTEM_FIELDS.map((f) => {
    const entityField = allEntityFields.find(
      (field) => field.field_key === f.key,
    );
    return {
      id: f.id,
      label: entityField?.field_label ?? f.label,
      required: true, // System fields are required
    };
  });

  const columns = [
    ...systemColumns,
    ...customFields.map((f) => ({
      id: f.field_key,
      label: f.field_label,
      required: false,
    })),
  ];

  // Import columns for CSV import
  const importColumns = useMemo(() => {
    const cols = [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'alt_email', label: 'Alt Email' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'mobile_number', label: 'Mobile' },
      { key: 'company_name', label: 'Company' },
      { key: 'company_website', label: 'Company Website' },
      { key: 'company_linkedin_url', label: 'Company LinkedIn' },
      { key: 'linkedin_url', label: 'LinkedIn' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'department', label: 'Department' },
      { key: 'industry_id', label: 'Industry' },
      { key: 'company_size', label: 'Company Size' },
      { key: 'location', label: 'Location' },
      { key: 'timezone', label: 'Timezone' },
      { key: 'status_id', label: 'Status', required: true },
      { key: 'source_id', label: 'Source' },
      { key: 'trigger', label: 'Trigger' },
      { key: 'notes', label: 'Notes' },
    ];
    return fieldPermissionCtx
      ? filterExportColumns(cols, fieldPermissionCtx)
      : cols;
  }, [fieldPermissionCtx]);

  // Initialize column visibility (merged with DB preferences when available)
  const { visibility, toggleVisibility, isVisible, reset, mergeNewColumns } =
    useColumnVisibility('leads', mergedDefaults);

  useSyncColumnVisibilityToDb(
    visibility,
    persistVisibility,
    !!workspace?.id && !!user?.id,
  );

  useEffect(() => {
    mergeNewColumns(mergedDefaults);
  }, [mergedDefaults, mergeNewColumns]);

  const showColumn = useCallback(
    (columnId: string) => isVisible(columnId) && canViewColumn(columnId),
    [isVisible, canViewColumn],
  );

  // Merge custom field visibility when they load
  useEffect(() => {
    if (customFields.length > 0) {
      mergeNewColumns(
        Object.fromEntries(customFields.map((cf) => [cf.field_key, true])),
      );
    }
  }, [customFields, mergeNewColumns]);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Column resize — widths persisted in localStorage: 'table-col-widths-leads'
  const { getHeaderProps, getResizeHandleProps } = useColumnResize('leads');

  // Table sorting
  const { sortColumn, sortDirection, toggleSort, sortState } =
    useTableSort<Lead>('leads', [], {
      mode: 'server',
      onSortChange: () => setCurrentPage(1),
      persistSort: false,
    });

  // Fetch team members
  const { data: membersData } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: () => getMembersService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });
  const members = (membersData?.data || []) as any[];

  // Fetch lead statuses
  const { data: statuses = [], isSuccess: isStatusesLoaded } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => getLeadStatusesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const defaultStatusIds = useMemo(() => {
    return statuses
      .filter((s: any) => s.status_key !== 'unqualified')
      .map((s: any) => s.id);
  }, [statuses]);

  // Fetch leads data
  const {
    data: leadsData = { data: [], count: 0, statusBreakdown: {} },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'leads',
      workspace?.id,
      currentPage,
      debouncedSearchTerm,
      selectedStatuses,
      selectedCreatedByIds,
      pageSize,
      sortState,
      computedCreatedOnDates,
      computedUpdatedOnDates,
      defaultStatusIds,
    ],
    queryFn: () =>
      getLeadsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: pageSize,
        searchTerm: debouncedSearchTerm,
        statusId: selectedStatuses.length > 0 ? selectedStatuses : defaultStatusIds,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
        updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
        updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
      }),
    enabled: !!workspace?.id && isStatusesLoaded,
  });

  const leads = leadsData.data;
  const totalCount = leadsData.count;

  // Client-side filter for created-by
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedCreatedByIds.length > 0) {
      result = result.filter((lead: Lead) =>
        selectedCreatedByIds.includes(lead.created_by ?? ''),
      );
    }
    return result;
  }, [leads, selectedCreatedByIds]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedStatuses,
    selectedCreatedByIds,
    pageSize,
    createdOnRange,
    updatedOnRange,
  ]);

  const paginatedLeads = filteredLeads;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

  // Handle update field (access type, permissions)
  const handleUpdateField = async (
    fieldId: string,
    updates: {
      field_label?: string;
      access_type?: AccessType;
      access_members?: FieldAccessMember[];
    },
  ) => {
    try {
      if (!fieldId && editingField) {
        await createField.mutateAsync({
          workspace_id: workspace?.id || '',
          entity_type: 'leads',
          product_key: productKey,
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
        setEditingField(null);
        refetchEntityFields();
        refetch();
        return;
      }

      if (updates.field_label !== undefined) {
        await updateField.mutateAsync({
          fieldId,
          updates: { field_label: updates.field_label },
        });
      }

      await updateFieldAccess.mutateAsync({
        fieldId,
        accessType: updates.access_type || 'public',
        members: updates.access_members,
      });
      refetchEntityFields();
      refetch();
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  // Handle delete field
  const handleDeleteField = async (fieldId: string) => {
    try {
      await deleteField.mutateAsync({ fieldId });
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  // Get system field config by key
  const getSystemFieldConfig = (key: string) => {
    return SYSTEM_FIELDS.find((f) => f.id === key);
  };

  if (error) {
    return (
      <ModuleGuard module="leads">
        <PageHeader title="Leads" description="Manage your sales leads" />
        <PageBody>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-red-500">Failed to load leads</p>
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
    <ModuleGuard module="leads">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Leads (${totalCount})`}
          description="Manage and track your sales leads"
        />
      </div>

      {/* Status filter dropdown + toolbar */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
        <ListToolBar
          showSearch
          searchPlaceholder="Search leads..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterGroups={[
            {
              key: 'status',
              label: 'Status',
              selectedValues: selectedStatuses,
              selectedLabel:
                selectedStatuses.length === 0
                  ? 'All statuses'
                  : selectedStatuses.length === 1
                    ? ((
                        statuses.find(
                          (s: any) => s.id === selectedStatuses[0],
                        ) as any
                      )?.status_name ?? '1 selected')
                    : `${selectedStatuses.length} selected`,
              options: statuses.map((s: any) => ({
                value: s.id,
                label: s.status_name,
                color: s.color,
                badge: s.status_key === 'unqualified' ? (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Closed
                  </span>
                ) : undefined,
              })),
              onSelectValues: setSelectedStatuses,
            },
            {
              key: 'created_by',
              label: 'Created By',
              selectedValues: selectedCreatedByIds,
              selectedLabel:
                selectedCreatedByIds.length === 0
                  ? 'All members'
                  : selectedCreatedByIds.length === 1
                    ? ((
                        members.find(
                          (m: any) => m.user_id === selectedCreatedByIds[0],
                        ) as any
                      )?.user?.user_metadata?.full_name ?? '1 selected')
                    : `${selectedCreatedByIds.length} selected`,
              options: members
                .filter((m: any) => m.user_id)
                .map((m: any) => ({
                  value: m.user_id,
                  label:
                    m.user?.user_metadata?.full_name ||
                    m.user?.email ||
                    m.user_id,
                })),
              onSelectValues: setSelectedCreatedByIds,
            },
            {
              key: 'created_on',
              label: 'Created On',
              type: 'date',
              dateValue: createdOnRange,
              onDateChange: (val) => {
                setCreatedOnRange(val);
                setCurrentPage(1);
              },
            },
            {
              key: 'updated_on',
              label: 'Updated On',
              type: 'date',
              dateValue: updatedOnRange,
              onDateChange: (val) => {
                setUpdatedOnRange(val);
                setCurrentPage(1);
              },
            },
          ]}
          activeFilterCount={activeFilterCount}
          onClearFilters={() => {
            setSelectedStatuses([]);
            setSelectedCreatedByIds([]);
            clearCreatedOnRange();
            clearUpdatedOnRange();
          }}
          actions={[
            // {
            //   key: 'import',
            //   label: 'Import',
            //   icon: FileUp,
            //   onClick: () => setIsImportDialogOpen(true),
            //   show: canAccess('leads', 'import'),
            //   buttonVariant: 'outline',
            // },
            {
              key: 'add',
              label: 'New Lead',
              icon: Plus,
              onClick: () => setIsCreateDialogOpen(true),
              show: canAccess('leads', 'create'),
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
                entityLabel="entries"
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="group">
                  {/* System columns */}
                  {SYSTEM_FIELDS.map((field) => {
                    if (!showColumn(field.id)) return null;
                    const config = getSystemFieldConfig(field.id);
                    return (
                      <ColumnHeader
                        key={field.id}
                        label={
                          getEntityFieldByKey(field.key)?.field_label ??
                          field.label
                        }
                        columnId={field.id}
                        sortKey={field.sortKey ?? null}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        sortable={config?.sortable !== false}
                        className={cn('relative', config?.width)}
                        isAdmin={canAddColumn}
                        field={getEntityFieldByKey(field.key)}
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

                  {/* Custom field columns with hover edit */}
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

                  {/* Add Column — last header column (replaces Actions header) */}
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
                {isLoading || fieldsLoading || fieldPermissionsLoading ? (
                  <>
                    {[...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          className="h-[52px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + trailingColumnCount
                              : 7
                          }
                        >
                          <Skeleton className="h-7 w-full rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibility
                          ? Object.values(visibility).filter((v) => v !== false)
                              .length + trailingColumnCount
                          : 7
                      }
                      className="h-24 text-center"
                    >
                      <div className="text-gray-500">
                        {searchTerm ||
                        selectedStatuses.length > 0 ||
                        selectedCreatedByIds.length > 0
                          ? 'No leads match your search'
                          : 'No leads yet. Create one to get started!'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead: Lead, index: number) => (
                    <TableRow
                      key={lead.id}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/home/sales/leads/${lead.id}`)
                      }
                    >
                      {/* System columns */}
                      {showColumn('sno') && (
                        <TableCell className="text-muted-foreground w-12">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                      )}
                      {showColumn('name') && (
                        <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                          <span>
                            {lead.first_name} {lead.last_name || ''}
                          </span>
                        </TableCell>
                      )}
                      {showColumn('first_name') && (
                        <TableCell>{lead.first_name || '-'}</TableCell>
                      )}
                      {showColumn('last_name') && (
                        <TableCell>{lead.last_name || '-'}</TableCell>
                      )}
                      {showColumn('job_title') && (
                        <TableCell>{lead.job_title || '-'}</TableCell>
                      )}
                      {showColumn('email') && (
                        <TableCell className="text-muted-foreground">
                          {lead.email || '-'}
                        </TableCell>
                      )}
                      {showColumn('alt_email') && (
                        <TableCell className="text-muted-foreground">
                          {lead.alt_email || '-'}
                        </TableCell>
                      )}
                      {showColumn('phone') && (
                        <TableCell>{lead.phone_number || '-'}</TableCell>
                      )}
                      {showColumn('mobile') && (
                        <TableCell>{lead.mobile_number || '-'}</TableCell>
                      )}
                      {showColumn('company') && (
                        <TableCell>{lead.company_name || '-'}</TableCell>
                      )}
                      {showColumn('company_website') && (
                        <TableCell>{lead.company_website || '-'}</TableCell>
                      )}
                      {showColumn('company_linkedin') && (
                        <TableCell className="max-w-[150px] truncate">
                          {lead.company_linkedin_url || '-'}
                        </TableCell>
                      )}
                      {showColumn('linkedin') && (
                        <TableCell className="max-w-[150px] truncate">
                          {lead.linkedin_url || '-'}
                        </TableCell>
                      )}
                      {showColumn('department') && (
                        <TableCell>{lead.department || '-'}</TableCell>
                      )}
                      {showColumn('industry') && (
                        <TableCell>
                          {lead.industry?.industry_name || '-'}
                        </TableCell>
                      )}
                      {showColumn('company_size') && (
                        <TableCell>{lead.company_size || '-'}</TableCell>
                      )}
                      {showColumn('location') && (
                        <TableCell>{lead.location || '-'}</TableCell>
                      )}
                      {showColumn('timezone') && (
                        <TableCell>{lead.timezone || '-'}</TableCell>
                      )}
                      {showColumn('status') && (
                        <TableCell>
                          {lead.status && (
                            <Badge
                              variant="secondary"
                              className="gap-1"
                              style={{
                                backgroundColor: `${lead.status.color}20`,
                                color: lead.status.color,
                                borderColor: `${lead.status.color}40`,
                              }}
                            >
                              {lead.status.status_name}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {showColumn('source') && (
                        <TableCell>{lead.source?.source_name || '-'}</TableCell>
                      )}
                      {showColumn('trigger') && (
                        <TableCell>{lead.trigger || '-'}</TableCell>
                      )}
                      {showColumn('notes') && (
                        <TableCell className="max-w-[200px] truncate">
                          {lead.notes || '-'}
                        </TableCell>
                      )}
                      {showColumn('score') && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className="bg-secondary h-2 w-16 overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    calculateLeadScore({
                                      first_name: lead.first_name,
                                      last_name: lead.last_name,
                                      company_name: lead.company_name,
                                      industry_id:
                                        lead.industry_id || lead.industry?.id,
                                      company_size: lead.company_size,
                                      location: lead.location,
                                      timezone: lead.timezone,
                                      job_title: lead.job_title,
                                      contacted_count: lead.contacted_count,
                                      status_key: lead.status?.status_key,
                                      custom_fields: lead.custom_fields || {},
                                      source_id: lead.source_id,
                                    }).totalScore,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="w-8 text-right text-sm">
                              {
                                calculateLeadScore({
                                  first_name: lead.first_name,
                                  last_name: lead.last_name,
                                  company_name: lead.company_name,
                                  industry_id:
                                    lead.industry_id || lead.industry?.id,
                                  company_size: lead.company_size,
                                  location: lead.location,
                                  timezone: lead.timezone,
                                  job_title: lead.job_title,
                                  contacted_count: lead.contacted_count,
                                  status_key: lead.status?.status_key,
                                  custom_fields: lead.custom_fields || {},
                                  source_id: lead.source_id,
                                }).totalScore
                              }
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {showColumn('created_by') && (
                        <TableCell>
                          {lead.created_by_account?.name ||
                            lead.created_by ||
                            '-'}
                        </TableCell>
                      )}
                      {showColumn('created_at') && (
                        <TableCell className="whitespace-nowrap">
                          {lead.created_at ? formatDate(lead.created_at) : '-'}
                        </TableCell>
                      )}
                      {showColumn('updated_by') && (
                        <TableCell>
                          {lead.updated_by_account?.name ||
                            lead.updated_by ||
                            '-'}
                        </TableCell>
                      )}

                      {/* Custom field cells */}
                      {customFields.map((field) =>
                        showColumn(field.field_key) ? (
                          <TableCell key={field.id}>
                            {(lead as any).custom_fields?.[field.field_key] ??
                              '-'}
                          </TableCell>
                        ) : null,
                      )}

                      {/* Actions */}
                      <TableCell className="bg-card sticky right-0 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EntityActionsDropdown
                            id={lead.id}
                            viewPath={`/home/sales/leads/${lead.id}`}
                            canDelete={canAccess('leads', 'delete')}
                            onDelete={() => {
                              setLeadToDelete(lead);
                              setDeleteDialogOpen(true);
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </div>

        {/* Create Lead Dialog */}
        <CreateLeadDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />

        <CsvImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          title="Import Leads from CSV"
          description="Upload a CSV, match each header to a database column, and save the adjusted file before the API upload step."
          columns={importColumns}
          onUpload={async ({ formData, file }) => {
            console.log('CSV ready for upload', {
              fileName: file.name,
              formData,
            });
          }}
        />

        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={leadToDelete?.id || ''}
          entityType="lead"
          entityName={`${leadToDelete?.first_name} ${leadToDelete?.last_name || ''}`}
          onSuccess={() => {
            setLeadToDelete(null);
            refetch();
          }}
        />

        {/* Add Column Modal */}
        <AddColumnModal
          open={addColumnModalOpen}
          onOpenChange={setAddColumnModalOpen}
          entityType="leads"
          productKey={productKey}
          workspaceId={workspace?.id || ''}
          onSuccess={() => {
            refetch();
          }}
        />

        {/* Column Edit Modal — opened from any column header edit button */}
        {editingField && (
          <ColumnEditModal
            open={!!editingField}
            onOpenChange={(open) => {
              if (!open) setEditingField(null);
            }}
            field={editingField}
            productKey={productKey}
            onSave={(updates, accessType, members) => {
              handleUpdateField(editingField.id, {
                ...updates,
                access_type: accessType,
                access_members: members,
              });
              setEditingField(null);
            }}
            onDelete={
              !editingField.is_system
                ? () => {
                    handleDeleteField(editingField.id);
                    setEditingField(null);
                  }
                : undefined
            }
          />
        )}
      </PageBody>
    </ModuleGuard>
  );
}
