'use client';

import React, { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, FileUp, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import { ColumnEditModal } from '@kit/ui/column-edit-modal';
import type { ColumnEditFieldShape } from '@kit/ui/column-edit-modal';
import { ColumnHeader } from '@kit/ui/column-header';
import { CsvExportButton } from '@kit/ui/csv-export-button';
import { CsvImportDialog } from '@kit/ui/csv-import-dialog';
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
import { useCsvExport } from '@kit/ui/use-csv-export';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { filterExportColumns, filterImportColumns } from '~/lib/field-permission';
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
import { usePackageMembers } from '~/lib/hooks/use-package-members';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import { useLocalization } from '~/lib/localization/localization-provider';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useModuleRoles, useRBAC } from '~/lib/rbac/rbac-provider';
import { Account, getAccountsService, importAccountsService } from '~/services/accounts.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { CreateAccountDialog } from './components/create-account-dialog';

function AccountsPageSkeleton() {
  return (
    <ModuleGuard module="accounts">
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
                      <TableHead>Account Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="sticky right-0 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(12)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[32px] px-4 py-2" colSpan={5}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                        <TableCell className="bg-card right-0 px-4 text-right">
                          <Skeleton className="ml-auto h-7 w-full" />
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

export default function AccountsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const { formatDate } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>(
    [],
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;
  const { data: user } = useUser();

  // Row selection state (for CSV export)
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
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

  const SYSTEM_FIELDS = useMemo(
    () => [
      {
        id: 'sno',
        key: 'sno',
        label: 'S. No.',
        sortable: false,
        width: 'w-12',
        minWidth: 30,
      },
      {
        id: 'name',
        key: 'name',
        label: 'Account Name',
        sortKey: 'account_name',
      },
      { id: 'website', key: 'website', label: 'Website', sortable: false },
      {
        id: 'industry',
        key: 'industry',
        label: 'Industry',
        sortKey: 'industry.industry_name',
      },
      {
        id: 'phone',
        key: 'phone',
        label: 'Phone',
        sortKey: 'phone_number',
        sortable: false,
      },
      { id: 'company_size', key: 'company_size', label: 'Size' },
      { id: 'billing_street', key: 'billing_street', label: 'Street' },
      { id: 'billing_city', key: 'billing_city', label: 'City' },
      { id: 'billing_state', key: 'billing_state', label: 'State' },
      {
        id: 'billing_postal_code',
        key: 'billing_postal_code',
        label: 'Postal Code',
      },
      { id: 'billing_country', key: 'billing_country', label: 'Country' },
      {
        id: 'description',
        key: 'description',
        label: 'Description',
        sortable: false,
      },
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

  // ---------------------------------------------------------------------------
  // Export column definitions — ALL fields
  // ---------------------------------------------------------------------------
  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'account_name', label: 'Account Name' },
      { key: 'website', label: 'Website' },
      { key: 'industry', label: 'Industry' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'company_size', label: 'Size' },
      { key: 'billing_street', label: 'Street' },
      { key: 'billing_city', label: 'City' },
      { key: 'billing_state', label: 'State' },
      { key: 'billing_postal_code', label: 'Postal Code' },
      { key: 'billing_country', label: 'Country' },
      { key: 'description', label: 'Description' },
      { key: 'owner', label: 'Owner' },
      { key: 'created_by', label: 'Created By' },
      { key: 'created_at', label: 'Created On' },
      { key: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const {
    canViewColumn,
    visibleCustomFields,
    ctx: _fieldPermissionCtx,
    isLoading: _fieldPermissionsLoading,
  } = useFieldPermissions({
    entityType: 'accounts',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id && !!user?.id,
  });

  const { mergedDefaults, persistVisibility } = useLeadsColumnPreferences({
    entityType: 'accounts',
    workspaceId: workspace?.id,
    userId: user?.id,
    defaultVisibility: {
      sno: true,
      name: true,
      website: false,
      industry: true,
      phone: true,
      company_size: false,
      billing_street: false,
      billing_city: false,
      billing_state: false,
      billing_postal_code: false,
      billing_country: false,
      description: false,
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
    entityType: 'accounts',
    workspaceId: workspace?.id,
    userId: user?.id,
    productKey: 'sales',
    enabled: !!workspace?.id && !!user?.id,
  });
  const createField = useCreateField();
  const updateField = useUpdateField();

  const customFields = visibleCustomFields;

  const [editingField, setEditingField] = useState<EntityField | null>(null);
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);

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

  const { importColumns, missingRequiredImportFields } = useMemo(() => {
    const cols = [
      { key: 'account_name', label: 'Account Name', required: true },
      { key: 'website', label: 'Website' },
      { key: 'phone_number', label: 'Phone Number' },
      { key: 'industry_id', label: 'Industry' },
      { key: 'company_size', label: 'Company Size' },
      { key: 'account_type', label: 'Account Type' },
      { key: 'billing_street', label: 'Street Address' },
      { key: 'billing_city', label: 'City' },
      { key: 'billing_state', label: 'State/Province' },
      { key: 'billing_postal_code', label: 'Postal Code' },
      { key: 'billing_country', label: 'Country' },
      { key: 'description', label: 'Description' },
      { key: 'owner_id', label: 'Owner ID' },
      { key: 'tags', label: 'Tags' },
      ...customFields.map((field) => ({
        key: field.field_key,
        label: field.field_label,
        required: false,
      })),
    ];
    if (_fieldPermissionCtx) {
      const { allowedColumns, missingRequired } = filterImportColumns(cols, _fieldPermissionCtx);
      return { importColumns: allowedColumns, missingRequiredImportFields: missingRequired };
    }
    return { importColumns: cols, missingRequiredImportFields: [] };
  }, [_fieldPermissionCtx, customFields]);

  const { visibility, toggleVisibility, isVisible, reset, mergeNewColumns } =
    useColumnVisibility('accounts', mergedDefaults);

  useSyncColumnVisibilityToDb(
    visibility,
    persistVisibility,
    !!workspace?.id && !!user?.id,
  );

  React.useEffect(() => {
    mergeNewColumns(mergedDefaults);
  }, [mergedDefaults, mergeNewColumns]);

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
      entity_type: 'accounts',
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

  const canAddColumn = useMemo(() => {
    if (!workspace?.id || !user?.id) return false;
    const isOwner = workspace.owner_id === user.id;
    return (
      isOwner ||
      canAccess('accounts', 'admin') ||
      canAccess('accounts', 'update') ||
      canAccess('accounts', 'create')
    );
  }, [workspace, user, canAccess]);

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
          entity_type: 'accounts',
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

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('accounts');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { sortColumn, sortDirection, toggleSort, sortState } =
    useTableSort<Account>('accounts', [], {
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

  // Fetch team members filtered by package access (for Created By filter)
  const { members } = usePackageMembers();

  const {
    data: accountsData = { data: [], count: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'accounts',
      workspace?.id,
      currentPage,
      debouncedSearchTerm,
      pageSize,
      sortState,
      computedCreatedOnDates,
      computedUpdatedOnDates,
      selectedCreatedByIds,
    ],
    queryFn: () =>
      getAccountsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
        updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
        updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
        createdByIds: selectedCreatedByIds.length > 0 ? selectedCreatedByIds : undefined,
      }),
    enabled: !!workspace?.id,
  });

  const accounts = accountsData.data;

  const importMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      if (!workspace?.id) throw new Error('Workspace ID is required');
      return await importAccountsService({
        workspaceId: workspace.id,
        data: payload,
      });
    },
    onSuccess: (data, variables) => {
      toast.success(`Imported ${variables.length} accounts successfully`);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'An error occurred during import');
    },
  });
  const totalCount = accountsData.count;

  // Reset to first page + selection when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedAccountIds(new Set());
  }, [debouncedSearchTerm, selectedCreatedByIds, pageSize, createdOnRange, updatedOnRange]);

  // Clear selection when page changes
  React.useEffect(() => {
    setSelectedAccountIds(new Set());
  }, [currentPage]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedAccounts = accounts; // Data is already paginated from server

  // ---------------------------------------------------------------------------
  // Row selection (checkbox) logic
  // ---------------------------------------------------------------------------
  const allVisibleIds = paginatedAccounts.map((a: Account) => a.id);

  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id: string) => selectedAccountIds.has(id));

  const isIndeterminate =
    !isAllSelected && allVisibleIds.some((id: string) => selectedAccountIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedAccountIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id: string) => next.delete(id));
        return next;
      });
    } else {
      setSelectedAccountIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id: string) => next.add(id));
        return next;
      });
    }
  }, [isAllSelected, allVisibleIds]);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  const serializeAccountRow = useCallback(
    (account: Account): Record<string, string> => {
      const base: Record<string, string> = {
        account_name:        account.account_name ?? '',
        website:             account.website ?? '',
        industry:            account.industry?.industry_name ?? '',
        phone_number:        account.phone_number ?? '',
        company_size:        account.company_size ?? '',
        billing_street:      account.billing_street ?? '',
        billing_city:        account.billing_city ?? '',
        billing_state:       account.billing_state ?? '',
        billing_postal_code: account.billing_postal_code ?? '',
        billing_country:     account.billing_country ?? '',
        description:         (account as any).description ?? '',
        owner:               account.owner?.name ?? '',
        created_by:          account.created_by_account?.name ?? account.created_by ?? '',
        created_at:          account.created_at ? formatDate(account.created_at) : '',
        updated_by:          account.updated_by_account?.name ?? account.updated_by ?? '',
      };

      // Append custom fields
      customFields.forEach((cf) => {
        base[cf.field_key] = String(
          (account as any).custom_fields?.[cf.field_key] ?? '',
        );
      });

      return base;
    },
    [customFields, formatDate],
  );

  const exportColumns = useMemo(() => {
    const cols = [
      ...EXPORT_COLUMNS,
      ...customFields.map((cf) => ({ key: cf.field_key, label: cf.field_label })),
    ];
    return _fieldPermissionCtx
      ? filterExportColumns(cols, _fieldPermissionCtx)
      : cols;
  }, [customFields, EXPORT_COLUMNS, _fieldPermissionCtx]);

  const handleExportAll = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      setIsExporting(true);
      const allAccountsResult = await getAccountsService({
        workspaceId: workspace.id,
        page: 1,
        limit: 10000,
        searchTerm: debouncedSearchTerm,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
        updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
        updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
        createdByIds: selectedCreatedByIds.length > 0 ? selectedCreatedByIds : undefined,
      });

      const allAccounts = allAccountsResult.data as Account[];

      if (allAccounts.length === 0) {
        toast.info('No accounts to export.');
        return;
      }

      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const headerRow = exportColumns.map((c) => c.label);
      const dataRows = allAccounts.map((account) => {
        const flat = serializeAccountRow(account);
        return exportColumns.map((c) => flat[c.key] ?? '');
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `accounts_export_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${allAccounts.length} accounts successfully.`);
    } catch (err) {
      toast.error('Failed to export accounts.');
      console.error('Export All error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [
    workspace?.id,
    debouncedSearchTerm,
    sortColumn,
    sortDirection,
    computedCreatedOnDates,
    computedUpdatedOnDates,
    selectedCreatedByIds,
    exportColumns,
    serializeAccountRow,
  ]);

  const handleExportSelected = useCallback(async () => {
    const selectedRows = paginatedAccounts.filter((a: Account) =>
      selectedAccountIds.has(a.id),
    ) as Account[];

    if (selectedRows.length === 0) {
      toast.info('No rows selected.');
      return;
    }

    try {
      setIsExporting(true);
      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const headerRow = exportColumns.map((c) => c.label);
      const dataRows = selectedRows.map((account) => {
        const flat = serializeAccountRow(account);
        return exportColumns.map((c) => flat[c.key] ?? '');
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `accounts_export_selected_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${selectedRows.length} selected account${selectedRows.length > 1 ? 's' : ''} successfully.`);
    } catch (err) {
      toast.error('Failed to export selected accounts.');
      console.error('Export Selected error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [paginatedAccounts, selectedAccountIds, exportColumns, serializeAccountRow]);

  if (!workspace) {
    return <AccountsPageSkeleton />;
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Accounts"
          description="Manage your client accounts"
        />
        <PageBody>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-red-500">Failed to load accounts</p>
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
    <ModuleGuard module="accounts">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Accounts (${totalCount})`}
          description="Manage your client accounts and organizations"
        />
      </div>

      {/* Full-width search / filter / actions toolbar */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pt-2 pb-2">
        <ListToolBar
          showSearch
          searchPlaceholder="Search by account name..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterGroups={[
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
          activeFilterCount={
            (selectedCreatedByIds.length > 0 ? 1 : 0) +
            (createdOnRange ? 1 : 0) +
            (updatedOnRange ? 1 : 0)
          }
          onClearFilters={() => {
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
              show: canAccess('accounts', 'import'),
              buttonVariant: 'outline',
            },
            {
              key: 'add',
              label: 'New Account',
              icon: Plus,
              onClick: () => setCreateDialogOpen(true),
              show: canAccess('accounts', 'create'),
              buttonVariant: 'default',
            },
          ]}
          exportSlot={
            canAccess('accounts', 'read') ? (
              <CsvExportButton
                selectedCount={selectedAccountIds.size}
                onExportAll={handleExportAll}
                onExportSelected={handleExportSelected}
                isExporting={isExporting}
              />
            ) : null
          }
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
                entityLabel="accounts"
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
                          data-min-width={(field as any).minWidth}
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
                  ) : (
                    <TableHead className="sticky-right-header bg-background z-10 w-12" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[...Array(12)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          className="h-[32px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + 2
                              : 7
                          }
                        >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                        <TableCell className="bg-card right-0 px-4 text-right">
                          <Skeleton className="ml-auto h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibility
                          ? Object.values(visibility).filter((v) => v !== false)
                              .length + 2
                          : 7
                      }
                      className="h-24 text-center"
                    >
                      <div className="text-gray-500">
                        {searchTerm
                          ? 'No accounts match your search'
                          : 'No accounts yet.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccounts.map((account: Account, index: number) => (
                    <TableRow
                      key={account.id}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/home/sales/accounts/${account.id}`)
                      }
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="w-10 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedAccountIds.has(account.id)}
                          onCheckedChange={() => handleSelectRow(account.id)}
                          aria-label={`Select account ${account.account_name}`}
                        />
                      </TableCell>

                      {showColumn('sno') && (
                        <TableCell className="text-muted-foreground w-12">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                      )}
                      {showColumn('name') && (
                        <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                          <span>{account.account_name}</span>
                        </TableCell>
                      )}
                      {showColumn('website') && (
                        <TableCell className="">
                          {account.website ? (
                            <a
                              href={
                                account.website.startsWith('http')
                                  ? account.website
                                  : `https://${account.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {account.website}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
                      {showColumn('industry') && (
                        <TableCell className="">
                          {account.industry?.industry_name || '-'}
                        </TableCell>
                      )}
                      {showColumn('phone') && (
                        <TableCell className="">
                          {account.phone_number || '-'}
                        </TableCell>
                      )}
                      {showColumn('company_size') && (
                        <TableCell className="">
                          {account.company_size || '-'}
                        </TableCell>
                      )}
                      {showColumn('billing_street') && (
                        <TableCell className="">
                          {account.billing_street || '-'}
                        </TableCell>
                      )}
                      {showColumn('billing_city') && (
                        <TableCell className="">
                          {account.billing_city || '-'}
                        </TableCell>
                      )}
                      {showColumn('billing_state') && (
                        <TableCell className="">
                          {account.billing_state || '-'}
                        </TableCell>
                      )}
                      {showColumn('billing_postal_code') && (
                        <TableCell className="">
                          {account.billing_postal_code || '-'}
                        </TableCell>
                      )}
                      {showColumn('billing_country') && (
                        <TableCell className="">
                          {account.billing_country || '-'}
                        </TableCell>
                      )}
                      {showColumn('description') && (
                        <TableCell className="max-w-[200px] truncate">
                          {(account as unknown as { description?: string })
                            .description || '-'}
                        </TableCell>
                      )}
                      {showColumn('owner') && (
                        <TableCell className="">
                          {account.owner?.name || '-'}
                        </TableCell>
                      )}
                      {showColumn('created_by') && (
                        <TableCell className="">
                          {account.created_by_account?.name ||
                            account.created_by ||
                            '-'}
                        </TableCell>
                      )}
                      {showColumn('created_at') && (
                        <TableCell className="">
                          {account.created_at
                            ? formatDate(account.created_at)
                            : '-'}
                        </TableCell>
                      )}
                      {showColumn('updated_by') && (
                        <TableCell className="">
                          {account.updated_by_account?.name ||
                            account.updated_by ||
                            '-'}
                        </TableCell>
                      )}
                      {customFields.map((field) =>
                        showColumn(field.field_key) ? (
                          <TableCell key={field.id}>
                            {String(
                              (
                                account as unknown as {
                                  custom_fields?: Record<string, unknown>;
                                }
                              ).custom_fields?.[field.field_key] ?? '-',
                            )}
                          </TableCell>
                        ) : null,
                      )}
                      <TableCell className="bg-card group sticky right-0 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EntityActionsDropdown
                            id={account.id}
                            viewPath={`/home/sales/accounts/${account.id}`}
                            canDelete={canAccess('accounts', 'delete')}
                            onDelete={() => {
                              setAccountToDelete(account);
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

        <CreateAccountDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => refetch()}
        />

        <CsvImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          title="Import Accounts from CSV"
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

        <AddColumnModal
          open={addColumnModalOpen}
          onOpenChange={setAddColumnModalOpen}
          entityType="accounts"
          roles={moduleRoles}
          teamMembers={teamMembersForModal}
          isAdmin={canAddColumn}
          isSubmitting={createField.isPending}
          onSubmit={async (payload) => {
            await createField.mutateAsync({
              ...payload,
              workspace_id: workspace?.id || '',
              product_key: 'sales',
              entity_type: 'accounts',
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
          entityId={accountToDelete?.id || ''}
          entityType="account"
          entityName={accountToDelete?.account_name || ''}
          onSuccess={() => {
            setAccountToDelete(null);
            refetch();
          }}
        />
      </PageBody>
    </ModuleGuard>
  );
}
