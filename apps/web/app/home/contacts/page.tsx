'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';

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
import { getContactsService, Contact } from '~/services/contacts.service';

export default function ContactsPage() {
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
    data: contacts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts', workspace.id],
    queryFn: () => getContactsService(workspace.id),
    enabled: !!workspace.id,
  });

  // Get unique statuses from contacts for filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Map();
    contacts?.forEach((contact: Contact) => {
      if (contact.status && !statuses.has(contact.status.id)) {
        statuses.set(contact.status.id, contact.status);
      }
    });
    return Array.from(statuses.values());
  }, [contacts]);

  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    return contacts?.filter((contact: Contact) => {
      const matchesSearch =
        contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.account?.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || contact.status_id === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchTerm, selectedStatus]);

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
    <>
      <PageHeader title="Contacts" description="Manage your contacts (People)">
        {/* Future: Add Create Contact button */}
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
                    placeholder="Search by name, email, or account..."
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
                        Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Email
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Account
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        Status
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
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading contacts...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm || selectedStatus !== 'all'
                              ? 'No contacts match your filters'
                              : 'No contacts yet.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact: Contact) => (
                        <TableRow
                          key={contact.id}
                          className="border-b border-gray-200 transition-colors hover:bg-gray-50"
                        >
                          <TableCell className="font-medium text-gray-900">
                            {contact.first_name} {contact.last_name || ''}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {contact.email || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {contact.account?.account_name || '-'}
                          </TableCell>
                          <TableCell>
                            {contact.status && (
                              <Badge
                                variant="secondary"
                                className="gap-1"
                                style={{
                                  backgroundColor: `${contact.status.color}20`,
                                  color: contact.status.color,
                                  borderColor: contact.status.color,
                                }}
                              >
                                {contact.status.status_name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {contact.owner?.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(contact.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* <Link href={`/home/contacts/${contact.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                              View
                            </Link> */}
                            <span className="text-sm text-gray-400">View</span>
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
