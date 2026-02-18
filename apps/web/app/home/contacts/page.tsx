'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Contact, getContactsService } from '~/services/contacts.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { CreateContactDialog } from './components/create-contact-dialog';

export default function ContactsPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { data: user } = useUser();

  const columns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'name', label: 'Name' },
      { id: 'first_name', label: 'First Name' },
      { id: 'last_name', label: 'Last Name' },
      { id: 'job_title', label: 'Job Title' },
      { id: 'email', label: 'Email' },
      { id: 'phone', label: 'Phone' },
      { id: 'account', label: 'Account' },
      { id: 'notes', label: 'Notes' },
      { id: 'is_public', label: 'Public' },
      { id: 'owner', label: 'Owner' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('contacts', {
      sno: true,
      name: true,
      first_name: false,
      last_name: false,
      job_title: false,
      email: true,
      phone: true,
      account: true,
      notes: false,
      is_public: false,
      owner: true,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    data: contactsData = { data: [], count: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts', workspace?.id, currentPage, debouncedSearchTerm],
    queryFn: () =>
      getContactsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
      }),
    enabled: !!workspace?.id,
  });

  const contacts = contactsData.data;
  const totalCount = contactsData.count;

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedContacts = contacts; // Data is already paginated from server

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
    <ModuleGuard module="contacts">
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="bg-sidebar flex shrink-0 flex-col gap-2">
          <PageHeader
            className="bg-sidebar shrink-0 px-6 py-4"
            title={`Contacts (${totalCount})`}
            description="Manage your contacts (People)"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-64 lg:w-72">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or account..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-10"
                />
              </div>
              {canAccess('contacts', 'create') && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Contact
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
        </div>

        <PageBody className="bg-sidebar sticky -mt-6 flex min-h-0 flex-1 flex-col overflow-hidden pt-6 pb-0">
          <div className="flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="flex-1 overflow-auto rounded-lg">
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        {isVisible('sno') && (
                          <TableHead className="w-12 whitespace-nowrap">
                            S. No.
                          </TableHead>
                        )}
                        {isVisible('name') && <TableHead>Name</TableHead>}
                        {isVisible('first_name') && (
                          <TableHead>First Name</TableHead>
                        )}
                        {isVisible('last_name') && (
                          <TableHead>Last Name</TableHead>
                        )}
                        {isVisible('job_title') && (
                          <TableHead>Job Title</TableHead>
                        )}
                        {isVisible('email') && <TableHead>Email</TableHead>}
                        {isVisible('phone') && <TableHead>Phone</TableHead>}
                        {isVisible('account') && <TableHead>Account</TableHead>}
                        {isVisible('notes') && <TableHead>Notes</TableHead>}
                        {isVisible('is_public') && (
                          <TableHead>Public</TableHead>
                        )}
                        {isVisible('owner') && <TableHead>Owner</TableHead>}
                        {isVisible('created_by') && (
                          <TableHead>Created By</TableHead>
                        )}
                        {isVisible('created_at') && (
                          <TableHead>Created On</TableHead>
                        )}
                        {isVisible('updated_by') && (
                          <TableHead>Last Updated By</TableHead>
                        )}
                        <TableHead className="bg-card sticky right-0 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
                                : 7
                            }
                            className="h-24 text-center"
                          >
                            <div className="flex items-center justify-center">
                              <div className="text-gray-500">
                                Loading contacts...
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedContacts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
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
                        paginatedContacts.map(
                          (contact: Contact, index: number) => (
                            <TableRow
                              key={contact.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() =>
                                router.push(`/home/contacts/${contact.id}`)
                              }
                            >
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('name') && (
                                <TableCell className="font-medium">
                                  <span>
                                    {contact.first_name}{' '}
                                    {contact.last_name || ''}
                                  </span>
                                </TableCell>
                              )}
                              {isVisible('first_name') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.first_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('last_name') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.last_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('job_title') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.job_title || '-'}
                                </TableCell>
                              )}
                              {isVisible('email') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.email || '-'}
                                </TableCell>
                              )}
                              {isVisible('phone') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.phone_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('account') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.account?.account_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('notes') && (
                                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                  {contact.notes || '-'}
                                </TableCell>
                              )}
                              {isVisible('is_public') && (
                                <TableCell className="text-muted-foreground text-center">
                                  {contact.is_public ? (
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
                                  {contact.owner?.name || '-'}
                                </TableCell>
                              )}
                              {isVisible('created_by') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.created_by_account?.name ||
                                    contact.created_by ||
                                    '-'}
                                </TableCell>
                              )}
                              {isVisible('created_at') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.created_at
                                    ? new Date(
                                        contact.created_at,
                                      ).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('updated_by') && (
                                <TableCell className="text-muted-foreground">
                                  {/* {contact.updated_by || '-'} */}
                                </TableCell>
                              )}
                              <TableCell className="bg-card sticky right-0 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <EntityActionsDropdown
                                    id={contact.id}
                                    viewPath={`/home/contacts/${contact.id}`}
                                    canDelete={canAccess('contacts', 'delete')}
                                    onDelete={() => {
                                      setContactToDelete(contact);
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
                  </table>
                </div>
              </CardContent>
            </Card>

            {totalCount > 0 && (
              <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 flex items-center justify-between border-t p-4 px-6">
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
                  contacts
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

            <CreateContactDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSuccess={() => refetch()}
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
          </div>
        </PageBody>
      </div>
    </ModuleGuard>
  );
}
