'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Filter, Plus, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
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

export default function AccountsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  const {
    data: accounts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['accounts', workspace.id],
    queryFn: () => getAccountsService(workspace.id),
    enabled: !!workspace.id,
  });

  // Get unique statuses from accounts for filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Map();
    accounts?.forEach((account: Account) => {
      if (account.status && !statuses.has(account.status.id)) {
        statuses.set(account.status.id, account.status);
      }
    });
    return Array.from(statuses.values());
  }, [accounts]);

  // Filter and search accounts
  const filteredAccounts = useMemo(() => {
    return accounts?.filter((account: Account) => {
      const matchesSearch =
        account.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.phone_number?.includes(searchTerm);

      const matchesStatus =
        selectedStatus === 'all' || account.status_id === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [accounts, searchTerm, selectedStatus]);

  if (error) {
    return (
      <>
        <PageHeader title="Accounts" description="Manage your business accounts" />
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
    <>
      <PageHeader title="Accounts" description="Manage your business accounts (B2B)">
        {/* Future: Add Create Account button */}
        {/* 
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Account
        </Button>
       */}
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Search and Filter Bar */}
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
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {availableStatuses.map((status: any) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.status_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0 pt-6">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-900">
                        Account Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Phone
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Owner
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Created At
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading accounts...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm || selectedStatus !== 'all'
                              ? 'No accounts match your filters'
                              : 'No accounts yet.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account: Account) => (
                        <TableRow
                          key={account.id}
                          className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                        >
                          <TableCell className="font-medium text-gray-900">
                            {/* Link to detail page coming soon */}
                            {account.account_name}
                          </TableCell>
                          <TableCell>
                            {account.status && (
                              <Badge
                                variant="secondary"
                                className="gap-1"
                                style={{
                                  backgroundColor: `${account.status.color}20`,
                                  color: account.status.color,
                                  borderColor: account.status.color,
                                }}
                              >
                                {account.status.status_name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {account.phone_number || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {account.owner?.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(account.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" asChild className="h-auto p-0 text-blue-600 hover:text-blue-700">
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
        </div>
      </PageBody>
    </>
  );
}
