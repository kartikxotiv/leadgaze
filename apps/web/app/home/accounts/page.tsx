'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
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

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Account, getAccountsService } from '~/services/accounts.service';

import { CreateAccountDialog } from './components/create-account-dialog';

export default function AccountsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
      <PageHeader
        className="sticky top-0 z-10 -mx-4 border-b bg-[#F2F2F2] p-4 lg:-mx-8 lg:px-8"
        title={`Accounts (${totalCount})`}
        description="Manage your client accounts and organizations"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-64 lg:w-72">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by account name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-10"
            />
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="h-9 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Account
          </Button>
        </div>
      </PageHeader>

      <PageBody className="flex flex-1 flex-col bg-[#F2F2F2]">
        <div className="flex flex-1 flex-col space-y-6">
          <Card className="flex flex-1 flex-col border-none shadow-none">
            <CardContent className="flex flex-1 flex-col p-2">
              <div className="flex-1 overflow-y-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 whitespace-nowrap">
                        S. No.
                      </TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="m-5">
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading accounts...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
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
                            <TableCell className="text-muted-foreground w-12">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </TableCell>
                            <TableCell className="p-3 font-medium">
                              {account.account_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {account.phone_number || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {account.owner?.name || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(
                                account.created_at,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="link"
                                asChild
                                className="text-primary h-auto p-0 hover:underline"
                              >
                                <Link href={`/home/accounts/${account.id}`}>
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalCount > 0 && (
            <div className="text-muted-foreground sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center justify-between border-t bg-[#F2F2F2] p-4 lg:-mx-8 lg:-mb-8">
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
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
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
    </ModuleGuard>
  );
}
