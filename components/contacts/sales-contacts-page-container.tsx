"use client";
import { useState } from "react";
import { useSalesContactTableColumns } from "@/components/contacts/sales-contact-table-columns";
import {
  EditContactSidebar,
  AddContactSidebar,
} from "@/components/contacts/sales-contact-sidebars";
import { AddPlatformDialog } from "@/components/contacts/add-platform-dialog";
import { SalesContactsHeader } from "@/components/contacts/sales-contacts-header";
import { SalesContactsTable } from "@/components/contacts/sales-contacts-table";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import AddBusiness from "@/components/business/add-business";
import { BulkImportExportDialog } from "@/components/reuseableComponent/bulk-import-export-dialog";
import {
  importFields,
  exportFields,
  importSampleData,
  exportDataTransform,
} from "@/lib/config/sales-contacts-import-export";
import type { useSalesContactsPage } from "@/hooks/use-sales-contacts-page";

interface SalesContactsPageContainerProps {
  pageHook: ReturnType<typeof useSalesContactsPage>;
}

export function SalesContactsPageContainer({
  pageHook,
}: SalesContactsPageContainerProps) {
  const [importExportTab, setImportExportTab] = useState<"import" | "export">(
    "import",
  );

  const {
    workspaceId,
    token,
    permissionsData,
    canViewSalesContacts,
    canCreateSalesContacts,
    canUpdateSalesContacts,
    canDeleteSalesContacts,
    isSalesContactsVisible,
    tableData,
    platformOptions,
    businessOptions,
    platformNameMap,
    totalRows,
    currentPage,
    pageSize,
    isLoading,
    isError,
    error,
    platformsLoading,
    businessesLoading,
    dateRange,
    handleDateRangeChange,
    handleDateRangeClear,
    searchTerm,
    handleSearchChange,
    handlePageChange,
    handleRowsPerPageChange,
    tableColumnDefinitions,
    visibleColumns,
    handleToggleColumn,
    handleApplyColumns,
    deleteDialog,
    setDeleteDialog,
    previewSidebarOpen,
    addSalesContactSidebarOpen,
    importExportDialogOpen,
    setImportExportDialogOpen,
    addBusinessDialogOpen,
    setAddBusinessDialogOpen,
    addPlatformDialog,
    previewContact,
    formHook,
    actionsHook,
    handleImportComplete,
    handleAddBusinessClick,
    handleBusinessSelectChange,
    handleAddPlatformDialogOpenChange,
    handleAddPlatformDialogPlatformNameChange,
    queryClient,
  } = pageHook;

  const columns = useSalesContactTableColumns({
    canUpdateSalesContacts,
    canDeleteSalesContacts,
    canCreateSalesContacts,
    handlePreviewContact: actionsHook.handlePreviewContact,
    handleMoveToLead: actionsHook.handleMoveToLead,
    handleReject: actionsHook.handleReject,
    handleDeleteSalesContact: actionsHook.handleDeleteSalesContact,
    movingToLeadContactId: actionsHook.movingToLeadContactId,
    visibleColumns,
  });

  return (
    <>
      <SalesContactsHeader
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onDateRangeClear={handleDateRangeClear}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onImportClick={() => {
          setImportExportTab("import");
          setImportExportDialogOpen(true);
        }}
        onExportClick={() => {
          setImportExportTab("export");
          setImportExportDialogOpen(true);
        }}
        canImport={!!workspaceId}
        canExport={!!tableData && tableData.length > 0}
        tableColumnDefinitions={tableColumnDefinitions}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onApplyColumns={handleApplyColumns}
        canCreateSalesContacts={canCreateSalesContacts}
        onAddContactClick={() =>
          actionsHook.handleAddSalesContactSidebarOpenChange(true)
        }
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
          onRowClick={actionsHook.handlePreviewContact}
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
        onConfirm={actionsHook.confirmDeleteSalesContact}
        isLoading={actionsHook.deleteSalesContactMutation.isPending}
        title="Delete Sales Contact"
      />

      <EditContactSidebar
        open={previewSidebarOpen}
        onOpenChange={actionsHook.handleSidebarOpenChange}
        previewContact={previewContact}
        formData={formHook.editFormData}
        errors={formHook.editErrors}
        onChange={formHook.handleEditFormChange}
        onPlatformSelectChange={actionsHook.handleEditPlatformSelectChange}
        platformOptions={platformOptions}
        platformsLoading={platformsLoading}
        isUpdating={actionsHook.isUpdating}
        onUpdate={actionsHook.handleUpdateSubmit}
        onMoveToLead={actionsHook.handleMoveToLead}
        movingToLeadContactId={actionsHook.movingToLeadContactId}
        businessOptions={businessOptions}
        businessesLoading={businessesLoading}
        onBusinessSelectChange={handleBusinessSelectChange}
        onAddBusinessClick={handleAddBusinessClick}
      />

      <AddContactSidebar
        open={addSalesContactSidebarOpen}
        onOpenChange={actionsHook.handleAddSalesContactSidebarOpenChange}
        formData={formHook.formData}
        errors={formHook.errors}
        onChange={formHook.handleFormChange}
        onPlatformSelectChange={actionsHook.handlePlatformSelectChange}
        platformOptions={platformOptions}
        platformsLoading={platformsLoading}
        isSaving={actionsHook.isSaving}
        onSave={actionsHook.handleSubmit}
        businessOptions={businessOptions}
        businessesLoading={businessesLoading}
        onBusinessSelectChange={handleBusinessSelectChange}
        onAddBusinessClick={handleAddBusinessClick}
      />

      <AddBusiness
        open={addBusinessDialogOpen}
        onOpenChange={(open) => {
          setAddBusinessDialogOpen(open);
          if (!open) {
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
        isLoading={actionsHook.isAddingPlatform}
        onAdd={actionsHook.handleAddPlatformDialogAddPlatform}
      />

      <BulkImportExportDialog
        open={importExportDialogOpen}
        onOpenChange={setImportExportDialogOpen}
        title="Import / Export Contacts"
        description="Import contacts from Excel/CSV files or export existing contacts"
        importFields={importFields}
        importApiEndpoint="/api/contacts/import"
        importSampleData={importSampleData}
        importFileName="contacts"
        exportData={tableData}
        exportFields={exportFields}
        exportFileName="contacts"
        exportDataTransform={exportDataTransform}
        workspaceId={workspaceId}
        onImportComplete={handleImportComplete}
        token={token || undefined}
        defaultTab={importExportTab}
      />
    </>
  );
}
