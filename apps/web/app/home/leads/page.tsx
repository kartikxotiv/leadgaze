'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, FileUp, Loader2, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { AddColumnModal } from '@kit/ui/add-column-modal';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import { ColumnEditModal } from '@kit/ui/column-edit-modal';
import type { ColumnEditFieldShape } from '@kit/ui/column-edit-modal';
import { ColumnHeader } from '@kit/ui/column-header';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { CsvExportButton } from '@kit/ui/csv-export-button';
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
import { useCsvExport } from '@kit/ui/use-csv-export';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { filterExportColumns, filterImportColumns } from '~/lib/field-permission';
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
import { usePackageMembers } from '~/lib/hooks/use-package-members';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { useLocalization } from '~/lib/localization/localization-provider';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useModuleRoles, useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import {
  getLeadStatusesService,
  getLeadsService,
  updateLeadService,
  importLeadsService,
} from '~/services/leads.service';
import { Lead } from '~/services/leads.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { LeadsKanbanBoard } from './components/kanban/leads-kanban-board';
import CreateLeadDialog from './components/create-lead-dialog';
import { ViewToggle, type ViewMode } from '@kit/ui/view-toggle';

// System fields that exist in the database
const SYSTEM_FIELDS: Array<{
  id: string;
  key: string;
  label: string;
  sortKey?: string;
  sortable?: boolean;
  width?: string;
  minWidth?: number;
}> = [
    { id: 'sno', key: 'sno', label: 'S. No.', sortable: false, width: 'w-12', minWidth: 30 },
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
    {
      id: 'company_size',
      key: 'company_size',
      label: 'Company Size',
    },
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

// ---------------------------------------------------------------------------
// Export column definitions — ALL fields, regardless of visibility
// ---------------------------------------------------------------------------
const EXPORT_COLUMNS = [
  { key: 'first_name',           label: 'First Name' },
  { key: 'last_name',            label: 'Last Name' },
  { key: 'email',                label: 'Email' },
  { key: 'alt_email',            label: 'Alt Email' },
  { key: 'phone_number',         label: 'Phone' },
  { key: 'mobile_number',        label: 'Mobile' },
  { key: 'company_name',         label: 'Company' },
  { key: 'company_website',      label: 'Company Website' },
  { key: 'company_linkedin_url', label: 'Company LinkedIn' },
  { key: 'linkedin_url',         label: 'LinkedIn' },
  { key: 'job_title',            label: 'Job Title' },
  { key: 'department',           label: 'Department' },
  { key: 'industry',             label: 'Industry' },
  { key: 'company_size',         label: 'Company Size' },
  { key: 'location',             label: 'Location' },
  { key: 'timezone',             label: 'Timezone' },
  { key: 'status',               label: 'Status' },
  { key: 'source',               label: 'Source' },
  { key: 'trigger',              label: 'Trigger' },
  { key: 'notes',                label: 'Notes' },
  { key: 'score',                label: 'Score' },
  { key: 'created_by',           label: 'Created By' },
  { key: 'created_at',           label: 'Created On' },
  { key: 'updated_by',           label: 'Last Updated By' },
];

export default function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
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

  // Row selection state (for CSV export)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // View mode: 'table' | 'kanban' — persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'table';
    return (localStorage.getItem('leadgaze-view-mode-leads') as ViewMode) ?? 'table';
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leadgaze-view-mode-leads', mode);
    }
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
  };

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
  } = useDateRangeFilter('updated');

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

  const trailingColumnCount = 2; // +1 for actions, +1 for checkbox column

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
  const { importColumns, missingRequiredImportFields } = useMemo(() => {
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
      { key: 'owner_id', label: 'Owner ID' },
      { key: 'tags', label: 'Tags' },
      { key: 'annual_revenue', label: 'Annual Revenue' },
      { key: 'lead_score', label: 'Score' },
      ...customFields.map((field) => ({
        key: field.field_key,
        label: field.field_label,
        required: false,
      })),
    ];
    if (fieldPermissionCtx) {
      const { allowedColumns, missingRequired } = filterImportColumns(cols, fieldPermissionCtx);
      return { importColumns: allowedColumns, missingRequiredImportFields: missingRequired };
    }
    return { importColumns: cols, missingRequiredImportFields: [] };
  }, [fieldPermissionCtx, customFields]);

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

  // Fetch roles (passed to ColumnEditModal for FLS role selection)
  const { data: moduleRoles = [] } = useModuleRoles(productKey);

  // Fetch team members filtered by product key (for ColumnEditModal FLS user selection)
  const { data: teamMembersData } = useTeamMembers({
    workspaceId: workspace?.id,
    productKey,
    enabled: !!workspace?.id,
  });
  const teamMembersForModal = teamMembersData?.data ?? [];

  // Fetch team members filtered by package access (for Created By filter)
  const { members } = usePackageMembers();

  // Fetch lead statuses
  const { data: statuses = [], isSuccess: isStatusesLoaded } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => getLeadStatusesService({ workspaceId: workspace?.id || '' }),
    enabled: !!workspace?.id,
  });

  const defaultStatusIds = useMemo(() => {
    return statuses
      .filter((s: any) => !s.is_closed)
      .map((s: any) => s.id);
  }, [statuses]);

  const allStatusIds = useMemo(() => {
    return statuses.map((s: any) => s.id);
  }, [statuses]);

  // Fetch leads data (table view — paginated)
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
        statusId:
          selectedStatuses.length > 0 ? selectedStatuses : defaultStatusIds,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
        updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
        updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
      }),
    enabled: !!workspace?.id && isStatusesLoaded && viewMode === 'table',
  });

  // Fetch ALL leads for kanban view (no pagination, includes all statuses including unqualified by default unless filtered)
  const {
    data: kanbanLeadsData = { data: [], count: 0, statusBreakdown: {} },
    isLoading: kanbanIsLoading,
    refetch: refetchKanban,
  } = useQuery({
    queryKey: [
      'leads-kanban',
      workspace?.id,
      debouncedSearchTerm,
      selectedStatuses,
      selectedCreatedByIds,
      computedCreatedOnDates,
      computedUpdatedOnDates,
      allStatusIds,
    ],
    queryFn: () =>
      getLeadsService({
        workspaceId: workspace?.id || '',
        page: 1,
        limit: 500,
        searchTerm: debouncedSearchTerm,
        statusId:
          selectedStatuses.length > 0 ? selectedStatuses : allStatusIds,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
        updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
        updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
      }),
    enabled: !!workspace?.id && isStatusesLoaded && viewMode === 'kanban',
  });

  const leads = leadsData.data;
  const totalCount = leadsData.count;
  const kanbanLeads = kanbanLeadsData.data;

  const importMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      if (!workspace?.id) throw new Error('Workspace ID is required');
      return await importLeadsService({
        workspaceId: workspace.id,
        data: payload,
      });
    },
    onSuccess: (data, variables) => {
      toast.success(`Imported ${variables.length} leads successfully`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'An error occurred during import');
    },
  });

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

  // Reset to first page + selection when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedLeadIds(new Set());
  }, [
    debouncedSearchTerm,
    selectedStatuses,
    selectedCreatedByIds,
    pageSize,
    createdOnRange,
    updatedOnRange,
    viewMode,
  ]);

  // Also clear selection when page changes
  React.useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [currentPage]);

  const paginatedLeads = filteredLeads;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ---------------------------------------------------------------------------
  // Row selection (checkbox) logic
  // ---------------------------------------------------------------------------
  const allVisibleIds = paginatedLeads.map((l: Lead) => l.id);

  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id: string) => selectedLeadIds.has(id));

  const isIndeterminate =
    !isAllSelected && allVisibleIds.some((id: string) => selectedLeadIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id: string) => next.delete(id));
        return next;
      });
    } else {
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id: string) => next.add(id));
        return next;
      });
    }
  }, [isAllSelected, allVisibleIds]);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  /** Flattens a Lead object into a plain { key: string } record for CSV serialisation */
  const serializeLeadRow = useCallback(
    (lead: Lead): Record<string, string> => {
      const score = calculateLeadScore({
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company_name,
        industry_id: lead.industry_id || (lead.industry as any)?.id,
        company_size: lead.company_size,
        location: lead.location,
        timezone: lead.timezone,
        job_title: lead.job_title,
        contacted_count: lead.contacted_count,
        status_key: lead.status?.status_key,
        custom_fields: lead.custom_fields || {},
        source_id: lead.source_id,
      }).totalScore;

      const base: Record<string, string> = {
        first_name:           lead.first_name ?? '',
        last_name:            lead.last_name ?? '',
        email:                lead.email ?? '',
        alt_email:            lead.alt_email ?? '',
        phone_number:         lead.phone_number ?? '',
        mobile_number:        lead.mobile_number ?? '',
        company_name:         lead.company_name ?? '',
        company_website:      lead.company_website ?? '',
        company_linkedin_url: lead.company_linkedin_url ?? '',
        linkedin_url:         lead.linkedin_url ?? '',
        job_title:            lead.job_title ?? '',
        department:           lead.department ?? '',
        industry:             lead.industry?.industry_name ?? '',
        company_size:         lead.company_size ?? '',
        location:             lead.location ?? '',
        timezone:             lead.timezone ?? '',
        status:               lead.status?.status_name ?? '',
        source:               lead.source?.source_name ?? '',
        trigger:              lead.trigger ?? '',
        notes:                lead.notes ?? '',
        score:                String(score),
        created_by:           lead.created_by_account?.name ?? lead.created_by ?? '',
        created_at:           lead.created_at ? formatDate(lead.created_at) : '',
        updated_by:           lead.updated_by_account?.name ?? lead.updated_by ?? '',
      };

      // Append custom fields
      customFields.forEach((cf) => {
        base[cf.field_key] = String(
          (lead as any).custom_fields?.[cf.field_key] ?? '',
        );
      });

      return base;
    },
    [customFields, formatDate],
  );

  /** Full columns list: system + custom (for export header row) */
  const exportColumns = useMemo(() => {
    const cols = [
      ...EXPORT_COLUMNS,
      ...customFields.map((cf) => ({ key: cf.field_key, label: cf.field_label })),
    ];
    return fieldPermissionCtx
      ? filterExportColumns(cols, fieldPermissionCtx)
      : cols;
  }, [customFields, fieldPermissionCtx]);

  const { exportToCsv: triggerExport } = useCsvExport<Lead>({
    filename: 'leads_export',
    columns: exportColumns,
    // getRows is overridden per-call via the handlers below
    getRows: () => paginatedLeads as Lead[],
    serializeRow: serializeLeadRow as (row: Lead) => Record<string, string>,
  });

  /** Export All — fetches ALL matching leads (across pages) then downloads */
  const handleExportAll = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      setIsExporting(true);
      // Fetch all leads without pagination (large limit)
      const allLeadsResult = await getLeadsService({
        workspaceId: workspace.id,
        page: 1,
        limit: 10000,
        searchTerm: debouncedSearchTerm,
        statusId: selectedStatuses.length > 0 ? selectedStatuses : defaultStatusIds,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
        updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
        updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
      });

      const allLeads = allLeadsResult.data as Lead[];

      if (allLeads.length === 0) {
        toast.info('No leads to export.');
        return;
      }

      const { exportToCsv } = {
        exportToCsv: async () => {
          const { stringifyCsv } = await import('@kit/ui/csv-utils');
          const headerRow = exportColumns.map((c) => c.label);
          const dataRows = allLeads.map((lead) => {
            const flat = serializeLeadRow(lead);
            return exportColumns.map((c) => flat[c.key] ?? '');
          });
          const csvText = stringifyCsv([headerRow, ...dataRows]);
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const dateSuffix = new Date().toISOString().slice(0, 10);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `leads_export_${dateSuffix}.csv`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
      };
      await exportToCsv();
      toast.success(`Exported ${allLeads.length} leads successfully.`);
    } catch (err) {
      toast.error('Failed to export leads. Please try again.');
      console.error('Export All error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [
    workspace?.id,
    debouncedSearchTerm,
    selectedStatuses,
    defaultStatusIds,
    sortColumn,
    sortDirection,
    computedCreatedOnDates,
    computedUpdatedOnDates,
    exportColumns,
    serializeLeadRow,
  ]);

  /** Export Selected — exports only the checked rows from the current page */
  const handleExportSelected = useCallback(async () => {
    const selectedRows = paginatedLeads.filter((l: Lead) =>
      selectedLeadIds.has(l.id),
    ) as Lead[];

    if (selectedRows.length === 0) {
      toast.info('No rows selected.');
      return;
    }

    try {
      setIsExporting(true);
      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const headerRow = exportColumns.map((c) => c.label);
      const dataRows = selectedRows.map((lead) => {
        const flat = serializeLeadRow(lead);
        return exportColumns.map((c) => flat[c.key] ?? '');
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `leads_export_selected_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${selectedRows.length} selected lead${selectedRows.length > 1 ? 's' : ''} successfully.`);
    } catch (err) {
      toast.error('Failed to export selected leads.');
      console.error('Export Selected error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [paginatedLeads, selectedLeadIds, exportColumns, serializeLeadRow]);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
    refetch();
    refetchKanban();
  };

  // Handle status change from kanban drag-and-drop
  const handleKanbanStatusChange = async (
    leadId: string,
    newStatusId: string,
  ) => {
    const lead = kanbanLeads.find((l: Lead) => l.id === leadId);
    const newStatus = statuses.find((s: any) => s.id === newStatusId);
    if (!lead) return;

    const { totalScore } = calculateLeadScore({
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      industry_id: lead.industry_id || lead.industry?.id,
      company_size: lead.company_size,
      location: lead.location,
      timezone: lead.timezone,
      job_title: lead.job_title,
      contacted_count: lead.contacted_count,
      status_key: newStatus?.status_key,
      custom_fields: lead.custom_fields || {},
      source_id: lead.source_id,
    });

    await updateLeadService(leadId, {
      status_id: newStatusId,
      lead_score: totalScore,
    });
    toast.success('Lead status updated');
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
    refetchKanban();
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
                badge:
                  s.is_closed ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:bg-amber-900/20 dark:text-amber-400">
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
            {
              key: 'import',
              label: 'Import',
              icon: FileUp,
              onClick: () => setIsImportDialogOpen(true),
              show: canAccess('leads', 'import'),
              buttonVariant: 'outline',
            },
            {
              key: 'add',
              label: 'New Lead',
              icon: Plus,
              onClick: () => setIsCreateDialogOpen(true),
              show: canAccess('leads', 'create'),
              buttonVariant: 'default',
            },
          ]}
          statusSlot={
            <ViewToggle
              view={viewMode}
              onChange={handleViewModeChange}
            />
          }
          exportSlot={
            canAccess('leads', 'read') ? (
              <CsvExportButton
                selectedCount={selectedLeadIds.size}
                onExportAll={handleExportAll}
                onExportSelected={handleExportSelected}
                isExporting={isExporting}
              />
            ) : null
          }
          columnVisibilitySlot={
            viewMode === 'table' ? (
              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            ) : null
          }
        />
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        {viewMode === 'kanban' ? (
          /* ── Kanban Board ─────────────────────────────────────────────── */
          <div className="flex min-h-0 flex-1 overflow-hidden p-2">
            <LeadsKanbanBoard
              leads={kanbanLeads}
              statuses={statuses}
              isLoading={kanbanIsLoading || !isStatusesLoaded}
              canUpdate={canAccess('leads', 'update')}
              canDelete={canAccess('leads', 'delete')}
              canCreate={canAccess('leads', 'create')}
              onLeadClick={(id) => router.push(`/home/sales/leads/${id}`)}
              onDelete={(lead) => {
                setLeadToDelete(lead);
                setDeleteDialogOpen(true);
              }}
              onStatusChange={handleKanbanStatusChange}
              onCreateLead={() => setIsCreateDialogOpen(true)}
            />
          </div>
        ) : (
          /* ── Table View ───────────────────────────────────────────────── */
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
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead className="w-10 px-3">
                    <Checkbox
                      checked={
                        isAllSelected
                          ? true
                          : isIndeterminate
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all rows"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>

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
                        isAdmin={isAdmin}
                        field={getEntityFieldByKey(field.key)}
                        onEditClick={
                          isAdmin ? () => openColumnEdit(field.key) : undefined
                        }
                        {...getHeaderProps(field.id)}
                      >
                        <span
                          className="col-resize-handle"
                          data-min-width={config?.minWidth}
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
                          isAdmin={isAdmin}
                          onEditClick={
                            isAdmin || (field as any).created_by === user?.id
                              ? () => openColumnEdit(field.field_key)
                              : undefined
                          }
                          onDeleteField={
                            (isAdmin || (field as any).created_by === user?.id) &&
                              !field.is_system
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
                    <TableHead className="sticky-right-header bg-background z-10 w-12 px-1 text-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className="mx-auto flex h-8 w-8 items-center justify-center border-dashed"
                        onClick={() => setAddColumnModalOpen(true)}
                        title="Add Column"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || fieldsLoading || fieldPermissionsLoading ? (
                    <>
                      {[...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell
                            className="h-[32px] px-4 py-2"
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + trailingColumnCount
                              : 8
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
                          : 8
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
                      {/* Checkbox */}
                      <TableCell
                        className="w-10 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => handleSelectRow(lead.id)}
                          aria-label={`Select lead ${lead.first_name}`}
                        />
                      </TableCell>

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
        )}

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
          disabledReason={
            missingRequiredImportFields.length > 0
              ? `You do not have permission to edit mandatory fields required for import: ${missingRequiredImportFields.join(', ')}. Please contact your administrator.`
              : null
          }
          onUpload={async ({ headers, rows }) => {
            const customFieldKeys = new Set(customFields.map((cf) => cf.field_key));

            const payload = rows.map((row) => {
              const obj: any = { custom_fields: {} };
              headers.forEach((header, index) => {
                if (!header) return;
                const val = row[index];
                if (val === undefined || val === '') return;

                if (customFieldKeys.has(header)) {
                  obj.custom_fields[header] = val;
                } else {
                  obj[header] = val;
                }
              });
              return obj;
            });

            try {
              await importMutation.mutateAsync(payload);
              setIsImportDialogOpen(false);
            } catch (error: any) {
              // error is already handled by onError in mutation
            }
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
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
            refetch();
            refetchKanban();
          }}
        />

        {/* Add Column Modal */}
        <AddColumnModal
          open={addColumnModalOpen}
          onOpenChange={setAddColumnModalOpen}
          entityType="leads"
          roles={moduleRoles}
          teamMembers={teamMembersForModal}
          isAdmin={canAddColumn}
          isSubmitting={createField.isPending}
          onSubmit={async (payload) => {
            await createField.mutateAsync({
              ...payload,
              workspace_id: workspace?.id || '',
              product_key: productKey,
              entity_type: 'leads',
            });
            refetchEntityFields();
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
            field={editingField as ColumnEditFieldShape}
            roles={moduleRoles}
            teamMembers={teamMembersForModal}
            isAdmin={canAddColumn} // passed to restrict non-admins
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
