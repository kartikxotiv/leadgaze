"use client";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  useWorkspacePermissions,
  useWorkspaceRoutePermission,
} from "@/hooks/use-workspace-permissions";
import { useSalesContacts } from "@/hooks/use-sales-contact";
import { useContactPlatforms } from "@/hooks/use-contact-platforms";
import { useBusinesses } from "@/hooks/use-business";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { ColumnDefinition } from "@/components/common/column-customizer";
import type { DateRange } from "@/components/common/date-range-filter";
import { formatStatus, formatDateTime } from "@/lib/utils/sales-contact-utils";
import { useSalesContactForm } from "@/hooks/use-sales-contact-form";
import { useSalesContactActions } from "@/hooks/use-sales-contact-actions";
import { ADD_BUSINESS_SELECT_VALUE } from "@/lib/constants/sales-contacts";
import { toast } from "sonner";
import type { ImportResult } from "@/components/reuseableComponent/bulk-import-export-dialog";

export function useSalesContactsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { data: permissionsData } = useWorkspacePermissions();

  // Permissions
  const canViewSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "view",
  );
  const canCreateSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "create",
  );
  const canUpdateSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "update",
  );
  const canDeleteSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "delete",
  );
  const isSalesContactsVisible = useWorkspaceRoutePermission(
    "Sales Contacts",
    "visible",
  );

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filters = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      page,
      limit: pageSize,
      workspaceId,
      search: searchTerm || undefined,
      dateFrom: dateRange?.from ? dateRange.from.toISOString() : undefined,
      dateTo: dateRange?.to ? dateRange.to.toISOString() : undefined,
    };
  }, [workspaceId, page, pageSize, dateRange, searchTerm]);

  // Platform Dialog State
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
          ? (targetForm ?? prev.targetForm ?? "add")
          : (prev.targetForm ?? "add"),
      }));
    },
    [],
  );

  const handleAddPlatformDialogPlatformNameChange = useCallback(
    (platformName: string) => {
      setAddPlatformDialog((prev) => ({ ...prev, platformName, error: "" }));
    },
    [],
  );

  // Data Fetching
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
    limit: 1000,
  });
  const businessOptions = useMemo(
    () => businessesData?.data ?? [],
    [businessesData?.data],
  );

  const platformNameMap = useMemo(() => {
    const map = new Map<number, string>();
    platformOptions.forEach((platform) => {
      if (platform.id !== undefined && platform.id !== null) {
        map.set(platform.id, platform.name);
      }
    });
    return map;
  }, [platformOptions]);

  const businessNameMap = useMemo(() => {
    const map = new Map<string, string>();
    businessOptions.forEach((business: any) => {
      if (business.id) {
        map.set(String(business.id), business.business_name ?? "");
      }
    });
    return map;
  }, [businessOptions]);

  const tableData = useMemo(() => {
    const contacts = salesContacts?.data ?? [];
    return contacts.map((contact) => ({
      ...contact,
      company_label: contact.company_id ?? "",
      platform_label: contact.platform
        ? (platformNameMap.get(contact.platform) ?? `ID ${contact.platform}`)
        : "",
      business_label: contact.business_id
        ? (businessNameMap.get(String(contact.business_id)) ?? "")
        : (contact.business_name ?? ""),
      status_label: formatStatus(contact.status),
      created_at_label: formatDateTime(contact.created_at),
      updated_at_label: formatDateTime(contact.updated_at),
    }));
  }, [salesContacts?.data, platformNameMap, businessNameMap]);

  // Dialog States
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    salesContactId?: string;
    salesContactName?: string;
  }>({ open: false });
  const [previewSidebarOpen, setPreviewSidebarOpen] = useState(false);
  const [addSalesContactSidebarOpen, setAddSalesContactSidebarOpen] =
    useState(false);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState<"import" | "export">(
    "import",
  );
  const [addBusinessDialogOpen, setAddBusinessDialogOpen] = useState(false);
  const [previewContact, setPreviewContact] = useState<any | null>(null);

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
  const [isColumnInitialized, setIsColumnInitialized] = useState(false);

  // Load columns from local storage on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem("sales_contacts_visible_columns");
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
        "sales_contacts_visible_columns",
        JSON.stringify(visibleColumns),
      );
    }
  }, [visibleColumns, isColumnInitialized]);

  // Form Management
  const formHook = useSalesContactForm();
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
  } = formHook;

  // Actions
  const actionsHook = useSalesContactActions({
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

  // Table Column Definitions
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
    [],
  );

  // Handlers
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(
        `Import completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicates} duplicates`,
      );
    },
    [queryClient],
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
      handleFormChange("businessId", value);
    },
    [handleFormChange, handleAddBusinessClick],
  );

  const handleDateRangeChange = useCallback((range: DateRange | null) => {
    setDateRange(range);
    setPage(1);
  }, []);

  const handleDateRangeClear = useCallback(() => {
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
    permissionsData,

    // Permissions
    canViewSalesContacts,
    canCreateSalesContacts,
    canUpdateSalesContacts,
    canDeleteSalesContacts,
    isSalesContactsVisible,

    // Data
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

    // Filters & Pagination
    dateRange,
    handleDateRangeChange,
    handleDateRangeClear,
    searchTerm,
    handleSearchChange,
    handlePageChange,
    handleRowsPerPageChange,

    // Columns
    tableColumnDefinitions,
    visibleColumns,
    handleToggleColumn,
    handleApplyColumns,

    // Dialogs & Sidebars
    deleteDialog,
    setDeleteDialog,
    previewSidebarOpen,
    addSalesContactSidebarOpen,
    importExportDialogOpen,
    setImportExportDialogOpen,
    importExportTab,
    setImportExportTab,
    addBusinessDialogOpen,
    setAddBusinessDialogOpen,
    addPlatformDialog,
    previewContact,

    // Form & Actions
    formHook,
    actionsHook,

    // Handlers
    handleImportComplete,
    handleAddBusinessClick,
    handleBusinessSelectChange,
    handleAddPlatformDialogOpenChange,
    handleAddPlatformDialogPlatformNameChange,

    // Query Client
    queryClient,
  };
}
