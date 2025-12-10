"use client";
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ReactTable } from '@/components/reuseableComponent/ReactTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useCompanies, useDeleteCompany } from '@/hooks/use-companies';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import { Download, Plus, Upload, MoreHorizontal, Edit, Trash2, Building2 } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog';

export default function CompaniesPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceContext();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [searchTerm, setSearchTerm] = useState('');
  const deleteCompanyMutation = useDeleteCompany();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    companyId?: string;
    companyName?: string;
  }>({ open: false });
  
  // Add debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term or workspace changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, currentWorkspace?.id]);

  const { data: companiesData, isLoading, error } = useCompanies({ 
    page: currentPage, 
    limit: pageSize,
    search: debouncedSearchTerm,
    workspaceId: currentWorkspace?.id
  });

  // Extract companies array and pagination info from the response data structure
  const companies = companiesData?.companies || [];
  const safeCompanies = Array.isArray(companies) ? companies.map((company: any) => ({
    id: company.id,
    name: company.title,
    description: company.description || '',
    location: company.location || '',
    industry: company.industry || '',
    contacts: company.contacts?.length || 0,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  })) : [];
  const pagination = companiesData?.pagination || { count: 0, page: 1, totalPages: 1, limit: pageSize };

  const handleDeleteCompany = (companyId: string, companyName: string) => {
    setDeleteDialog({
      open: true,
      companyId,
      companyName,
    });
  };

  const confirmDeleteCompany = async (companyId?: string) => {
    if (!companyId) return;

    try {
      await deleteCompanyMutation.mutateAsync(companyId);
      toast.success("Company deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete company");
      throw error; // Re-throw to keep dialog open on error
    }
  };

  const handleEditCompany = (companyId: string) => {
    router.push(`/pages/companies/new?edit=${companyId}`);
  };

  // const handeldeletecompany = async (companyId: string, companyName: string) => {
  //   if (!confirm(`Are you sure you want to delete "${companyName}"?`)) {
  //     return;
  //   }
  //   try {
  //     await deleteCompanyMutation.mutateAsync(companyId);
  //     toast.success("Company deleted successfully");
  //   } catch (error: any) {
  //     toast.error(error?.message || "Failed to delete company");
  //   }
  // };

  // const confirmDeleteCompany = async () => {
  //   if (!deleteDialog.companyId) return;
  //   try {
  //     await deleteCompanyMutation.mutateAsync(deleteDialog.companyId);
  //     toast.success("Company deleted successfully");
  //     setDeleteDialog({ open: false });
  //   } catch (error) {
  //     toast.error("Failed to delete company");
  //   }
  // };



    const getTableColumns = () => {
    return [
      { 
        id: 'sno',
        name: 'S.no', 
        selector: (row: any, index: number) => ((currentPage - 1) * pageSize) + index + 1, 
        sortable: false, 
        width: '80px' 
      },
      { 
        id: 'name',
        name: 'Company Name', 
        selector: (row: any) => row.name || '', 
        sortable: true,
        width: '200px',
        minWidth: '200px',
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{row.name || ''}</span>
          </div>
        )
      },
      { 
        id: 'description',
        name: 'Description', 
        selector: (row: any) => row.description || '', 
        sortable: true,
        width: '300px',
        minWidth: '200px',
        cell: (row: any) => (
          <div className="truncate max-w-[300px]" title={row.description}>
            {row.description || '-'}
          </div>
        )
      },
      { 
        id: 'location',
        name: 'Location', 
        selector: (row: any) => row.location || '', 
        sortable: true,
        width: '150px',
        minWidth: '150px'
      },
      { 
        id: 'industry',
        name: 'Industry', 
        selector: (row: any) => row.industry || '', 
        sortable: true,
        width: '150px',
        minWidth: '150px'
      },
      // { 
      //   id: 'contacts',
      //   name: 'Contacts', 
      //   selector: (row: any) => row.contacts || 0, 
      //   sortable: true,
      //   width: '300px',
      //   minWidth: '300px',
      //   cell: (row: any) => (
      //     <span className="text-center">{row.contacts || 0}</span>
      //   )
      // },
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
              <DropdownMenuItem onClick={() => handleEditCompany(row.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => handleDeleteCompany(row.id, row.name)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
        width: '100px',
        minWidth: '100px'
      },
    ];
  };





  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Companies</h1>
            <p className="text-sm text-muted-foreground">
              Manage your company records
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button asChild>
              <Link href="/pages/companies/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Link>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading companies: {error.message}</p>
          </div>
        )}

        {/* Companies Table */}
        {!isLoading && !error && currentWorkspace && (
          <div className="mt-4">
            <ReactTable 
              columns={getTableColumns()} 
              data={safeCompanies}
              pagination={true}
              paginationTotalRows={pagination?.count || 0}
              paginationPerPage={pageSize}
              paginationDefaultPage={currentPage}
              onChangePage={(page: number) => setCurrentPage(page)}
              onChangeRowsPerPage={(currentRowsPerPage: number, currentPage: number) => {
                setCurrentPage(currentPage);
              }}
            />
          </div>
        )}

        {/* No Workspace Selected */}
        {!currentWorkspace && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Please select a workspace to view companies</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && currentWorkspace && safeCompanies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No companies found in this workspace</p>
            <Button asChild>
              <Link href="/pages/companies/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Company
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
              companyId: open ? deleteDialog.companyId : undefined,
              companyName: open ? deleteDialog.companyName : undefined,
            })
          }
          itemName={deleteDialog.companyName || ""}
          itemId={deleteDialog.companyId}
          onConfirm={confirmDeleteCompany}
          isLoading={deleteCompanyMutation.isPending}
          title="Delete Company"
        />
      </div>
    </DashboardLayout>
  )
}

