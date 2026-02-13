'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Account, getAccountsService } from '~/services/accounts.service';

import { CreateAccountDialog } from './components/create-account-dialog';

export default function AccountsPage() {
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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
      { id: 'is_public', label: 'Public' },
      { id: 'owner', label: 'Owner' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_at', label: 'Last Updated On' },
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
      is_public: false,
      owner: true,
      created_at: false,
      updated_at: false,
    });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    data: accountsData = { data: [], count: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['accounts', workspace?.id, currentPage, debouncedSearchTerm],
    queryFn: () =>
      getAccountsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
      }),
    enabled: !!workspace?.id,
  });

  const accounts = accountsData.data;
  const totalCount = accountsData.count;

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedAccounts = accounts; // Data is already paginated from server

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
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
      <div className="flex h-[100dvh] flex-col">
        <PageHeader
          className="bg-sidebar shrink-0 px-6 py-4"
          title={`Accounts (${totalCount})`}
          description="Manage your client accounts and organizations"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-64 lg:w-72">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by account name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-10"
              />
            </div>
            {canAccess('accounts', 'create') && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                New Account
              </Button>
            )}

            <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          </div>
        </PageHeader>

        <PageBody className="bg-sidebar flex min-h-0 flex-1 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 flex-1 flex-col space-y-6">
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 flex-1 flex-col p-2">
                <div className="flex-1 overflow-auto rounded-lg">
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        {isVisible('sno') && (
                          <TableHead className="w-12 whitespace-nowrap">
                            S. No.
                          </TableHead>
                        )}
                        {isVisible('name') && (
                          <TableHead>Account Name</TableHead>
                        )}
                        {isVisible('website') && <TableHead>Website</TableHead>}
                        {isVisible('industry') && (
                          <TableHead>Industry</TableHead>
                        )}
                        {isVisible('phone') && <TableHead>Phone</TableHead>}
                        {isVisible('company_size') && (
                          <TableHead>Size</TableHead>
                        )}
                        {isVisible('billing_street') && (
                          <TableHead>Street</TableHead>
                        )}
                        {isVisible('billing_city') && (
                          <TableHead>City</TableHead>
                        )}
                        {isVisible('billing_state') && (
                          <TableHead>State</TableHead>
                        )}
                        {isVisible('billing_postal_code') && (
                          <TableHead>Postal Code</TableHead>
                        )}
                        {isVisible('billing_country') && (
                          <TableHead>Country</TableHead>
                        )}
                        {isVisible('description') && (
                          <TableHead>Description</TableHead>
                        )}
                        {isVisible('is_public') && (
                          <TableHead>Public</TableHead>
                        )}
                        {isVisible('owner') && <TableHead>Owner</TableHead>}
                        {isVisible('created_at') && (
                          <TableHead>Created On</TableHead>
                        )}
                        {isVisible('updated_at') && (
                          <TableHead>Last Updated On</TableHead>
                        )}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow className="m-5">
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
                            <div className="flex items-center justify-center">
                              <div className="text-gray-500">
                                Loading accounts...
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
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
                            <TableRow key={account.id}>
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12 p-4">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('name') && (
                                <TableCell className="font-medium">
                                  <Link
                                    href={`/home/accounts/${account.id}`}
                                    className="hover:underline"
                                  >
                                    {account.account_name}
                                  </Link>
                                </TableCell>
                              )}
                              {isVisible('website') && (
                                <TableCell className="text-muted-foreground">
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
                                <TableCell className="text-muted-foreground">
                                  {account.industry?.industry_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('phone') && (
                                <TableCell className="text-muted-foreground">
                                  {account.phone_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_size') && (
                                <TableCell className="text-muted-foreground">
                                  {account.company_size || '-'}
                                </TableCell>
                              )}
                              {isVisible('billing_street') && (
                                <TableCell className="text-muted-foreground">
                                  {account.billing_street || '-'}
                                </TableCell>
                              )}
                              {isVisible('billing_city') && (
                                <TableCell className="text-muted-foreground">
                                  {account.billing_city || '-'}
                                </TableCell>
                              )}
                              {isVisible('billing_state') && (
                                <TableCell className="text-muted-foreground">
                                  {account.billing_state || '-'}
                                </TableCell>
                              )}
                              {isVisible('billing_postal_code') && (
                                <TableCell className="text-muted-foreground">
                                  {account.billing_postal_code || '-'}
                                </TableCell>
                              )}
                              {isVisible('billing_country') && (
                                <TableCell className="text-muted-foreground">
                                  {account.billing_country || '-'}
                                </TableCell>
                              )}
                              {isVisible('description') && (
                                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                  {account.description || '-'}
                                </TableCell>
                              )}
                              {isVisible('is_public') && (
                                <TableCell className="text-muted-foreground text-center">
                                  {account.is_public ? (
                                    <Badge
                                      variant="outline"
                                      className="border-green-200 bg-green-50 text-green-600"
                                    >
                                      Public
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-200 bg-amber-50 text-amber-600"
                                    >
                                      Private
                                    </Badge>
                                  )}
                                </TableCell>
                              )}
                              {isVisible('owner') && (
                                <TableCell className="text-muted-foreground">
                                  {account.owner?.name || '-'}
                                </TableCell>
                              )}
                              {isVisible('created_at') && (
                                <TableCell className="text-muted-foreground">
                                  {new Date(
                                    account.created_at,
                                  ).toLocaleDateString()}
                                </TableCell>
                              )}
                              {isVisible('updated_at') && (
                                <TableCell className="text-muted-foreground">
                                  {new Date(
                                    account.updated_at,
                                  ).toLocaleDateString()}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                <Button
                                  variant="link"
                                  asChild
                                  className="text-primary h-auto p-0 hover:underline"
                                >
                                  {canAccess('accounts', 'view') && (
                                    <Link href={`/home/accounts/${account.id}`}>
                                      View
                                    </Link>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ),
                        )
                      )}
                    </TableBody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {totalCount > 0 && (
              <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 -mb-4 flex items-center justify-between border-t p-4 px-6 lg:-mb-8">
                <div>
                  Showing{' '}
                  <span className="text-foreground font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="text-foreground font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{' '}
                  of{' '}
                  <span className="text-foreground font-medium">
                    {totalCount}
                  </span>{' '}
                  accounts
                </div>
                <Pagination className="w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        className={
                          currentPage === 1
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        className={
                          currentPage === totalPages
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            <CreateAccountDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSuccess={() => refetch()}
            />
          </div>
        </PageBody>
      </div>
    </ModuleGuard>
  );
}
