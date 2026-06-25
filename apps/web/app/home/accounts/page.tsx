'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { PageBody, PageHeader } from '@kit/ui/page';

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

import { Skeleton } from '@kit/ui/skeleton';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Account, getAccountsService } from '~/services/accounts.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { CreateAccountDialog } from './components/create-account-dialog';
import { TablePagination } from '@kit/ui/table-pagination';
import { useLocalization } from '~/lib/localization/localization-provider';

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
                      <TableHead className="w-12 whitespace-nowrap">S. No.</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="sticky right-0 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(12)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[52px] px-4 py-2" colSpan={5}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                        <TableCell className="bg-card right-0 px-4 text-right">
                          <Skeleton className="h-7 ml-auto w-full" />
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

  const columns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'name', label: 'Account Name' },
      { id: 'website', label: 'Website' },
      { id: 'industry', label: 'Industry' },
      { id: 'phone', label: 'Phone' },
      { id: 'company_size', label: 'Size' },
      { id: 'billing_street', label: 'Street' },
      { id: 'billing_city', label: 'City' },
      { id: 'billing_state', label: 'State' },
      { id: 'billing_postal_code', label: 'Postal Code' },
      { id: 'billing_country', label: 'Country' },
      { id: 'description', label: 'Description' },
      { id: 'owner', label: 'Owner' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('accounts', {
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
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('accounts');


  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { sortColumn, sortDirection, toggleSort, sortState } = useTableSort<Account>(
    'accounts',
    [],
    { mode: 'server', onSortChange: () => setCurrentPage(1) }
  );

  const {
    data: accountsData = { data: [], count: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['accounts', workspace?.id, currentPage, debouncedSearchTerm, pageSize, sortState],
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
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2 pt-2">
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
    label="Account Name"
    columnId="name"
    sortKey="account_name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('name')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('name')} />
  </SortableTableHead>
)}
                  {isVisible('website') && (
  <SortableTableHead
    label="Website"
    columnId="website"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    sortable={false}
    className="relative"
    {...getHeaderProps('website')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('website')} />
  </SortableTableHead>
)}
                  {isVisible('industry') && (
  <SortableTableHead
    label="Industry"
    columnId="industry"
    sortKey="industry.industry_name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('industry')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('industry')} />
  </SortableTableHead>
)}
                  {isVisible('phone') && (
  <SortableTableHead
    label="Phone"
    columnId="phone"
    sortKey="phone_number"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    sortable={false}
    {...getHeaderProps('phone')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('phone')} />
  </SortableTableHead>
)}
                  {isVisible('company_size') && (
  <SortableTableHead
    label="Size"
    columnId="company_size"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('company_size')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('company_size')} />
  </SortableTableHead>
)}
                  {isVisible('billing_street') && (
  <SortableTableHead
    label="Street"
    columnId="billing_street"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('billing_street')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('billing_street')} />
  </SortableTableHead>
)}
                  {isVisible('billing_city') && (
  <SortableTableHead
    label="City"
    columnId="billing_city"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('billing_city')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('billing_city')} />
  </SortableTableHead>
)}
                  {isVisible('billing_state') && (
  <SortableTableHead
    label="State"
    columnId="billing_state"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('billing_state')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('billing_state')} />
  </SortableTableHead>
)}
                  {isVisible('billing_postal_code') && (
  <SortableTableHead
    label="Postal Code"
    columnId="billing_postal_code"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('billing_postal_code')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('billing_postal_code')} />
  </SortableTableHead>
)}
                  {isVisible('billing_country') && (
  <SortableTableHead
    label="Country"
    columnId="billing_country"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('billing_country')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('billing_country')} />
  </SortableTableHead>
)}
                  {isVisible('description') && (
  <SortableTableHead
    label="Description"
    columnId="description"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    sortable={false}
    {...getHeaderProps('description')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('description')} />
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
                          <Skeleton className="h-7 ml-auto w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibility
                          ? Object.values(visibility).filter(
                              (v) => v !== false,
                            ).length + 1
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
                  paginatedAccounts.map(
                    (account: Account, index: number) => (
                      <TableRow
                        key={account.id}
                        className="hover:bg-muted/50 cursor-pointer"
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
                            {account.description || '-'}
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
                        <TableCell className="bg-card sticky right-0 px-4 text-right">
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
                    ),
                  )
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
