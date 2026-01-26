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
import { getContactsService, Contact } from '~/services/contacts.service';
import { CreateContactDialog } from './components/create-contact-dialog';

export default function ContactsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    data: contacts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts', workspace?.id],
    queryFn: () => getContactsService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const filteredContacts = useMemo(() => {
    return contacts?.filter((contact: Contact) => {
      const matchesSearch =
        contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.account?.account_name?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [contacts, searchTerm]);

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
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Contact
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
                    placeholder="Search by name, email, or account..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                              Loading contacts...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm
                              ? 'No contacts match your search'
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
                          <TableCell className="text-gray-600">
                            {contact.owner?.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(contact.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" asChild className="h-auto p-0 text-blue-600 hover:text-blue-700">
                              <Link href={`/home/contacts/${contact.id}`}>View</Link>
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

          <CreateContactDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSuccess={() => refetch()}
          />
        </div>
      </PageBody>
    </>
  );
}
