'use client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ReactTable } from '@/components/reuseableComponent/ReactTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from '@/hooks/use-companies';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import { Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react'
import { useContacts, useDeleteContact } from '@/hooks/use-contacts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog';
    



export default function ContactsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    contactId?: string;
    contactName?: string;
  }>({ open: false });
  // Fetch companies for the dropdown
  const { data: companiesData } = useCompanies({
    workspaceId: currentWorkspace?.id,
    limit: 100,
  });
  const companies = companiesData?.companies || [];

  // Reset state when workspace changes
  useEffect(() => {
    setSelectedCompanyId('');
    setSearchTerm('');
    setCurrentPage(1);
  }, [currentWorkspace?.id]);

  // Set default company when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term or company changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCompanyId]);

  // Fetch contacts for selected company
  const { data: contactsData, isLoading, error } = useContacts({
    companyId: selectedCompanyId,
    page: currentPage,
    limit: pageSize,
    search: debouncedSearchTerm,
  });
  
  const contacts = contactsData?.contacts || [];
  const pagination = contactsData?.pagination || { count: 0, page: 1, totalPages: 1, limit: 20 };

  const deleteContactMutation = useDeleteContact();

  const handleEditContact = (contactId: string) => {
    router.push(`/pages/contacts/new?edit=${contactId}`);
  };

  const handleDeleteContact = (contactId: string, contactName: string) => {
    setDeleteDialog({
      open: true,
      contactId,
      contactName,
    });
  };

  const confirmDeleteContact = async (contactId?: string) => {
    if (!contactId) return;

    try {
      await deleteContactMutation.mutateAsync(contactId);
      toast.success("Contact deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete contact");
      throw error; // Re-throw to keep dialog open on error
    }
  };

  const getTableColumns = () => {
    return [
      { id: 'name',
        
        name: 'Name',
        selector: (row: any) => row.name || '', 
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.firstName} {row.lastName}</span>
          </div>
        )
       },
      { id: 'email',
        name: 'Email',
        selector: (row: any) => row.email || '',
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.email || '-'}</span>
          </div>
        )
      },
     
      { 
        id: 'phone',
        name: 'Phone',
        selector: (row: any) => row.phoneNumber || '',
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.phoneNumber || '-'}</span>
          </div>
        )
       },
      { 
        id: 'location',
        name: 'Location',
        selector: (row: any) => row.location || '',
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.location || '-'}</span>
          </div>
        )
      },
      { 
        id: 'description', 
        name: 'Description',
        selector: (row: any) => row.description || '',
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.description || '-'}</span>
          </div>
        )
       },
       {
        id: 'actions',
        name: 'Actions', 
        cell: (row: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditContact(row.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => handleDeleteContact(row.id, `${row.firstName} ${row.lastName}`)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    ];
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              Manage your contact records
            </p>
          </div>
          <Button asChild>    
            <Link href="/pages/contacts/new">
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Link>
          </Button>
        </div>

        {/* Company Filter and Search */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.length > 0 ? (
                companies.map((company: any) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.title}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-companies" disabled>
                  No companies available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading contacts: {error.message}</p>
          </div>
        )}

        {/* No Company Selected */}
        {!selectedCompanyId && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Please select a company to view contacts</p>
          </div>
        )}

        {/* Contacts Table */}
        {!isLoading && !error && selectedCompanyId && (
          <div className="mt-4">
            <ReactTable
              columns={getTableColumns()}
              data={contacts}
              pagination={true}
              paginationTotalRows={pagination.count}
              paginationPerPage={pageSize}
              paginationDefaultPage={currentPage}
              onChangePage={setCurrentPage}
              onChangeRowsPerPage={(currentRowsPerPage: number, currentPage: number) => {
                setPageSize(currentRowsPerPage);
                setCurrentPage(currentPage);
              }}
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && selectedCompanyId && contacts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No contacts found for this company</p>
            <Button asChild>
              <Link href="/pages/contacts/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Contact
              </Link>
            </Button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) =>
            setDeleteDialog({
              open,
              contactId: open ? deleteDialog.contactId : undefined,
              contactName: open ? deleteDialog.contactName : undefined,
            })
          }
          itemName={deleteDialog.contactName || ""}
          itemId={deleteDialog.contactId}
          onConfirm={confirmDeleteContact}
          isLoading={deleteContactMutation.isPending}
          title="Delete Contact"
        />
      </div>
    </DashboardLayout>
  )
}
