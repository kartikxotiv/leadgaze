'use client';

import React, { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
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
import { Account, getAccountsService } from '~/services/accounts.service';

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
                        <TableCell className="h-[52px] px-4 py-2" colSpan={5}>
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
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const { formatDate } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;
  const { data: user } = useUser();

  const SYSTEM_FIELDS = useMemo(
    () => [
      {
        id: 'sno',
        key: 'sno',
        label: 'S. No.',
        sortable: false,
        width: 'w-12',
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

  const { visibility, toggleVisibility, isVisible, reset, mergeNewColumns } =
    useColumnVisibility('accounts', mergedDefaults);

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
    ],
    queryFn: () =>
      getAccountsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
      }),
    enabled: !!workspace?.id,
  });

  const accounts = accountsData.data;
  const totalCount = accountsData.count;

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, pageSize]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedAccounts = accounts; // Data is already paginated from server

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
          actions={[
            {
              key: 'add',
              label: 'New Account',
              icon: Plus,
              onClick: () => setCreateDialogOpen(true),
              show: canAccess('accounts', 'create'),
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
                entityLabel="accounts"
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
                    {[...Array(12)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          className="h-[52px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + 1
                              : 6
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
                              .length + 1
                          : 6
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
                      {isVisible('sno') && (
                        <TableCell className="text-muted-foreground w-12">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                      )}
                      {isVisible('name') && (
                        <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                          <span>{account.account_name}</span>
                        </TableCell>
                      )}
                      {isVisible('website') && (
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
                      {isVisible('industry') && (
                        <TableCell className="">
                          {account.industry?.industry_name || '-'}
                        </TableCell>
                      )}
                      {isVisible('phone') && (
                        <TableCell className="">
                          {account.phone_number || '-'}
                        </TableCell>
                      )}
                      {isVisible('company_size') && (
                        <TableCell className="">
                          {account.company_size || '-'}
                        </TableCell>
                      )}
                      {isVisible('billing_street') && (
                        <TableCell className="">
                          {account.billing_street || '-'}
                        </TableCell>
                      )}
                      {isVisible('billing_city') && (
                        <TableCell className="">
                          {account.billing_city || '-'}
                        </TableCell>
                      )}
                      {isVisible('billing_state') && (
                        <TableCell className="">
                          {account.billing_state || '-'}
                        </TableCell>
                      )}
                      {isVisible('billing_postal_code') && (
                        <TableCell className="">
                          {account.billing_postal_code || '-'}
                        </TableCell>
                      )}
                      {isVisible('billing_country') && (
                        <TableCell className="">
                          {account.billing_country || '-'}
                        </TableCell>
                      )}
                      {isVisible('description') && (
                        <TableCell className="max-w-[200px] truncate">
                          {(account as unknown as { description?: string })
                            .description || '-'}
                        </TableCell>
                      )}
                      {isVisible('owner') && (
                        <TableCell className="">
                          {account.owner?.name || '-'}
                        </TableCell>
                      )}
                      {isVisible('created_by') && (
                        <TableCell className="">
                          {account.created_by_account?.name ||
                            account.created_by ||
                            '-'}
                        </TableCell>
                      )}
                      {isVisible('created_at') && (
                        <TableCell className="">
                          {account.created_at
                            ? formatDate(account.created_at)
                            : '-'}
                        </TableCell>
                      )}
                      {isVisible('updated_by') && (
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
