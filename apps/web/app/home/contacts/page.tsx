'use client';

import React, { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

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
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
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
  const { currentWorkspace: workspace, canAccess, user } = useRBAC();
  const { formatDate } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
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
      }),
    enabled: !!workspace?.id,
  });

  const contacts = contactsData.data;
  const totalCount = contactsData.count;

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, pageSize, createdOnRange, updatedOnRange]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedContacts = contacts; // Data is already paginated from server

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
            (createdOnRange ? 1 : 0) + (updatedOnRange ? 1 : 0)
          }
          onClearFilters={() => {
            clearCreatedOnRange();
            clearUpdatedOnRange();
          }}
          actions={[
            {
              key: 'add',
              label: 'New Contact',
              icon: Plus,
              onClick: () => setCreateDialogOpen(true),
              show: canAccess('contacts', 'create'),
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
                entityLabel="contacts"
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
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
                                ).length + 1
                              : 7
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
                              .length + 1
                          : 7
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
