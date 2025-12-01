"use client";

import { useCallback, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  useWorkspacePermissions,
  useWorkspaceRoutePermission,
} from "@/hooks/use-workspace-permissions";
import { useDeleteMeeting } from "@/hooks/use-meetings";
import { useSalesLeadsData } from "@/hooks/use-sales-leads-data";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BulkImportExportDialog } from "@/components/reuseableComponent/bulk-import-export-dialog";
import type { ImportResult } from "@/components/reuseableComponent/bulk-import-export-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { ColumnDefinition } from "@/components/common/column-customizer";
import { ColumnCustomizer } from "@/components/common/column-customizer";
import { formatStatus } from "@/lib/utils/sales-lead-utils";
import { STATUS_STYLE_MAP } from "@/lib/constants/sales-leads";
import { useSalesLeadTableColumns } from "@/components/sales-leads/sales-lead-table-columns";
import { SalesLeadsTable } from "@/components/sales-leads/sales-leads-table";
import { AddLeadSidebar } from "@/components/sales-leads/add-lead-sidebar";
import { AddPlatformDialog } from "@/components/sales-leads/add-platform-dialog";
import { EditLeadDialog } from "@/components/sales-leads/edit-lead-dialog";
import { useSalesLeadForm } from "@/hooks/use-sales-lead-form";
import { useSalesLeadActions } from "@/hooks/use-sales-lead-actions";
import {
  importFields,
  exportFields,
  importSampleData,
  exportDataTransform,
} from "@/lib/config/sales-leads-import-export";
import { NoteDialog } from "@/components/notes/note-dialog";
import { MeetingDialog } from "@/components/meetings/meeting-dialog";
import { MeetingDetailsDialog } from "@/components/meetings/meeting-details-dialog";
import { LeadMediaDialog } from "@/components/lead-media/lead-media-dialog";

export default function OpportunitiesPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [addSalesLeadSidebarOpen, setAddSalesLeadSidebarOpen] = useState(false);
  const [previewLead, setPreviewLead] = useState<any | null>(null);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDetailsDialogOpen, setMeetingDetailsDialogOpen] =
    useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null
  );
  const [meetingDeleteDialog, setMeetingDeleteDialog] = useState<{
    open: boolean;
    meetingId?: string;
    meetingTitle?: string;
  }>({ open: false });
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    salesLeadId?: string;
    salesLeadName?: string;
  }>({ open: false });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "email",
    "phone_number",
    "status",
    "priority",
    "Location",
    "alternative_email",
    "alternative_phone_number",
    "linkedin_url",
    "business_name",
    "business_linkedin",
    "business_contact",
    "comment",
    "updated_at",
  ]);

  const { data: permissionsData, isLoading: isLoadingPermissions } =
    useWorkspacePermissions();
  const canViewSalesLeads = useWorkspaceRoutePermission("Sales Leads", "view");
  const canCreateSalesLeads = useWorkspaceRoutePermission(
    "Sales Leads",
    "create"
  );
  const canUpdateSalesLeads = useWorkspaceRoutePermission(
    "Sales Leads",
    "update"
  );
  const canDeleteSalesLeads = useWorkspaceRoutePermission(
    "Sales Leads",
    "delete"
  );

  // Filter by status = "opportunities"
  const dataHook = useSalesLeadsData(
    workspaceId,
    page,
    pageSize,
    previewLead?.id,
    "opportunities"
  );

  const hasAssignedLeads = dataHook.salesLeads && dataHook.salesLeads.count > 0;
  const effectiveCanViewSalesLeads = canViewSalesLeads || hasAssignedLeads;
  const isSalesLeadsVisible =
    useWorkspaceRoutePermission("Sales Leads", "visible") || hasAssignedLeads;

  const deleteMeetingMutation = useDeleteMeeting();

  const previewLeadDisplayName = useMemo(() => {
    if (!previewLead) return "";
    const name = `${previewLead.first_name ?? ""} ${
      previewLead.last_name ?? ""
    }`
      .trim()
      .replace(/\s+/g, " ");
    if (name) return name;
    if (previewLead.company) return previewLead.company;
    if (previewLead.email) return previewLead.email;
    return "Untitled Lead";
  }, [previewLead]);

  const formHook = useSalesLeadForm();

  const statusLabel = useMemo(() => {
    const status = formHook.editFormData.status || previewLead?.status;
    if (!status) return "";
    return formatStatus(status);
  }, [formHook.editFormData.status, previewLead?.status]);

  const statusClassName = useMemo(() => {
    const status = formHook.editFormData.status || previewLead?.status;
    if (!status) return "bg-gray-100 text-gray-700";
    return (
      STATUS_STYLE_MAP[status as keyof typeof STATUS_STYLE_MAP] ??
      "bg-gray-100 text-gray-700"
    );
  }, [formHook.editFormData.status, previewLead?.status]);

  const actionsHook = useSalesLeadActions({
    ...formHook,
    platformOptions: dataHook.platformOptions,
    priorityOptions: dataHook.priorityOptions,
    contactOptions: dataHook.contactOptions,
    priorityMap: dataHook.priorityMap,
    platformMap: dataHook.platformMap,
    contactNameMap: dataHook.contactNameMap,
    contactPhoneMap: dataHook.contactPhoneMap,
    previewLead,
    setPreviewLead,
    setPreviewDialogOpen,
    setAddSalesLeadSidebarOpen,
    setDeleteDialog,
    workspaceId,
    user,
    token: token || undefined,
  });

  const handlePreviewLead = useCallback(
    (lead: any) => {
      actionsHook.handlePreviewLead(lead, setIsLoadingPreview);
    },
    [actionsHook]
  );

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
      queryClient.invalidateQueries({ queryKey: ["sales-leads"] });
      setPage(1);
      toast.success(
        `Import completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicates} duplicates`
      );
    },
    [queryClient]
  );

  const handleDeleteMeeting = useCallback(
    async (meetingId: string) => {
      if (!meetingId) return;
      try {
        await deleteMeetingMutation.mutateAsync(meetingId);
        toast.success("Meeting deleted successfully");
        setMeetingDeleteDialog({ open: false });
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete meeting");
      }
    },
    [deleteMeetingMutation]
  );

  const tableColumnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { id: "email", label: "Email" },
      { id: "phone_number", label: "Phone" },
      { id: "status", label: "Status" },
      { id: "priority", label: "Priority" },
      { id: "Location", label: "Location" },
      { id: "alternative_email", label: "Alternative Email" },
      { id: "alternative_phone_number", label: "Alternative Phone Number" },
      { id: "linkedin_url", label: "LinkedIn URL" },
      { id: "business_name", label: "Business Name" },
      { id: "business_linkedin", label: "Business LinkedIn" },
      { id: "business_contact", label: "Business Contact" },
      { id: "comment", label: "Comment" },
      { id: "updated_at", label: "Updated" },
    ],
    []
  );

  const columns = useSalesLeadTableColumns({
    canUpdateSalesLeads,
    canDeleteSalesLeads,
    canCreateSalesLeads,
    handlePreviewLead,
    handleDeleteSalesLead: actionsHook.handleDeleteSalesLead,
    visibleColumns,
  });

  if (isLoadingPermissions && !permissionsData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">
              Opportunities
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your opportunities pipeline
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
            You don't have permission to view opportunities in this workspace.
          </p>
          <p className="text-xs mt-1">
            Contact your workspace administrator to grant access.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Manage your opportunities pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportExportDialogOpen(true)}
            disabled={!workspaceId}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportExportDialogOpen(true)}
            disabled={!dataHook.tableData || dataHook.tableData.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <ColumnCustomizer
            columns={tableColumnDefinitions}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
            onApply={handleApplyColumns}
            alwaysVisibleColumns={["name", "actions"]}
          />
          {canCreateSalesLeads && (
            <Button
              onClick={() =>
                actionsHook.handleAddSalesLeadSidebarOpenChange(true)
              }
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

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
        title="Delete Opportunity"
      />

      <EditLeadDialog
        open={previewDialogOpen}
        onOpenChange={actionsHook.handlePreviewDialogOpenChange}
        previewLead={previewLead}
        previewLeadDisplayName={previewLeadDisplayName}
        isLoadingPreview={isLoadingPreview}
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
        title="Import / Export Opportunities"
        description="Import opportunities from Excel/CSV files or export existing opportunities"
        importFields={importFields}
        importApiEndpoint="/api/sales-leads/import"
        importSampleData={importSampleData}
        importFileName="opportunities"
        exportData={dataHook.tableData}
        exportFields={exportFields}
        exportFileName="opportunities"
        exportDataTransform={exportDataTransform}
        workspaceId={workspaceId}
        onImportComplete={handleImportComplete}
        token={token || undefined}
      />
    </DashboardLayout>
  );
}
