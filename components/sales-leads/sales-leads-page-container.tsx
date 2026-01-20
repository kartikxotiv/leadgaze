"use client";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import { BulkImportExportDialog } from "@/components/reuseableComponent/bulk-import-export-dialog";
import { useSalesLeadTableColumns } from "@/components/sales-leads/sales-lead-table-columns";
import { SalesLeadsHeader } from "@/components/sales-leads/sales-leads-header";
import { SalesLeadsTable } from "@/components/sales-leads/sales-leads-table";
import { AddLeadSidebar } from "@/components/sales-leads/add-lead-sidebar";
import { AddPlatformDialog } from "@/components/sales-leads/add-platform-dialog";
import { EditLeadDialog } from "@/components/sales-leads/edit-lead-dialog";
import { NoteDialog } from "@/components/notes/note-dialog";
import { MeetingDialog } from "@/components/meetings/meeting-dialog";
import { MeetingDetailsDialog } from "@/components/meetings/meeting-details-dialog";
import { LeadMediaDialog } from "@/components/lead-media/lead-media-dialog";
import AddBusiness from "@/components/business/add-business";
import {
  importFields,
  exportFields,
  importSampleData,
  exportDataTransform,
} from "@/lib/config/sales-leads-import-export";
import type { useSalesLeadsPage } from "@/hooks/use-sales-leads-page";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

interface SalesLeadsPageContainerProps {
  pageHook: ReturnType<typeof useSalesLeadsPage>;
}

export function SalesLeadsPageContainer({
  pageHook,
}: SalesLeadsPageContainerProps) {
  const {
    workspaceId,
    token,
    user,
    permissionsData,
    isLoadingPermissions,
    canViewSalesLeads,
    canCreateSalesLeads,
    canUpdateSalesLeads,
    canDeleteSalesLeads,
    effectiveCanViewSalesLeads,
    isSalesLeadsVisible,
    dataHook,
    businessOptions,
    businessesLoading,
    previewLead,
    previewLeadDisplayName,
    statusLabel,
    statusClassName,
    dateRange,
    handleDateRangeChange,
    handleDateRangeClear,
    searchTerm,
    handleSearchChange,
    pageSize,
    handlePageChange,
    handleRowsPerPageChange,
    tableColumnDefinitions,
    visibleColumns,
    handleToggleColumn,
    handleApplyColumns,
    previewDialogOpen,
    addSalesLeadSidebarOpen,
    importExportDialogOpen,
    setImportExportDialogOpen,
    importExportTab,
    setImportExportTab,
    noteDialogOpen,
    setNoteDialogOpen,
    meetingDialogOpen,
    setMeetingDialogOpen,
    meetingDetailsDialogOpen,
    setMeetingDetailsDialogOpen,
    selectedMeetingId,
    setSelectedMeetingId,
    meetingDeleteDialog,
    setMeetingDeleteDialog,
    mediaDialogOpen,
    setMediaDialogOpen,
    deleteDialog,
    setDeleteDialog,
    addBusinessDialogOpen,
    setAddBusinessDialogOpen,
    formHook,
    actionsHook,
    handlePreviewLead,
    handleImportComplete,
    handleDeleteMeeting,
    handleAddBusinessClick,
    handleBusinessSelectChange,
    queryClient,
    deleteMeetingMutation,
  } = pageHook;

  const columns = useSalesLeadTableColumns({
    canUpdateSalesLeads,
    canDeleteSalesLeads,
    canCreateSalesLeads,
    handlePreviewLead,
    handleDeleteSalesLead: actionsHook.handleDeleteSalesLead,
    visibleColumns,
  });

  const filteredExportFields = useMemo(() => {
    return exportFields.filter((field) => {
      // Full Name (first_name, last_name) is always visible if it map to name
      // but in leads we have first_name and last_name separately?
      // Actually in leads table columns:
      // it doesn't have "full name" as ID, it has "email", "phone_number", etc.

      if (field.key === "first_name" || field.key === "last_name") {
        return true;
      }

      // Map export field keys to table column IDs
      const fieldToColumnMap: Record<string, string> = {
        email: "email",
        phone_display: "phone_number",
        location: "Location",
        alternative_email: "alternative_email",
        alternative_phone_number: "alternative_phone_number",
        business_name: "business_name",
        business_linkedin: "business_linkedin",
        business_contact: "business_contact",
        linkedin_url: "linkedin_url",
        comment: "comment",
        status_label: "status",
        platform_label: "platform",
        priority_label: "priority",
      };

      const columnId = fieldToColumnMap[field.key] || field.key;
      return visibleColumns.includes(columnId);
    });
  }, [visibleColumns]);

  if (isLoadingPermissions && !permissionsData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Sales Leads</h1>
            <p className="text-sm text-muted-foreground">
              Manage your sales pipeline
            </p>
          </div>
        </div>
        <div className="mt-6 border border-muted-foreground/30 overflow-hidden">
          <Skeleton className="h-[420px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (permissionsData && !effectiveCanViewSalesLeads && !isSalesLeadsVisible) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p>
            You don't have permission to view sales leads in this workspace.
          </p>
          <p className="text-xs mt-1">
            Contact your workspace administrator to grant access.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <SalesLeadsHeader
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
        canExport={!!dataHook.tableData && dataHook.tableData.length > 0}
        tableColumnDefinitions={tableColumnDefinitions}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onApplyColumns={handleApplyColumns}
        canCreateSalesLeads={canCreateSalesLeads}
        onAddLeadClick={() =>
          actionsHook.handleAddSalesLeadSidebarOpenChange(true)
        }
      />

      <div className="mt-6 border border-muted-foreground/30 overflow-hidden">
        <SalesLeadsTable
          workspaceId={workspaceId}
          isLoading={dataHook.isLoading}
          isError={dataHook.isError}
          error={dataHook.error}
          tableData={dataHook.tableData}
          columns={columns}
          totalRows={dataHook.totalRows}
          pageSize={pageSize}
          currentPage={dataHook.currentPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handlePreviewLead}
          canViewSalesLeads={canViewSalesLeads}
          isSalesLeadsVisible={isSalesLeadsVisible ?? false}
          permissionsData={permissionsData}
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({
            open,
            salesLeadId: open ? prev.salesLeadId : undefined,
            salesLeadName: open ? prev.salesLeadName : undefined,
          }))
        }
        itemName={deleteDialog.salesLeadName || ""}
        itemId={deleteDialog.salesLeadId}
        onConfirm={actionsHook.confirmDeleteSalesLead}
        isLoading={actionsHook.deleteSalesLeadMutation.isPending}
        title="Delete Sales Lead"
      />

      <EditLeadDialog
        open={previewDialogOpen}
        onOpenChange={actionsHook.handlePreviewDialogOpenChange}
        previewLead={previewLead}
        previewLeadDisplayName={previewLeadDisplayName}
        isLoadingPreview={pageHook.isLoadingPreview}
        editFormData={formHook.editFormData}
        statusLabel={statusLabel}
        statusClassName={statusClassName}
        priorityOptions={dataHook.priorityOptions}
        platformOptions={dataHook.platformOptions}
        platformsLoading={dataHook.platformsLoading}
        onEditFormChange={formHook.handleEditFormChange}
        onEditPlatformSelectChange={actionsHook.handleEditPlatformSelectChange}
        onEditPrioritySelectChange={actionsHook.handleEditPrioritySelectChange}
        onAddPlatformClick={() =>
          actionsHook.handleAddPlatformDialogOpenChange(true, "edit")
        }
        onNoteDialogOpen={() => setNoteDialogOpen(true)}
        onMediaDialogOpen={() => setMediaDialogOpen(true)}
        upcomingMeetings={dataHook.upcomingMeetings}
        meetingsLoading={dataHook.meetingsLoading}
        onMeetingCreate={() => {
          setSelectedMeetingId(null);
          setMeetingDialogOpen(true);
        }}
        onMeetingClick={(meetingId) => {
          setSelectedMeetingId(meetingId);
          setMeetingDetailsDialogOpen(true);
        }}
        onMeetingEdit={(meetingId) => {
          setSelectedMeetingId(meetingId);
          setMeetingDetailsDialogOpen(false);
          setMeetingDialogOpen(true);
        }}
        onMeetingDelete={(meetingId, meetingTitle) => {
          setMeetingDeleteDialog({
            open: true,
            meetingId,
            meetingTitle,
          });
        }}
        onCancel={() => actionsHook.handlePreviewDialogOpenChange(false)}
        onUpdate={actionsHook.handleUpdateSubmit}
        isUpdating={actionsHook.isUpdating}
        leadComments={dataHook.leadComments}
        leadCommentsLoading={dataHook.leadCommentsLoading}
        currentUser={{
          user_id: user?.userId,
          first_name: user?.firstName,
          last_name: user?.lastName,
          email: user?.email,
        }}
        newCommentText={actionsHook.newCommentText}
        onCommentTextChange={actionsHook.setNewCommentText}
        onAddComment={actionsHook.handleAddComment}
        onEditComment={actionsHook.handleEditComment}
        onDeleteComment={actionsHook.handleDeleteComment}
        isSubmitting={actionsHook.createLeadCommentMutation.isPending ?? false}
        isDeleting={actionsHook.deleteLeadCommentMutation.isPending ?? false}
        isEditing={actionsHook.updateLeadCommentMutation.isPending ?? false}
      />

      <AddLeadSidebar
        open={addSalesLeadSidebarOpen}
        onOpenChange={actionsHook.handleAddSalesLeadSidebarOpenChange}
        formData={formHook.formData}
        errors={formHook.errors}
        onFormChange={formHook.handleFormChange}
        onPlatformSelectChange={actionsHook.handlePlatformSelectChange}
        onPrioritySelectChange={actionsHook.handlePrioritySelectChange}
        onContactSelectChange={actionsHook.handleContactSelectChange}
        platformOptions={dataHook.platformOptions}
        priorityOptions={dataHook.priorityOptions}
        contactOptions={dataHook.contactOptions}
        platformsLoading={dataHook.platformsLoading}
        onSave={() => actionsHook.handleSubmit(true)}
        isSaving={actionsHook.isSaving}
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
        open={actionsHook.addPlatformDialog.open}
        onOpenChange={(open) =>
          actionsHook.handleAddPlatformDialogOpenChange(open)
        }
        platformName={actionsHook.addPlatformDialog.platformName}
        onPlatformNameChange={
          actionsHook.handleAddPlatformDialogPlatformNameChange
        }
        error={actionsHook.addPlatformDialog.error}
        onAdd={actionsHook.handleAddPlatformDialogAddPlatform}
        isAdding={actionsHook.isAddingPlatform}
      />

      {previewLead && (
        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          leadId={previewLead.id}
          onSuccess={() => {}}
        />
      )}

      {previewLead && (
        <MeetingDialog
          open={meetingDialogOpen}
          onOpenChange={(open) => {
            setMeetingDialogOpen(open);
            if (!open) {
              setSelectedMeetingId(null);
            }
          }}
          leadId={previewLead.id}
          meetingId={selectedMeetingId || undefined}
          onSuccess={() => {
            setSelectedMeetingId(null);
          }}
        />
      )}

      <MeetingDetailsDialog
        open={meetingDetailsDialogOpen}
        onOpenChange={(open) => {
          setMeetingDetailsDialogOpen(open);
          if (!open) {
            setSelectedMeetingId(null);
          }
        }}
        meetingId={selectedMeetingId || undefined}
        onEdit={(meetingId) => {
          setSelectedMeetingId(meetingId);
          setMeetingDetailsDialogOpen(false);
          setMeetingDialogOpen(true);
        }}
      />

      {previewLead && (
        <LeadMediaDialog
          open={mediaDialogOpen}
          onOpenChange={setMediaDialogOpen}
          leadId={previewLead.id}
          onSuccess={() => {}}
        />
      )}

      <DeleteConfirmDialog
        open={meetingDeleteDialog.open}
        onOpenChange={(open) =>
          setMeetingDeleteDialog((prev) => ({
            open,
            meetingId: open ? prev.meetingId : undefined,
            meetingTitle: open ? prev.meetingTitle : undefined,
          }))
        }
        itemName={meetingDeleteDialog.meetingTitle || "this meeting"}
        itemId={meetingDeleteDialog.meetingId}
        onConfirm={async (itemId) => {
          if (itemId) {
            await handleDeleteMeeting(itemId);
          }
        }}
        isLoading={deleteMeetingMutation.isPending}
        title="Delete Meeting"
        description={`Are you sure you want to delete "${meetingDeleteDialog.meetingTitle}"? This action cannot be undone.`}
      />

      <BulkImportExportDialog
        open={importExportDialogOpen}
        onOpenChange={setImportExportDialogOpen}
        title="Import / Export Sales Leads"
        description="Import leads from Excel/CSV files or export existing leads"
        importFields={importFields}
        importApiEndpoint="/api/sales-leads/import"
        importSampleData={importSampleData}
        importFileName="sales-leads"
        exportData={dataHook.tableData}
        exportFields={filteredExportFields}
        exportFileName="sales-leads"
        exportDataTransform={exportDataTransform}
        workspaceId={workspaceId}
        onImportComplete={handleImportComplete}
        token={token || undefined}
        initialTab={importExportTab}
      />
    </>
  );
}
