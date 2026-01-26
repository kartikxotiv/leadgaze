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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService, Account } from '~/services/accounts.service';
import { CreateAccountDialog } from './components/create-account-dialog';
import { ModuleGuard } from '~/lib/rbac/module-guard';

export default function AccountsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    data: accounts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['accounts', workspace?.id],
    queryFn: () => getAccountsService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const filteredAccounts = useMemo(() => {
    return accounts?.filter((account: Account) => {
      const matchesSearch =
        account.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.phone_number?.includes(searchTerm);

      return matchesSearch;
    });
  }, [accounts, searchTerm]);

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
        <PageHeader title="Accounts" description="Manage your client accounts" />
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
      <PageHeader title="Accounts" description="Manage your client accounts and organizations">
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Account
        </Button>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by account name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Account Name
                      </TableHead>
                      <TableHead>
                        Phone
                      </TableHead>
                      <TableHead>
                        Owner
                      </TableHead>
                      <TableHead>
                        Created At
                      </TableHead>
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading accounts...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm
                              ? 'No accounts match your search'
                              : 'No accounts yet.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account: Account) => (
                        <TableRow
                          key={account.id}
                        >
                          <TableCell className="font-medium">
                            {account.account_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.phone_number || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.owner?.name || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(account.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" asChild className="h-auto p-0 text-primary hover:underline">
                              <Link href={`/home/accounts/${account.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

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
