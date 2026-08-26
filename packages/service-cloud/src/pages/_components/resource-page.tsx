'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';

import { useQuery } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { ColumnHeader } from '@kit/ui/column-header';
import CustomTableContainer from '@kit/ui/custom-table-container';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import { Checkbox } from '@kit/ui/checkbox';
import { CsvExportButton } from '@kit/ui/csv-export-button';
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
import { useTableSort } from '@kit/ui/use-table-sort';
import { formatDate } from '@kit/shared/utils';
import { cn } from '@kit/ui/utils';

import {
  type ServiceCloudRecord,
  createServiceCloudResourceService,
  deleteServiceCloudResourceService,
  getServiceCloudResourceService,
  updateServiceCloudResourceService,
} from '../../services';

const PRESET_COLORS = [
  '#64748b', // Slate
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
];

export type ResourceField = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'color' | 'phone';
  required?: boolean;
  options?: Array<{ label: string; value: string; color?: string }>;
};

export type ResourceColumn = {
  key: string;
  label: string;
  render?: (record: ServiceCloudRecord, index?: number, pagination?: { currentPage: number, pageSize: number }) => React.ReactNode;
  /**
   * Optional sort key when the sort field differs from the column key.
   * e.g. key='status_id' but sortKey='status.name'
   */
  sortKey?: string;
  /**
   * When true, a lock icon is displayed next to the column label in the header
   * to indicate field-level security (access is restricted to certain members).
   */
  accessRestricted?: boolean;
  className?: string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;
};

export type ResourceUniqueField = {
  key: string;
  label: string;
};

type ResourcePageProps = {
  workspaceId: string;
  resource: string;
  title: string;
  description: string;
  fields: ResourceField[];
  columns: ResourceColumn[];
  uniqueFields?: ResourceUniqueField[];
  defaults?: ServiceCloudRecord;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  emptyLabel?: string;
  queryParams?: Record<string, string>;
  toolbar?: React.ReactNode;
  filterGroups?: any[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  createLabel?: string;
  /** Label shown in the pagination bar, e.g. "tickets", "customers". Defaults to the resource name. */
  entityLabel?: string;
  /**
   * When true, a pencil edit button appears on column header hover (same as leads page).
   * Requires `onColumnEditClick` to handle the edit action.
   */
  isAdmin?: boolean;
  /**
   * Called when the admin pencil icon is clicked on a column header.
   * Receives the column key so the parent can open an edit modal.
   */
  onColumnEditClick?: (columnKey: string) => void;
  /**
   * Called when the admin '+' add column button is clicked.
   */
  onColumnAddClick?: () => void;
  /**
   * Optional field-level security (FLS) function.
   * When provided, columns for which this returns false are hidden entirely
   * in both the table header and all data rows.
   */
  canViewColumn?: (columnKey: string) => boolean;
  /** Full entity field definitions for displaying column header lock icons and configuration */
  systemFields?: any[];
  /**
   * Optional FLS function for the edit dialog.
   * When provided, fields for which this returns false are hidden from the modal entirely.
   * Fields for which this returns true but canEditField returns false are shown as disabled (read-only).
   */
  canViewField?: (fieldKey: string) => boolean;
  /**
   * Optional FLS function for create/edit dialogs.
   * When provided, form fields for which this returns false are shown as read-only (disabled).
   */
  canEditField?: (fieldKey: string) => boolean;
  /** Logged in user's ID to restrict dynamic fields edits to their creators */
  currentUserId?: string;
  viewMode?: 'table' | 'kanban';
  kanbanSlot?: (
    data: any[],
    refetch: () => void,
    openEdit?: (record: ServiceCloudRecord) => void,
    openDelete?: (record: ServiceCloudRecord) => void,
  ) => React.ReactNode;
  showSelection?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  exportSlot?: React.ReactNode;
  enableExport?: boolean;
  serializeRow?: (record: ServiceCloudRecord) => Record<string, string>;
  exportColumns?: Array<{ key: string; label: string }>;
  actions?: React.ComponentProps<typeof ListToolBar>['actions'];
  tabsSlot?: React.ReactNode;
  pageHeaderTitle?: string;
};

function getInitialForm(
  fields: ResourceField[],
  defaults: ServiceCloudRecord = {},
) {
  return fields.reduce<ServiceCloudRecord>((acc, field) => {
    acc[field.key] = defaults[field.key] ?? '';
    return acc;
  }, {});
}

export function ServiceCloudResourcePage({
  workspaceId,
  resource,
  title,
  description,
  fields,
  columns,
  uniqueFields = [],
  defaults = {},
  canCreate = true,
  canEdit = true,
  canDelete = true,
  emptyLabel = 'No records found.',
  queryParams = {},
  toolbar,
  filterGroups,
  activeFilterCount,
  onClearFilters,
  createLabel,
  entityLabel,
  isAdmin = false,
  onColumnEditClick,
  onColumnAddClick,
  canViewColumn,
  systemFields = [],
  canViewField,
  canEditField,
  currentUserId,
  viewMode = 'table',
  kanbanSlot,
  showSelection = false,
  selectedIds = new Set(),
  onSelectAll,
  onSelectRow,
  isAllSelected = false,
  isIndeterminate = false,
  exportSlot,
  enableExport = false,
  serializeRow,
  exportColumns,
  actions,
  tabsSlot,
  pageHeaderTitle,
}: ResourcePageProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const showSelectionFinal = showSelection || enableExport;
  const selectedIdsFinal = showSelection ? (selectedIds || new Set()) : internalSelectedIds;
  // Apply FLS: filter out columns the current user cannot view
  const visibleColumns = useMemo(
    () =>
      canViewColumn ? columns.filter((col) => canViewColumn(col.key)) : columns,
    [columns, canViewColumn],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { getHeaderProps, getResizeHandleProps } = useColumnResize(
    `sc-${resource}`,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, pageSize]);

  // Reset selection when pagination, search, or viewMode changes
  useEffect(() => {
    setInternalSelectedIds(new Set());
  }, [debouncedSearchTerm, pageSize, currentPage, viewMode]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCloudRecord | null>(null);
  const [form, setForm] = useState<ServiceCloudRecord>(() =>
    getInitialForm(fields, defaults),
  );
  const [saving, setSaving] = useState(false);
  const [deletingRecord, setDeletingRecord] =
    useState<ServiceCloudRecord | null>(null);

  const getResourceSingleName = () => {
    switch (resource) {
      case 'tickets':
        return 'ticket';
      case 'customers':
        return 'customer';
      case 'statuses':
        return 'status';
      case 'priorities':
        return 'priority';
      case 'categories':
        return 'category';
      default:
        return resource.endsWith('s') ? resource.slice(0, -1) : resource;
    }
  };

  const { sortColumn, sortDirection, toggleSort, sortState } =
    useTableSort<ServiceCloudRecord>(`sc-${resource}`, [], {
      mode: 'server',
      onSortChange: () => setCurrentPage(1),
    });

  const queryParamsWithSort = useMemo(
    () => ({
      ...queryParams,
      search: debouncedSearchTerm || undefined,
      ...(sortColumn ? { sortColumn } : {}),
      ...(sortDirection ? { sortDirection } : {}),
    }),
    [queryParams, debouncedSearchTerm, sortColumn, sortDirection],
  );

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery<ServiceCloudRecord[]>({
    queryKey: [
      'service-cloud',
      resource,
      workspaceId,
      queryParamsWithSort,
      sortState,
    ],
    queryFn: () =>
      getServiceCloudResourceService(
        resource,
        workspaceId,
        queryParamsWithSort,
      ),
    enabled: Boolean(workspaceId),
  });

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  // Pagination derived values
  const totalCount = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // When mode='server', we don't need useTableSort to actually sort. We just use its state.
  // We'll rename filteredData to sortedData for consistency with the rest of the component
  const sortedData = filteredData;

  // Columns that should not be sortable (by column key)
  // These are fields where sorting doesn't make sense (e.g., multi-value, large text)
  const nonSortableColumnKeys = ['assignees', 'subject', 'status_id', 'priority_id', 'phone', 'website'];

  const paginatedData = useMemo(
    () =>
      sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedData, currentPage, pageSize],
  );

  const allVisibleIds = paginatedData.map((r) => r.id).filter(Boolean) as string[];

  const isAllSelectedFinal = showSelection
    ? isAllSelected
    : allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIdsFinal.has(id));

  const isIndeterminateFinal = showSelection
    ? isIndeterminate
    : !isAllSelectedFinal && allVisibleIds.some((id) => selectedIdsFinal.has(id));

  const handleSelectAllInternal = () => {
    if (isAllSelectedFinal) {
      setInternalSelectedIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setInternalSelectedIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleSelectRowInternal = (id: string) => {
    setInternalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSelectAllFinal = showSelection ? onSelectAll : handleSelectAllInternal;
  const onSelectRowFinal = showSelection ? onSelectRow : handleSelectRowInternal;

  const handleExportAll = async () => {
    if (!workspaceId) return;
    try {
      setIsExporting(true);
      const allData = await getServiceCloudResourceService(
        resource,
        workspaceId,
        {
          ...queryParamsWithSort,
          limit: '10000',
        }
      );

      if (allData.length === 0) {
        toast.info('No data to export.');
        return;
      }

      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const cols = exportColumns || visibleColumns.map(c => ({ key: c.key, label: c.label }));
      const headerRow = cols.map((c) => c.label);
      const dataRows = allData.map((record: ServiceCloudRecord) => {
        const flat = serializeRow ? serializeRow(record) : record;
        return cols.map((c) => String(flat[c.key] ?? ''));
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${resource}_export_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${allData.length} records successfully.`);
    } catch (err) {
      toast.error('Failed to export.');
      console.error('Export All error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
    const selectedRows = data.filter((r) => r.id && selectedIdsFinal.has(r.id));
    if (selectedRows.length === 0) {
      toast.info('No rows selected.');
      return;
    }

    try {
      setIsExporting(true);
      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const cols = exportColumns || visibleColumns.map(c => ({ key: c.key, label: c.label }));
      const headerRow = cols.map((c) => c.label);
      const dataRows = selectedRows.map((record) => {
        const flat = serializeRow ? serializeRow(record) : record;
        return cols.map((c) => String(flat[c.key] ?? ''));
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${resource}_export_selected_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${selectedRows.length} selected record${selectedRows.length > 1 ? 's' : ''} successfully.`);
    } catch (err) {
      toast.error('Failed to export selected.');
      console.error('Export Selected error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportSlotFinal = exportSlot || (enableExport ? (
    <CsvExportButton
      selectedCount={selectedIdsFinal.size}
      onExportAll={handleExportAll}
      onExportSelected={handleExportSelected}
      isExporting={isExporting}
    />
  ) : undefined);

  const openCreate = () => {
    setEditing(null);
    setForm(getInitialForm(fields, defaults));
    setOpen(true);
  };

  const openEdit = (record: ServiceCloudRecord) => {
    setEditing(record);
    setForm(getInitialForm(fields, { ...defaults, ...record }));
    setOpen(true);
  };

  const save = async () => {
    const sanitizedForm = { ...form };

    for (const field of fields) {
      if (field.required && !sanitizedForm[field.key]) {
        toast.error(`${field.label} is required`);
        return;
      }
      if (field.key === 'phone' || field.type === 'phone') {
        const rawPhone = String(sanitizedForm[field.key] ?? '').trim();
        if (rawPhone) {
          const digitsOnly = rawPhone.replace(/\D/g, '').slice(0, 10);
          sanitizedForm[field.key] = digitsOnly;
        }
      }
    }

    for (const field of uniqueFields) {
      const value = sanitizedForm[field.key];
      if (value === undefined || value === null || value === '') continue;

      const hasDuplicate = data.some(
        (record) =>
          record.id !== editing?.id &&
          String(record[field.key] ?? '') === String(value),
      );

      if (hasDuplicate) {
        toast.error(`${field.label} cannot be repeated`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...sanitizedForm, workspace_id: workspaceId };
      if (editing?.id) {
        await updateServiceCloudResourceService(resource, {
          ...payload,
          id: editing.id,
        });
      } else {
        await createServiceCloudResourceService(resource, payload);
      }
      toast.success(`${title} saved`);
      setOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || `Failed to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: ServiceCloudRecord) => {
    if (!record.id) return;
    try {
      await deleteServiceCloudResourceService(resource, workspaceId, record.id);
      toast.success(`${title} deleted`);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${title}`);
    }
  };

  return (
    <>
      {pageHeaderTitle && (
        <div className="flex items-center justify-between pb-0">
          <PageHeader title={pageHeaderTitle} className={`w-full`}>
            {canCreate && (
              <Button
                onClick={openCreate}
                className="secondary-text-small-bold gap-1.5 px-2 bg-leadgaze-primary hover:bg-leadgaze-primary/90 text-white"
              >
                <Plus className="h-4 w-4" />
                {createLabel || 'New'}
              </Button>
            )}
          </PageHeader>
        </div>
      )}
      <div
        className={cn(
          'flex w-full min-w-0 max-w-full shrink-0 items-center justify-between border-top-bottom-gray',
          !pageHeaderTitle && 'border-top-bottom-gray'
        )}
      >
        {tabsSlot ? (
          <>
            {typeof tabsSlot === 'function' ? tabsSlot(data) : tabsSlot}
          </>
        ) : null}
        
          <ListToolBar
            align="right"
            className="border-none bg-transparent p-0"
            showSearch
            searchPlaceholder={`Search`}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            showFilter={!!filterGroups && filterGroups.length > 0}
            filterGroups={filterGroups}
            activeFilterCount={activeFilterCount}
            onClearFilters={onClearFilters}
            statusSlot={toolbar}
            exportSlot={exportSlotFinal}
            actions={
              actions ||
              (canCreate && !pageHeaderTitle
                ? [
                    {
                      key: 'create',
                      label: createLabel || 'New',
                      icon: Plus,
                      onClick: openCreate,
                      buttonVariant: 'default' as const,
                    },
                  ]
                : [])
            }
          />
        
      </div>
      <PageBody className="sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-0">
          {viewMode === 'kanban' && kanbanSlot ? (
            kanbanSlot(data, refetch, openEdit, (record) => setDeletingRecord(record))
          ) : (
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
                  entityLabel={entityLabel ?? resource}
                />
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {showSelectionFinal && (
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={
                            isAllSelectedFinal
                              ? true
                              : isIndeterminateFinal
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={onSelectAllFinal}
                          aria-label="Select all rows"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableHead>
                    )}
                  {visibleColumns.map((column) => (
                    <ColumnHeader
                      key={column.key}
                      label={column.label}
                      columnId={column.key}
                      sortKey={column.sortKey}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      sortable={column.sortable !== false && !nonSortableColumnKeys.includes(column.key)}
                      onSort={toggleSort}
                      className={cn("relative", column.width)}
                      isAdmin={isAdmin}
                      onEditClick={
                        onColumnEditClick &&
                        (isAdmin || (() => {
                          const fieldObj = systemFields.find((f) => f.field_key === column.key);
                          return fieldObj && !fieldObj.is_system && fieldObj.created_by === currentUserId;
                        })())
                          ? () => onColumnEditClick(column.key)
                          : undefined
                      }
                      field={
                        systemFields.find((f) => f.field_key === column.key) ||
                        null
                      }
                      {...getHeaderProps(column.key)}
                    >
                      <span
                        className="col-resize-handle"
                        data-min-width={column.minWidth}
                        {...getResizeHandleProps(column.key)}
                      />
                    </ColumnHeader>
                  ))}
                  {canEdit || canDelete ? (
                    onColumnAddClick ? (
                      <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                        <Button
                          type="button"
                          size="icon"
                          className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                          onClick={onColumnAddClick}
                          title="Add Column"
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        </Button>
                      </TableHead>
                    ) : (
                      <TableHead className="sticky-right-header text-right">
                        Actions
                      </TableHead>
                    )
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {showSelectionFinal && (
                        <TableCell className="w-10 px-3">
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                      )}
                      <TableCell
                        colSpan={visibleColumns.length}
                        className="h-[32px] px-4 py-2"
                      >
                        <Skeleton className="h-7 w-full" />
                      </TableCell>
                      {canEdit || canDelete ? (
                        <TableCell className="bg-card px-4 text-right">
                          <Skeleton className="ml-auto h-7 w-full" />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length + (showSelectionFinal ? 1 : 0) + (canEdit || canDelete ? 1 : 0)}
                      className="text-muted-foreground py-8 text-center"
                    >
                      {emptyLabel}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((record: ServiceCloudRecord, index: number) => (
                    <TableRow key={record.id}>
                      {showSelectionFinal && (
                        <TableCell
                          className="w-10 px-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedIdsFinal?.has(record.id) ?? false}
                            onCheckedChange={() => onSelectRowFinal?.(record.id)}
                            aria-label={`Select row ${record.id}`}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={cn(
                            column.className,
                            column.width,
                            column.key === 'name' &&
                              'primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary',
                          )}
                        >
                          {column.render
                            ? column.render(record, index, { currentPage, pageSize })
                            : String(record[column.key] ?? '-')}
                        </TableCell>
                      ))}
                      {canEdit || canDelete ? (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 border-0 p-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit && (
                                  <DropdownMenuItem
                                    onClick={() => openEdit(record)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Edit2 className="h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => setDeletingRecord(record)}
                                    className="text-destructive focus:text-destructive cursor-pointer gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
          )}
        </div>
      </PageBody>
      <AlertDialog
        open={Boolean(deletingRecord)}
        onOpenChange={(open) => !open && setDeletingRecord(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{' '}
              {getResourceSingleName()}{' '}
              {deletingRecord?.subject || deletingRecord?.name
                ? `"${deletingRecord.subject || deletingRecord.name}"`
                : ''}{' '}
              and remove it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingRecord) {
                  void remove(deletingRecord);
                  setDeletingRecord(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canCreate || canEdit ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editing ? `Edit ${title}` : `New ${title}`}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 space-y-2 overflow-y-auto custom-spacing-x-y">
                <div className="grid gap-2 sm:grid-cols-2">
                  {fields
                    // Hide field if canViewField is provided AND returns false
                    .filter((field) => !canViewField || canViewField(field.key))
                    .map((field) => {
                      // Field is editable only if no canEditField guard, or it returns true
                      const isEditable = !canEditField || canEditField(field.key);
                      return (
                        <div key={field.key}>
                          <Label className="flex items-center gap-1.5">
                            {field.label}
                            {field.required && <span className="pl-1 text-red-500">*</span>}
                            {!isEditable && (
                              <span className="text-muted-foreground text-xs font-normal">(view only)</span>
                            )}
                          </Label>
                          {field.type === 'select' ? (
                            <Select
                              value={String(form[field.key] ?? '')}
                              onValueChange={(value) =>
                                isEditable &&
                                setForm((prev: ServiceCloudRecord) => ({
                                  ...prev,
                                  [field.key]: value,
                                }))
                              }
                              disabled={!isEditable}
                            >
                              <SelectTrigger disabled={!isEditable}>
                                <SelectValue
                                  placeholder={`Select ${field.label}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options ?? []).map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    <div className="flex items-center gap-2">
                                      {option.color ? (
                                        <span
                                          className="h-2 w-2 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                                          style={{
                                            backgroundColor: option.color,
                                          }}
                                        />
                                      ) : null}
                                      <span>{option.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'color' ? (
                            <div className={cn('space-y-3', !isEditable && 'pointer-events-none opacity-60')}>
                              <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    disabled={!isEditable}
                                    className={cn(
                                      'focus:ring-ring h-8 w-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95',
                                      form[field.key] === color
                                        ? 'border-primary ring-primary scale-105 shadow-md ring-2'
                                        : 'border-zinc-300 dark:border-zinc-700',
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() =>
                                      isEditable &&
                                      setForm((prev: ServiceCloudRecord) => ({
                                        ...prev,
                                        [field.key]: color,
                                      }))
                                    }
                                    title={color}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="border-input focus-within:ring-ring relative h-9 w-9 overflow-hidden rounded-md border focus-within:ring-2 focus-within:ring-offset-2">
                                  <input
                                    type="color"
                                    disabled={!isEditable}
                                    className="absolute -left-2 -top-2 h-14 w-14 cursor-pointer border-0 p-0"
                                    value={String(form[field.key] || '#64748b')}
                                    onChange={(event) =>
                                      isEditable &&
                                      setForm((prev: ServiceCloudRecord) => ({
                                        ...prev,
                                        [field.key]: event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <Input
                                  type="text"
                                  placeholder="#000000"
                                  disabled={!isEditable}
                                  value={String(form[field.key] ?? '')}
                                  onChange={(event) =>
                                    isEditable &&
                                    setForm((prev: ServiceCloudRecord) => ({
                                      ...prev,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="w-32 font-mono text-sm uppercase"
                                />
                              </div>
                            </div>
                          ) : field.key === 'phone' || field.type === 'phone' ? (
                            <Input
                              type="number"
                              disabled={!isEditable}
                              value={String(form[field.key] ?? '')}
                              onKeyDown={(e) => {
                                if (
                                  e.key === 'Backspace' ||
                                  e.key === 'Delete' ||
                                  e.key === 'Tab' ||
                                  e.key === 'ArrowLeft' ||
                                  e.key === 'ArrowRight' ||
                                  e.key === 'ArrowUp' ||
                                  e.key === 'ArrowDown' ||
                                  e.key === 'Home' ||
                                  e.key === 'End' ||
                                  e.ctrlKey ||
                                  e.metaKey
                                ) {
                                  return;
                                }
                                if (!/^[0-9]$/.test(e.key)) {
                                  e.preventDefault();
                                  return;
                                }
                                const val = String(form[field.key] ?? '');
                                const target = e.target as HTMLInputElement;
                                const hasSelection =
                                  target.selectionStart !== null &&
                                  target.selectionEnd !== null &&
                                  target.selectionStart !== target.selectionEnd;

                                if (val.length >= 10 && !hasSelection) {
                                  e.preventDefault();
                                }
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const pasted = e.clipboardData.getData('text');
                                const sanitized = pasted.replace(/\D/g, '').slice(0, 10);
                                if (isEditable) {
                                  setForm((prev: ServiceCloudRecord) => ({
                                    ...prev,
                                    [field.key]: sanitized,
                                  }));
                                }
                              }}
                              onChange={(event) => {
                                if (!isEditable) return;
                                const rawVal = event.target.value;
                                const sanitized = rawVal.replace(/\D/g, '').slice(0, 10);
                                setForm((prev: ServiceCloudRecord) => ({
                                  ...prev,
                                  [field.key]: sanitized,
                                }));
                              }}
                            />
                          ) : (
                            <Input
                              type={
                                field.type === 'number'
                                  ? 'number'
                                  : field.type === 'email'
                                    ? 'email'
                                    : 'text'
                              }
                              disabled={!isEditable}
                              value={String(form[field.key] ?? '')}
                              onChange={(event) =>
                                isEditable &&
                                setForm((prev: ServiceCloudRecord) => ({
                                  ...prev,
                                  [field.key]:
                                    field.type === 'number'
                                      ? Number(event.target.value)
                                      : event.target.value,
                                }))
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export function StatusBadge({
  value,
  color,
}: {
  value?: string | null;
  color?: string | null;
}) {
  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1.5 font-medium"
    >
      {color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full border border-black/10 dark:border-white/10"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {value || 'Unassigned'}
    </Badge>
  );
}
