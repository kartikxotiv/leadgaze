'use client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ReactTable } from '@/components/reuseableComponent/ReactTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import { Edit, MoreHorizontal, Plus, Trash2, User, Mail, Phone, MapPin, FileText, AlertCircle, Building2, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react'
import { useContacts, useDeleteContact, useContact, useUpdateContact } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
    



export default function ContactsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    contactId?: string;
    contactName?: string;
  }>({ open: false });

  // Fetch selected contact details
  const { data: selectedContact, isLoading: isLoadingContact } = useContact(
    selectedContactId || ""
  );

  // Fetch companies for the form
  const { data: companiesData, isLoading: companiesLoading } = useCompanies({
    workspaceId: currentWorkspace?.id,
    limit: 100,
  });
  const companies = companiesData?.companies || [];

  // Update mutation
  const updateContactMutation = useUpdateContact();

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    companyId: "",
    location: "",
    description: "",
    contactTimeZone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when contact is selected
  useEffect(() => {
    if (selectedContact) {
      setFormData({
        firstName: selectedContact.firstName || "",
        lastName: selectedContact.lastName || "",
        email: selectedContact.email || "",
        phoneNumber: selectedContact.phoneNumber || "",
        companyId: "", // Always start with empty so user can manually select
        location: selectedContact.location || "",
        description: selectedContact.description || "",
        contactTimeZone: selectedContact.contactTimeZone || "",
      });
      setErrors({});
    }
  }, [selectedContact?.id]); // Only update when contact ID changes

  // Reset form when modal closes
  useEffect(() => {
    if (!selectedContactId) {
      setErrors({});
    }
  }, [selectedContactId]);

  // Validation
  const validateField = useCallback(
    (fieldName: string, value: string): string => {
      switch (fieldName) {
        case "firstName":
          return !value.trim() ? "First name is required" : "";
        case "email":
          if (value && value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !emailRegex.test(value) ? "Please enter a valid email address" : "";
          }
          return "";
        default:
          return "";
      }
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    newErrors.firstName = validateField("firstName", formData.firstName);
    newErrors.email = validateField("email", formData.email);

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  }, [formData.firstName, formData.email, validateField]);

  const handleFormChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors]
  );

  const handleUpdate = useCallback(async () => {
    if (!selectedContactId) return;

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const contactData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        companyId: formData.companyId && formData.companyId.trim() ? formData.companyId : undefined,
        location: formData.location.trim() || undefined,
        description: formData.description.trim() || undefined,
        contactTimeZone: formData.contactTimeZone.trim() || undefined,
      };

      const cleanedData = Object.fromEntries(
        Object.entries(contactData).filter(([_, value]) => value !== undefined && value !== "")
      ) as any;

      await updateContactMutation.mutateAsync({
        contactId: selectedContactId,
        data: cleanedData,
      });
      
      toast.success("Contact updated successfully!");
      // Close the sidebar after successful update
      setSelectedContactId(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update contact");
    }
  }, [validateForm, formData, updateContactMutation, selectedContactId]);

  // Reset state when workspace changes
  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedCompanyId("all");
  }, [currentWorkspace?.id]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term or company filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCompanyId]);

  // Fetch all contacts for the workspace
  const { data: contactsData, isLoading, error } = useContacts({
    workspaceId: currentWorkspace?.id,
    companyId: selectedCompanyId === "all" ? undefined : selectedCompanyId,
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
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-primary"
            onClick={() => setSelectedContactId(row.id)}
          >
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
        id: 'company',
        name: 'Company',
        selector: (row: any) => row.company?.title || '',
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.company?.title || '-'}</span>
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

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {/* <Select
            value={selectedCompanyId}
            onValueChange={(value) => setSelectedCompanyId(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company: any) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
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

        {/* Contacts Table */}
        {!isLoading && !error && (
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
        {!isLoading && !error && contacts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No contacts found</p>
            <Button asChild>
              <Link href="/pages/contacts/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Contact
              </Link>
            </Button>
          </div>
        )}

        {/* Contact Details Sidebar */}
        <Sheet open={!!selectedContactId} onOpenChange={(open) => !open && setSelectedContactId(null)} >
          <SheetContent 
            side="right" 
            className="w-full sm:max-w-lg overflow-y-auto p-0"
            overlayClassName="bg-black/10"
          >
            {isLoadingContact ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading contact details...</p>
              </div>
            ) : selectedContact ? (
              <>
                <SheetHeader className='px-4 py-6 bg-[#45a2ff]'>
                  <SheetTitle className='text-white'>Contact Details</SheetTitle>
                  <SheetDescription className="text-[12px] !mt-[0px] text-white">
                    Update contact information
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6 px-4 pb-6">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Essential Information</h3>
                          <p className="text-sm text-gray-600 font-regular">
                            Update contact information
                          </p>
                        </div>
                      </div>

                     

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) => handleFormChange("firstName", e.target.value)}
                              placeholder="John"
                              className={`pl-10 bg-gray-100 ${
                                errors.firstName ? "border-red-500 focus:border-red-500" : ""
                              }`}
                            />
                          </div>
                          {errors.firstName && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.firstName}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) => handleFormChange("lastName", e.target.value)}
                              placeholder="Doe"
                              className="pl-10 bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleFormChange("email", e.target.value)}
                              placeholder="john.doe@example.com"
                              className={`pl-10 bg-gray-100 ${
                                errors.email ? "border-red-500 focus:border-red-500" : ""
                              }`}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.email}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="phoneNumber"
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
                              placeholder="+1 (555) 123-4567"
                              className="pl-10 bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => handleFormChange("location", e.target.value)}
                            placeholder="New York, NY"
                            className="pl-10 bg-gray-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyId">Select Company</Label>
                        {companies.length === 0 && !companiesLoading ? (
                          <div className="space-y-2">
                            <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span>No companies available. Please create a company first.</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              asChild
                              className="w-full"
                            >
                              <Link href="/pages/companies/new">
                                <Building2 className="h-4 w-4 mr-2" />
                                Create Company
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Select
                              value={formData.companyId}
                              onValueChange={(value) => handleFormChange("companyId", value)}
                              disabled={companiesLoading}
                            >
                              <SelectTrigger className="bg-gray-100">
                                <SelectValue
                                  placeholder={
                                    companiesLoading
                                      ? "Loading companies..."
                                      : companies.length === 0 
                                      ? "No companies available"
                                      : "Select Company"
                                  }
                                />
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
                          </>
                        )}
                      </div>

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleFormChange("description", e.target.value)}
                            placeholder="Additional notes and information about the contact..."
                            rows={3}
                            className="pl-10 bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t text-end">
                    <Button
                      onClick={handleUpdate}
                      disabled={updateContactMutation.isPending}
                      className=" bg-[#45a2ff] hover:bg-[#45a2ff]/90"
                    >
                      {updateContactMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </SheetContent>
        </Sheet>

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
