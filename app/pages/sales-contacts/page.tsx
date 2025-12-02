"use client";
import { useCallback, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  useWorkspacePermissions,
  useWorkspaceRoutePermission,
} from "@/hooks/use-workspace-permissions";
import {
  useCreateSalesContact,
  useDeleteSalesContact,
  useSalesContacts,
  useUpdateSalesContact,
} from "@/hooks/use-sales-contact";
import { useCreateSalesLead } from "@/hooks/use-sales-leads";
import {
  useContactPlatforms,
  useCreateContactPlatform,
} from "@/hooks/use-contact-platforms";
import { useBusinesses } from "@/hooks/use-business";
import AddBusiness from "@/components/business/add-business";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BulkImportExportDialog } from "@/components/reuseableComponent/bulk-import-export-dialog";
import type { ImportResult } from "@/components/reuseableComponent/bulk-import-export-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Switch } from "@/components/ui/switch";
import type { ColumnDefinition } from "@/components/common/column-customizer";
import type { DateRange } from "@/components/common/date-range-filter";
import { formatStatus, formatDateTime } from "@/lib/utils/sales-contact-utils";
import { useSalesContactTableColumns } from "@/components/sales-contacts/sales-contact-table-columns";
import {
  EditContactSidebar,
  AddContactSidebar,
} from "@/components/sales-contacts/sales-contact-sidebars";
import { AddPlatformDialog } from "@/components/sales-contacts/add-platform-dialog";
import { SalesContactsHeader } from "@/components/sales-contacts/sales-contacts-header";
import { SalesContactsTable } from "@/components/sales-contacts/sales-contacts-table";
import { useSalesContactForm } from "@/hooks/use-sales-contact-form";
import { useSalesContactActions } from "@/hooks/use-sales-contact-actions";
import {
  importFields,
  exportFields,
  importSampleData,
  exportDataTransform,
} from "@/lib/config/sales-contacts-import-export";
import { ADD_BUSINESS_SELECT_VALUE } from "@/lib/constants/sales-contacts";

export default function SalesContactsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { data: permissionsData } = useWorkspacePermissions();
  const canViewSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "view"
  );
  const canCreateSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "create"
  );
  const canUpdateSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "update"
  );
  const canDeleteSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "delete"
  );
  const isSalesContactsVisible = useWorkspaceRoutePermission(
    "Sales Contacts",
    "visible"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const filters = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      page,
      limit: pageSize,
      workspaceId,
      dateFrom: dateRange?.from ? dateRange.from.toISOString() : undefined,
      dateTo: dateRange?.to ? dateRange.to.toISOString() : undefined,
    };
  }, [workspaceId, page, pageSize, dateRange]);

  const [addPlatformDialog, setAddPlatformDialog] = useState<{
    open: boolean;
    platformName: string;
    error: string;
    targetForm: "add" | "edit";
  }>({
    open: false,
    platformName: "",
    error: "",
    targetForm: "add",
  });

  const handleAddPlatformDialogOpenChange = useCallback(
    (open: boolean, targetForm?: "add" | "edit") => {
      setAddPlatformDialog((prev) => ({
        open,
        platformName: open ? (prev.open ? prev.platformName : "") : "",
        error: "",
        targetForm: open
          ? targetForm ?? prev.targetForm ?? "add"
          : prev.targetForm ?? "add",
      }));
    },
    []
  );

  const handleAddPlatformDialogPlatformNameChange = useCallback(
    (platformName: string) => {
      setAddPlatformDialog((prev) => ({ ...prev, platformName, error: "" }));
    },
    []
  );

  const {
    data: salesContacts,
    isLoading,
    isError,
    error,
  } = useSalesContacts(filters);
  const { data: platformList, isLoading: platformsLoading } =
    useContactPlatforms();
  const platformOptions = useMemo(() => platformList ?? [], [platformList]);

  const { data: businessesData, isLoading: businessesLoading } = useBusinesses({
    page: 1,
    limit: 1000, // Get all businesses for dropdown
  });
  const businessOptions = useMemo(() => {
    return businessesData?.data ?? [];
  }, [businessesData?.data]);
  const platformNameMap = useMemo(() => {
    const map = new Map<number, string>();
    platformOptions.forEach((platform) => {
      if (platform.id !== undefined && platform.id !== null) {
        map.set(platform.id, platform.name);
      }
    });
    return map;
  }, [platformOptions]);

  const tableData = useMemo(() => {
    const contacts = salesContacts?.data ?? [];
    return contacts.map((contact) => ({
      ...contact,
      company_label: contact.company_id ?? "",
      platform_label: contact.platform
        ? platformNameMap.get(contact.platform) ?? `ID ${contact.platform}`
        : "",
      status_label: formatStatus(contact.status),
      created_at_label: formatDateTime(contact.created_at),
      updated_at_label: formatDateTime(contact.updated_at),
    }));
  }, [salesContacts?.data, platformNameMap]);

  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    salesContactId?: string;
    salesContactName?: string;
  }>({ open: false });
  const [previewSidebarOpen, setPreviewSidebarOpen] = useState(false);
  const [addSalesContactSidebarOpen, setAddSalesContactSidebarOpen] =
    useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [addBusinessDialogOpen, setAddBusinessDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "phone_number",
    "email",
    "location",
    "platform",
    "alternative_email",
    "alternative_phone_number",
    "business_contact",
    "business_linkedin",
    "business_name",
    "comment",
    "linkedin_url",
    "status",
  ]);
  const [previewContact, setPreviewContact] = useState<any | null>(null);
  const {
    formData,
    setFormData,
    errors,
    setErrors,
    editFormData,
    setEditFormData,
    editErrors,
    setEditErrors,
    handleFormChange,
    handleEditFormChange,
    validateForm,
    validateEditForm,
    resetFormState,
    resetEditFormState,
    mapContactToFormData,
  } = useSalesContactForm();
  const {
    handleDeleteSalesContact,
    handleMoveToLead,
    confirmDeleteSalesContact,
    handlePreviewContact,
    handleSidebarOpenChange,
    handleAddSalesContactSidebarOpenChange,
    handleAddPlatformDialogAddPlatform,
    handleSubmit,
    handleUpdateSubmit,
    handlePlatformSelectChange,
    handleEditPlatformSelectChange,
    movingToLeadContactId,
    isSaving,
    isAddingPlatform,
    isUpdating,
    deleteSalesContactMutation,
  } = useSalesContactActions({
    formData,
    editFormData,
    setFormData,
    setEditFormData,
    setErrors,
    setEditErrors,
    handleFormChange,
    handleEditFormChange,
    validateForm,
    validateEditForm,
    resetFormState,
    resetEditFormState,
    mapContactToFormData,
    platformOptions,
    platformNameMap,
    previewContact,
    setPreviewContact,
    setPreviewSidebarOpen,
    setAddSalesContactSidebarOpen,
    setDeleteDialog,
    setAddPlatformDialog,
    addPlatformDialog,
    handleAddPlatformDialogOpenChange,
  });

  const tableColumnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { id: "phone_number", label: "Phone Number" },
      { id: "email", label: "Email" },
      { id: "location", label: "Location" },
      { id: "platform", label: "Platform" },
      { id: "alternative_email", label: "Alternative Email" },
      { id: "alternative_phone_number", label: "Alternative Phone Number" },
      { id: "business_contact", label: "Business Contact" },
      { id: "business_linkedin", label: "Business LinkedIn" },
      { id: "business_name", label: "Business Name" },
      { id: "comment", label: "Comment" },
      { id: "linkedin_url", label: "LinkedIn URL" },
      { id: "status", label: "Status" },
    ],
    []
  );

  const totalRows = salesContacts?.count ?? 0;
  const currentPage = salesContacts?.page ?? page;

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleRowsPerPageChange = useCallback(
    (nextRowsPerPage: number, nextPage: number) => {
      setPageSize(nextRowsPerPage);
      setPage(nextPage);
    },
    []
  );

  const handleToggleColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  }, []);

  const handleApplyColumns = useCallback(() => {
    toast.success("Column preferences applied");
  }, []);

  const handleImportComplete = useCallback(
    (results: ImportResult) => {
      queryClient.invalidateQueries({ queryKey: ["sales-contacts"] });
      toast.success(
        `Import completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicates} duplicates`
      );
    },
    [queryClient]
  );

  // Handle add business click
  const handleAddBusinessClick = useCallback(() => {
    setAddBusinessDialogOpen(true);
  }, []);

  // Handle business select change
  const handleBusinessSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_BUSINESS_SELECT_VALUE) {
        handleAddBusinessClick();
        return;
      }
      handleFormChange("businessId", value);
    },
    [handleFormChange, handleAddBusinessClick]
  );

  const columns = useSalesContactTableColumns({
    canUpdateSalesContacts,
    canDeleteSalesContacts,
    canCreateSalesContacts,
    handlePreviewContact,
    handleMoveToLead,
    handleDeleteSalesContact,
    movingToLeadContactId,
    visibleColumns,
  });

  return (
    <DashboardLayout>
      <SalesContactsHeader
        dateRange={dateRange}
        onDateRangeChange={(range) => {
          setDateRange(range);
          setPage(1); // Reset to first page when filter changes
        }}
        onDateRangeClear={() => setPage(1)}
        onImportClick={() => setImportExportDialogOpen(true)}
        onExportClick={() => setImportExportDialogOpen(true)}
        canImport={!!workspaceId}
        canExport={!!tableData && tableData.length > 0}
        tableColumnDefinitions={tableColumnDefinitions}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onApplyColumns={handleApplyColumns}
        canCreateSalesContacts={canCreateSalesContacts}
        onAddContactClick={() => handleAddSalesContactSidebarOpenChange(true)}
      />

      <div className="mt-6 border border-muted-foreground/30 overflow-hidden">
        <SalesContactsTable
          workspaceId={workspaceId}
          isLoading={isLoading}
          isError={isError}
          error={error}
          tableData={tableData}
          columns={columns}
          totalRows={totalRows}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handlePreviewContact}
          canViewSalesContacts={canViewSalesContacts}
          isSalesContactsVisible={isSalesContactsVisible}
          permissionsData={permissionsData}
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({
            open,
            salesContactId: open ? prev.salesContactId : undefined,
            salesContactName: open ? prev.salesContactName : undefined,
          }))
        }
        itemName={deleteDialog.salesContactName || ""}
        itemId={deleteDialog.salesContactId}
        onConfirm={confirmDeleteSalesContact}
        isLoading={deleteSalesContactMutation.isPending}
        title="Delete Sales Contact"
      />
      <EditContactSidebar
        open={previewSidebarOpen}
        onOpenChange={handleSidebarOpenChange}
        previewContact={previewContact}
        formData={editFormData}
        errors={editErrors}
        onChange={handleEditFormChange}
        onPlatformSelectChange={handleEditPlatformSelectChange}
        platformOptions={platformOptions}
        platformsLoading={platformsLoading}
        isUpdating={isUpdating}
        onUpdate={handleUpdateSubmit}
        onMoveToLead={handleMoveToLead}
        movingToLeadContactId={movingToLeadContactId}
      />

      <AddContactSidebar
        open={addSalesContactSidebarOpen}
        onOpenChange={handleAddSalesContactSidebarOpenChange}
        formData={formData}
        errors={errors}
        onChange={handleFormChange}
        onPlatformSelectChange={handlePlatformSelectChange}
        platformOptions={platformOptions}
        platformsLoading={platformsLoading}
        isSaving={isSaving}
        onSave={handleSubmit}
        businessOptions={businessOptions}
        businessesLoading={businessesLoading}
        onBusinessSelectChange={handleBusinessSelectChange}
        onAddBusinessClick={handleAddBusinessClick}
      />

      {/* Add Business Dialog */}
      <AddBusiness
        open={addBusinessDialogOpen}
        onOpenChange={(open) => {
          setAddBusinessDialogOpen(open);
          if (!open) {
            // Refresh businesses when dialog closes
            queryClient.invalidateQueries({ queryKey: ["businesses"] });
          }
        }}
      />

      <AddPlatformDialog
        open={addPlatformDialog.open}
        onOpenChange={(open) => handleAddPlatformDialogOpenChange(open)}
        platformName={addPlatformDialog.platformName}
        onPlatformNameChange={handleAddPlatformDialogPlatformNameChange}
        error={addPlatformDialog.error}
        isLoading={isAddingPlatform}
        onAdd={handleAddPlatformDialogAddPlatform}
      />

      <BulkImportExportDialog
        open={importExportDialogOpen}
        onOpenChange={setImportExportDialogOpen}
        title="Import / Export Sales Contacts"
        description="Import contacts from Excel/CSV files or export existing contacts"
        importFields={importFields}
        importApiEndpoint="/api/sales-contacts/import"
        importSampleData={importSampleData}
        importFileName="sales-contacts"
        exportData={tableData}
        exportFields={exportFields}
        exportFileName="sales-contacts"
        exportDataTransform={exportDataTransform}
        workspaceId={workspaceId}
        onImportComplete={handleImportComplete}
        token={token || undefined}
      />
    </DashboardLayout>
  );
}
