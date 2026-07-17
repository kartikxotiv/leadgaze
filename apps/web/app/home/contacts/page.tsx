'use client';

import React, { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, FileUp, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
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

import { AddColumnModal } from '@kit/ui/add-column-modal';
import { ColumnEditModal } from '@kit/ui/column-edit-modal';
import type { ColumnEditFieldShape } from '@kit/ui/column-edit-modal';
import { ColumnHeader } from '@kit/ui/column-header';
import { CsvExportButton } from '@kit/ui/csv-export-button';
import { CsvImportDialog } from '@kit/ui/csv-import-dialog';
import { filterExportColumns } from '~/lib/field-permission';
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
import { useLocalization } from '~/lib/localization/localization-provider';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useModuleRoles, useRBAC } from '~/lib/rbac/rbac-provider';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import { Contact, getContactsService } from '~/services/contacts.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { CreateContactDialog } from './components/create-contact-dialog';

function ContactsPageSkeleton() {
  return (
    <ModuleGuard module="contacts">
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 flex-1 flex-col px-4 lg:px-8">
            <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
              <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    {[40, 120, 120, 100, 160, 120, 120, 120, 120, 80].map(
                      (w, i) => (
                        <th
                          key={i}
                          className="border-border h-11 border-b px-4"
                        >
                          <Skeleton className="h-3" style={{ width: w }} />
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(12)].map((_, row) => (
                    <tr key={row} className="bg-card border-border border-b">
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-6" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-32" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-24" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-24" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-40" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-28" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-28" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-24" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="h-3.5 w-20" />
                      </td>
                      <td className="h-11 px-4">
                        <Skeleton className="ml-auto h-6 w-6 rounded" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace, canAccess, user } = useRBAC();
  const { formatDate } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>(
    [],
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;

  // Row selection state (for CSV export)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
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
      },
      { id: 'name', key: 'name', label: 'Name', sortKey: 'first_name' },
      { id: 'first_name', key: 'first_name', label: 'First Name' },
      { id: 'last_name', key: 'last_name', label: 'Last Name' },
      { id: 'job_title', key: 'job_title', label: 'Job Title' },
      { id: 'email', key: 'email', label: 'Email' },
      { id: 'phone', key: 'phone', label: 'Phone', sortable: false },
      {
        id: 'account',
        key: 'account',
        label: 'Account',
        sortKey: 'account.account_name',
      },
      { id: 'owner', key: 'owner', label: 'Owner', sortKey: 'owner.name' },
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
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'account', label: 'Account' },
      { key: 'notes', label: 'Notes' },
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
    entityType: 'contacts',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id && !!user?.id,
  });

  const { mergedDefaults, persistVisibility } = useLeadsColumnPreferences({
    entityType: 'contacts',
    workspaceId: workspace?.id,
    userId: user?.id,
    defaultVisibility: {
      sno: true,
      name: true,
      first_name: false,
      last_name: false,
      job_title: false,
      email: true,
      phone: true,
      account: true,
      notes: false,
      owner: true,
      created_by: false,
      created_at: false,
      updated_by: true,
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
    entityType: 'contacts',
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

  const { visibility, toggleVisibility, isVisible, reset, mergeNewColumns } =
    useColumnVisibility('contacts', mergedDefaults);

  useSyncColumnVisibilityToDb(visibility, persistVisibility, !!workspace?.id);

  React.useEffect(() => {
    mergeNewColumns(
      Object.fromEntries(customFields.map((cf) => [cf.field_key, true])),
    );
  }, [customFields, mergeNewColumns]);

  const showColumn = useMemo(
    () => (columnId: string) => isVisible(columnId) && canViewColumn(columnId),
    [isVisible, canViewColumn],
  );

  const importColumns = useMemo(() => {
    const cols = [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'alt_email', label: 'Alt Email' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'mobile_number', label: 'Mobile' },
      { key: 'alt_phone', label: 'Alt Phone' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'department', label: 'Department' },
      { key: 'account_id', label: 'Account ID' },
      { key: 'status_id', label: 'Status ID' },
      { key: 'owner_id', label: 'Owner ID' },
      { key: 'is_primary', label: 'Is Primary' },
      { key: 'do_not_call', label: 'Do Not Call' },
      { key: 'do_not_email', label: 'Do Not Email' },
      { key: 'email_bounced', label: 'Email Bounced' },
      { key: 'location', label: 'Location' },
      { key: 'timezone', label: 'Timezone' },
      { key: 'language', label: 'Language' },
      { key: 'preferred_contact_method', label: 'Preferred Contact Method' },
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'twitter_handle', label: 'Twitter Handle' },
      { key: 'notes', label: 'Notes' },
      ...customFields.map((field) => ({
        key: field.field_key,
        label: field.field_label,
        required: false,
      })),
    ];
    return _fieldPermissionCtx
      ? filterExportColumns(cols, _fieldPermissionCtx)
      : cols;
  }, [_fieldPermissionCtx, customFields]);

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
      entity_type: 'contacts',
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
      canAccess('contacts', 'admin') ||
      canAccess('contacts', 'update') ||
      canAccess('contacts', 'create')
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
      if (!fieldId && editingField) {
        await createField.mutateAsync({
          workspace_id: workspace?.id || '',
          entity_type: 'contacts',
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

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('contacts');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { sortColumn, sortDirection, toggleSort, sortState } =
    useTableSort<Contact>('contacts', [], {
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
    data: contactsData = { data: [], count: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'contacts',
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
      getContactsService({
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

  const contacts = contactsData.data;

  const importMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          data: payload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to import contacts');
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      toast.success(`Imported ${variables.length} contacts successfully`);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'An error occurred during import');
    },
  });
  const totalCount = contactsData.count;

  // Reset to first page + selection when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedContactIds(new Set());
  }, [debouncedSearchTerm, selectedCreatedByIds, pageSize, createdOnRange, updatedOnRange]);

  // Clear selection when page changes
  React.useEffect(() => {
    setSelectedContactIds(new Set());
  }, [currentPage]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedContacts = contacts; // Data is already paginated from server

  // ---------------------------------------------------------------------------
  // Row selection (checkbox) logic
  // ---------------------------------------------------------------------------
  const allVisibleIds = paginatedContacts.map((c: Contact) => c.id);

  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id: string) => selectedContactIds.has(id));

  const isIndeterminate =
    !isAllSelected && allVisibleIds.some((id: string) => selectedContactIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedContactIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id: string) => next.delete(id));
        return next;
      });
    } else {
      setSelectedContactIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id: string) => next.add(id));
        return next;
      });
    }
  }, [isAllSelected, allVisibleIds]);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  const serializeContactRow = useCallback(
    (contact: Contact): Record<string, string> => {
      const base: Record<string, string> = {
        first_name:   contact.first_name ?? '',
        last_name:    contact.last_name ?? '',
        email:        contact.email ?? '',
        phone_number: contact.phone_number ?? '',
        job_title:    contact.job_title ?? '',
        account:      contact.account?.account_name ?? '',
        notes:        contact.notes ?? '',
        owner:        contact.owner?.name ?? '',
        created_by:   contact.created_by_account?.name ?? contact.created_by ?? '',
        created_at:   contact.created_at ? formatDate(contact.created_at) : '',
        updated_by:   contact.updated_by_account?.name ?? contact.updated_by ?? '',
      };

      // Append custom fields
      customFields.forEach((cf) => {
        base[cf.field_key] = String(
          (contact as any).custom_fields?.[cf.field_key] ?? '',
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
      const allContactsResult = await getContactsService({
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

      const allContacts = allContactsResult.data as Contact[];

      if (allContacts.length === 0) {
        toast.info('No contacts to export.');
        return;
      }

      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const headerRow = exportColumns.map((c) => c.label);
      const dataRows = allContacts.map((contact) => {
        const flat = serializeContactRow(contact);
        return exportColumns.map((c) => flat[c.key] ?? '');
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `contacts_export_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${allContacts.length} contacts successfully.`);
    } catch (err) {
      toast.error('Failed to export contacts.');
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
    serializeContactRow,
  ]);

  const handleExportSelected = useCallback(async () => {
    const selectedRows = paginatedContacts.filter((c: Contact) =>
      selectedContactIds.has(c.id),
    ) as Contact[];

    if (selectedRows.length === 0) {
      toast.info('No rows selected.');
      return;
    }

    try {
      setIsExporting(true);
      const { stringifyCsv } = await import('@kit/ui/csv-utils');
      const headerRow = exportColumns.map((c) => c.label);
      const dataRows = selectedRows.map((contact) => {
        const flat = serializeContactRow(contact);
        return exportColumns.map((c) => flat[c.key] ?? '');
      });
      const csvText = stringifyCsv([headerRow, ...dataRows]);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `contacts_export_selected_${dateSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${selectedRows.length} selected contact${selectedRows.length > 1 ? 's' : ''} successfully.`);
    } catch (err) {
      toast.error('Failed to export selected contacts.');
      console.error('Export Selected error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [paginatedContacts, selectedContactIds, exportColumns, serializeContactRow]);

  if (!workspace) {
    return <ContactsPageSkeleton />;
  }

  if (error) {
    return (
      <>
        <PageHeader title="Contacts" description="Manage your contacts" />
        <PageBody>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-red-500">Failed to load contacts</p>
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
    <ModuleGuard module="contacts">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Contacts (${totalCount})`}
          description="Manage your contacts (People)"
        />
      </div>

      {/* Full-width search / filter / actions toolbar */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pt-2 pb-2">
        <ListToolBar
          showSearch
          searchPlaceholder="Search by name, email, or account..."
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
            (createdOnRange ? 1 : 0) + (updatedOnRange ? 1 : 0)
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
              show: canAccess('contacts', 'import'),
              buttonVariant: 'outline',
            },
            {
              key: 'add',
              label: 'New Contact',
              icon: Plus,
              onClick: () => setCreateDialogOpen(true),
              show: canAccess('contacts', 'create'),
              buttonVariant: 'default',
            },
          ]}
          exportSlot={
            canAccess('contacts', 'read') ? (
              <CsvExportButton
                selectedCount={selectedContactIds.size}
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
                entityLabel="contacts"
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
                        className="h-8 w-8 mx-auto flex items-center justify-center border-dashed"
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
                          className="h-[52px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + 2
                              : 8
                          }
                        >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedContacts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibility
                          ? Object.values(visibility).filter((v) => v !== false)
                              .length + 2
                          : 8
                      }
                      className="h-24 text-center"
                    >
                      <div className="text-gray-500">
                        {searchTerm
                          ? 'No contacts match your search'
                          : 'No contacts yet.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedContacts.map((contact: Contact, index: number) => (
                    <TableRow
                      key={contact.id}
                      className="group hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/home/sales/contacts/${contact.id}`)
                      }
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="w-10 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedContactIds.has(contact.id)}
                          onCheckedChange={() => handleSelectRow(contact.id)}
                          aria-label={`Select contact ${contact.first_name}`}
                        />
                      </TableCell>

                      {showColumn('sno') && (
                        <TableCell className="text-muted-foreground w-12">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                      )}
                      {showColumn('name') && (
                        <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                          <span>
                            {contact.first_name} {contact.last_name || ''}
                          </span>
                        </TableCell>
                      )}
                      {showColumn('first_name') && (
                        <TableCell className="">
                          {contact.first_name || '-'}
                        </TableCell>
                      )}
                      {showColumn('last_name') && (
                        <TableCell className="">
                          {contact.last_name || '-'}
                        </TableCell>
                      )}
                      {showColumn('job_title') && (
                        <TableCell className="">
                          {contact.job_title || '-'}
                        </TableCell>
                      )}
                      {showColumn('email') && (
                        <TableCell className="text-muted-foreground">
                          {contact.email || '-'}
                        </TableCell>
                      )}
                      {showColumn('phone') && (
                        <TableCell className="">
                          {contact.phone_number || '-'}
                        </TableCell>
                      )}
                      {showColumn('account') && (
                        <TableCell className="">
                          {contact.account?.account_name || '-'}
                        </TableCell>
                      )}
                      {showColumn('notes') && (
                        <TableCell className="max-w-[200px] truncate">
                          {contact.notes || '-'}
                        </TableCell>
                      )}
                      {showColumn('owner') && (
                        <TableCell className="">
                          {contact.owner?.name || '-'}
                        </TableCell>
                      )}
                      {showColumn('created_by') && (
                        <TableCell className="">
                          {contact.created_by_account?.name ||
                            contact.created_by ||
                            '-'}
                        </TableCell>
                      )}
                      {showColumn('created_at') && (
                        <TableCell className="">
                          {contact.created_at
                            ? formatDate(contact.created_at)
                            : '-'}
                        </TableCell>
                      )}
                      {showColumn('updated_by') && (
                        <TableCell className="">
                          {contact.updated_by_account?.name ||
                            contact.updated_by ||
                            '-'}
                        </TableCell>
                      )}
                      {customFields.map((field) =>
                        showColumn(field.field_key) ? (
                          <TableCell key={field.id}>
                            {String(
                              (
                                contact as unknown as {
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
                            id={contact.id}
                            viewPath={`/home/sales/contacts/${contact.id}`}
                            canDelete={canAccess('contacts', 'delete')}
                            onDelete={() => {
                              setContactToDelete(contact);
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
          {/* closes table area div */}
        </div>
        {/* closes filter panel + table flex row */}

        <CreateContactDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => refetch()}
        />

        <CsvImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          title="Import Contacts from CSV"
          description="Upload a CSV, match each header to a database column, and save the adjusted file before the API upload step."
          columns={importColumns}
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
          entityType="contacts"
          roles={moduleRoles}
          teamMembers={teamMembersForModal}
          isAdmin={canAddColumn}
          isSubmitting={createField.isPending}
          onSubmit={async (payload) => {
            await createField.mutateAsync({
              ...payload,
              workspace_id: workspace?.id || '',
              product_key: 'sales',
              entity_type: 'contacts',
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
          entityId={contactToDelete?.id || ''}
          entityType="contact"
          entityName={`${contactToDelete?.first_name} ${contactToDelete?.last_name || ''}`}
          onSuccess={() => {
            setContactToDelete(null);
            refetch();
          }}
        />
      </PageBody>
    </ModuleGuard>
  );
}
