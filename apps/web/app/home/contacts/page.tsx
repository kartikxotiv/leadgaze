'use client';

import React, { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

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
import { ListToolBar } from '@kit/ui/list-toolbar';

import { Skeleton } from '@kit/ui/skeleton';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Contact, getContactsService } from '~/services/contacts.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import { CreateContactDialog } from './components/create-contact-dialog';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { formatDate } from '@kit/shared/utils';
import { TablePagination } from '@kit/ui/table-pagination';

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
                    {[40, 120, 120, 100, 160, 120, 120, 120, 120, 80].map((w, i) => (
                      <th key={i} className="h-11 px-4 border-b border-border">
                        <Skeleton className="h-3" style={{ width: w }} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(12)].map((_, row) => (
                    <tr key={row} className="bg-card border-b border-border">
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-6" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-32" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-40" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-28" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-28" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-3.5 w-20" /></td>
                      <td className="h-11 px-4"><Skeleton className="h-6 w-6 rounded ml-auto" /></td>
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
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;

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
      { id: 'owner', label: 'Owner' },
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
      owner: true,
      created_by: false,
      created_at: false,
      updated_by: true,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('contacts');


  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    data: contactsData = { data: [], count: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts', workspace?.id, currentPage, debouncedSearchTerm, pageSize],
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
  }, [debouncedSearchTerm, pageSize]);

  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedContacts = contacts; // Data is already paginated from server

  if (!workspace) {
    return null;
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
        <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2 pt-2">
          <ListToolBar
            showSearch
            searchPlaceholder="Search by name, email, or account..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
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
                    <CustomTableContainer pagination={
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
                    }>
                      <Table>
                      <TableHeader>
                      <TableRow>
                        {isVisible('sno') && (
  <TableHead className="relative w-12 whitespace-nowrap" {...getHeaderProps('sno')}>
    S. No.
    <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
  </TableHead>
)}
                        {isVisible('name') && (
  <TableHead className="relative" {...getHeaderProps('name')}>
    Name
    <span className="col-resize-handle" {...getResizeHandleProps('name')} />
  </TableHead>
)}
                        {isVisible('first_name') && (
  <TableHead className="relative" {...getHeaderProps('first_name')}>
    First Name
    <span className="col-resize-handle" {...getResizeHandleProps('first_name')} />
  </TableHead>
)}
                        {isVisible('last_name') && (
  <TableHead className="relative" {...getHeaderProps('last_name')}>
    Last Name
    <span className="col-resize-handle" {...getResizeHandleProps('last_name')} />
  </TableHead>
)}
                        {isVisible('job_title') && (
  <TableHead className="relative" {...getHeaderProps('job_title')}>
    Job Title
    <span className="col-resize-handle" {...getResizeHandleProps('job_title')} />
  </TableHead>
)}
                        {isVisible('email') && (
  <TableHead className="relative" {...getHeaderProps('email')}>
    Email
    <span className="col-resize-handle" {...getResizeHandleProps('email')} />
  </TableHead>
)}
                        {isVisible('phone') && (
  <TableHead className="relative" {...getHeaderProps('phone')}>
    Phone
    <span className="col-resize-handle" {...getResizeHandleProps('phone')} />
  </TableHead>
)}
                        {isVisible('account') && (
  <TableHead className="relative" {...getHeaderProps('account')}>
    Account
    <span className="col-resize-handle" {...getResizeHandleProps('account')} />
  </TableHead>
)}
                        {isVisible('owner') && (
  <TableHead className="relative" {...getHeaderProps('owner')}>
    Owner
    <span className="col-resize-handle" {...getResizeHandleProps('owner')} />
  </TableHead>
)}
                        {isVisible('created_by') && (
  <TableHead className="relative" {...getHeaderProps('created_by')}>
    Created By
    <span className="col-resize-handle" {...getResizeHandleProps('created_by')} />
  </TableHead>
)}
                        {isVisible('created_at') && (
  <TableHead className="relative" {...getHeaderProps('created_at')}>
    Created On
    <span className="col-resize-handle" {...getResizeHandleProps('created_at')} />
  </TableHead>
)}
                        {isVisible('updated_by') && (
  <TableHead className="relative" {...getHeaderProps('updated_by')}>
    Last Updated By
    <span className="col-resize-handle" {...getResizeHandleProps('updated_by')} />
  </TableHead>
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
                                    ? Object.values(visibility).filter((v) => v !== false).length + 1
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
                                router.push(`/home/sales/contacts/${contact.id}`)
                              }
                            >
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('name') && (
                                <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                                  <span>
                                    {contact.first_name}{' '}
                                    {contact.last_name || ''}
                                  </span>
                                </TableCell>
                              )}
                              {isVisible('first_name') && (
                                <TableCell className="">
                                  {contact.first_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('last_name') && (
                                <TableCell className="">
                                  {contact.last_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('job_title') && (
                                <TableCell className="">
                                  {contact.job_title || '-'}
                                </TableCell>
                              )}
                              {isVisible('email') && (
                                <TableCell className="text-muted-foreground">
                                  {contact.email || '-'}
                                </TableCell>
                              )}
                              {isVisible('phone') && (
                                <TableCell className="">
                                  {contact.phone_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('account') && (
                                <TableCell className="">
                                  {contact.account?.account_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('notes') && (
                                <TableCell className=" max-w-[200px] truncate">
                                  {contact.notes || '-'}
                                </TableCell>
                              )}
                              {isVisible('owner') && (
                                <TableCell className="">
                                  {contact.owner?.name || '-'}
                                </TableCell>
                              )}
                              {isVisible('created_by') && (
                                <TableCell className="">
                                  {contact.created_by_account?.name ||
                                    contact.created_by ||
                                    '-'}
                                </TableCell>
                              )}
                              {isVisible('created_at') && (
                                <TableCell className="">
                                  {contact.created_at
                                    ? formatDate(contact.created_at)
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('updated_by') && (
                                <TableCell className="">
                                  {contact.updated_by_account?.name ||
                                    contact.updated_by ||
                                    '-'}
                                </TableCell>
                              )}
                              <TableCell className="bg-card sticky right-0 px-4 text-right">
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
                          ),
                        )
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
