"use client";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  useWorkspacePermissions,
  useWorkspaceRoutePermission,
} from "@/hooks/use-workspace-permissions";
import { useDeleteMeeting } from "@/hooks/use-meetings";
import { useSalesLeadsData } from "@/hooks/use-sales-leads-data";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { ColumnDefinition } from "@/components/common/column-customizer";
import { formatStatus } from "@/lib/utils/sales-lead-utils";
import { STATUS_STYLE_MAP } from "@/lib/constants/sales-leads";
import { useSalesLeadForm } from "@/hooks/use-sales-lead-form";
import { useSalesLeadActions } from "@/hooks/use-sales-lead-actions";
import { useBusinesses } from "@/hooks/use-business";
import { ADD_BUSINESS_SELECT_VALUE } from "@/lib/constants/sales-leads";
import { toast } from "sonner";
import type { ImportResult } from "@/components/reuseableComponent/bulk-import-export-dialog";
import type { DateRange } from "@/components/common/date-range-filter";

export function useSalesLeadsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog States
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [addSalesLeadSidebarOpen, setAddSalesLeadSidebarOpen] = useState(false);
  const [previewLead, setPreviewLead] = useState<any | null>(null);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState<"import" | "export">(
    "import",
  );
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDetailsDialogOpen, setMeetingDetailsDialogOpen] =
    useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null,
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
  const [addBusinessDialogOpen, setAddBusinessDialogOpen] = useState(false);
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
  const [isColumnInitialized, setIsColumnInitialized] = useState(false);

  // Load columns from local storage on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem("sales_leads_visible_columns");
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        if (Array.isArray(parsed)) {
          setVisibleColumns(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved columns", e);
      }
    }
    setIsColumnInitialized(true);
  }, []);

  // Save columns to local storage whenever they change
  useEffect(() => {
    if (isColumnInitialized) {
      localStorage.setItem(
        "sales_leads_visible_columns",
        JSON.stringify(visibleColumns),
      );
    }
  }, [visibleColumns, isColumnInitialized]);

  // Permissions
  const { data: permissionsData, isLoading: isLoadingPermissions } =
    useWorkspacePermissions();
  const canViewSalesLeads = useWorkspaceRoutePermission("Sales Leads", "view");
  const canCreateSalesLeads = useWorkspaceRoutePermission(
    "Sales Leads",
    "create",
  );
  const canUpdateSalesLeads = useWorkspaceRoutePermission(
    "Sales Leads",
    "update",
  );
  const canDeleteSalesLeads = useWorkspaceRoutePermission(
    "Sales Leads",
    "delete",
  );

  // Data Hook
  const dataHook = useSalesLeadsData(
    workspaceId,
    page,
    pageSize,
    previewLead?.id,
    undefined, // statusFilter
    dateRange,
    searchTerm,
  );

  const hasAssignedLeads = dataHook.salesLeads && dataHook.salesLeads.count > 0;
  const effectiveCanViewSalesLeads = canViewSalesLeads || hasAssignedLeads;
  const isSalesLeadsVisible =
    useWorkspaceRoutePermission("Sales Leads", "visible") || hasAssignedLeads;

  const deleteMeetingMutation = useDeleteMeeting();

  // Form Hook
  const formHook = useSalesLeadForm();

  // Computed Values
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

  // Actions Hook
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

  // Businesses
  const { data: businessesData, isLoading: businessesLoading } = useBusinesses({
    page: 1,
    limit: 1000,
  });
  const businessOptions = useMemo(
    () => businessesData?.data ?? [],
    [businessesData?.data],
  );

  // Table Column Definitions
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
    [],
  );

  // Handlers
  const handlePreviewLead = useCallback(
    (lead: any) => {
      actionsHook.handlePreviewLead(lead, setIsLoadingPreview);
    },
    [actionsHook],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleRowsPerPageChange = useCallback(
    (nextRowsPerPage: number, nextPage: number) => {
      setPageSize(nextRowsPerPage);
      setPage(nextPage);
    },
    [],
  );

  const handleToggleColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId],
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
        `Import completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicates} duplicates`,
      );
    },
    [queryClient],
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
    [deleteMeetingMutation],
  );

  const handleAddBusinessClick = useCallback(() => {
    setAddBusinessDialogOpen(true);
  }, []);

  const handleBusinessSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_BUSINESS_SELECT_VALUE) {
        handleAddBusinessClick();
        return;
      }
      formHook.handleFormChange("businessId", value);
    },
    [formHook.handleFormChange, handleAddBusinessClick],
  );

  const handleDateRangeChange = useCallback((range: DateRange | null) => {
    setDateRange(range);
    setPage(1); // Reset to first page when filter changes
  }, []);

  const handleDateRangeClear = useCallback(() => {
    setDateRange(null);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  }, []);

  return {
    // Workspace & Auth
    workspaceId,
    token,
    user,
    permissionsData,
    isLoadingPermissions,

    // Permissions
    canViewSalesLeads,
    canCreateSalesLeads,
    canUpdateSalesLeads,
    canDeleteSalesLeads,
    effectiveCanViewSalesLeads,
    isSalesLeadsVisible,

    // Data
    dataHook,
    businessOptions,
    businessesLoading,
    previewLead,
    previewLeadDisplayName,
    statusLabel,
    statusClassName,

    // Filters & Pagination
    dateRange,
    handleDateRangeChange,
    handleDateRangeClear,
    searchTerm,
    handleSearchChange,
    page,
    pageSize,
    handlePageChange,
    handleRowsPerPageChange,

    // Columns
    tableColumnDefinitions,
    visibleColumns,
    handleToggleColumn,
    handleApplyColumns,

    // Dialogs & Sidebars
    previewDialogOpen,
    isLoadingPreview,
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

    // Form & Actions
    formHook,
    actionsHook,

    // Handlers
    handlePreviewLead,
    handleImportComplete,
    handleDeleteMeeting,
    handleAddBusinessClick,
    handleBusinessSelectChange,

    // Query Client
    queryClient,
    deleteMeetingMutation,
  };
}
