import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { FormData } from "@/lib/constants/sales-leads";
import {
  INITIAL_FORM_ERRORS,
  NO_SELECTION_VALUE,
} from "@/lib/constants/sales-leads";
import {
  normalizePhoneNumber,
  mapLeadToTableRow,
  ADD_PLATFORM_SELECT_VALUE,
} from "@/lib/utils/sales-lead-utils";
import type { SalesLeadInsert } from "@/lib/data/sales-leads";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import type { ContactPlatform } from "@/lib/data/contact-platforms";
import {
  useCreateSalesLead,
  useUpdateSalesLead,
  useDeleteSalesLead,
} from "@/hooks/use-sales-leads";
import { useCreateContactPlatform } from "@/hooks/use-contact-platforms";
import {
  useCreateLeadComment,
  useUpdateLeadComment,
  useDeleteLeadComment,
} from "@/hooks/use-lead-comments";
import { useDeleteMeeting } from "@/hooks/use-meetings";

interface UseSalesLeadActionsProps {
  formData: FormData;
  editFormData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setEditFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setErrors: React.Dispatch<
    React.SetStateAction<Record<keyof FormData, string>>
  >;
  setEditErrors: React.Dispatch<
    React.SetStateAction<Record<keyof FormData, string>>
  >;
  handleFormChange: <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => void;
  handleEditFormChange: <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => void;
  validateForm: () => boolean;
  validateEditForm: () => boolean;
  resetFormState: () => void;
  resetEditFormState: () => void;
  mapLeadToFormData: (lead: any) => FormData;
  platformOptions: ContactPlatform[];
  priorityOptions: LeadPriority[];
  contactOptions: any[];
  priorityMap: Map<string, LeadPriority>;
  platformMap: Map<number, string>;
  contactNameMap: Map<string, string>;
  contactPhoneMap: Map<string, string>;
  previewLead: any | null;
  setPreviewLead: React.Dispatch<React.SetStateAction<any | null>>;
  setPreviewDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAddSalesLeadSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      salesLeadId?: string;
      salesLeadName?: string;
    }>
  >;
  workspaceId?: string;
  user: any;
  token?: string;
}

export function useSalesLeadActions({
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
  mapLeadToFormData,
  platformOptions,
  priorityOptions,
  contactOptions,
  priorityMap,
  platformMap,
  contactNameMap,
  contactPhoneMap,
  previewLead,
  setPreviewLead,
  setPreviewDialogOpen,
  setAddSalesLeadSidebarOpen,
  setDeleteDialog,
  workspaceId,
  user,
  token,
}: UseSalesLeadActionsProps) {
  const createSalesLeadMutation = useCreateSalesLead();
  const createContactPlatformMutation = useCreateContactPlatform();
  const updateSalesLeadMutation = useUpdateSalesLead();
  const deleteSalesLeadMutation = useDeleteSalesLead();
  const createLeadCommentMutation = useCreateLeadComment();
  const updateLeadCommentMutation = useUpdateLeadComment();
  const deleteLeadCommentMutation = useDeleteLeadComment();
  const deleteMeetingMutation = useDeleteMeeting();

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

  const [newCommentText, setNewCommentText] = useState("");

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

  const handleAddPlatformDialogAddPlatform = useCallback(async () => {
    const platformName = addPlatformDialog.platformName.trim();
    const targetForm = addPlatformDialog.targetForm ?? "add";

    if (!platformName) {
      setAddPlatformDialog((prev) => ({
        ...prev,
        error: "Platform name is required",
      }));
      return;
    }

    const existingPlatform = platformOptions.find(
      (platform) => platform.name.toLowerCase() === platformName.toLowerCase()
    );

    if (existingPlatform?.id !== undefined && existingPlatform?.id !== null) {
      if (targetForm === "edit") {
        handleEditFormChange("platformId", String(existingPlatform.id));
      } else {
        handleFormChange("platformId", String(existingPlatform.id));
      }
      toast.success("Platform already existed, selected it for you.");
      setAddPlatformDialog({
        open: false,
        platformName: "",
        error: "",
        targetForm,
      });
      return;
    }

    try {
      const newPlatform = await createContactPlatformMutation.mutateAsync(
        platformName
      );
      if (newPlatform?.id !== undefined && newPlatform?.id !== null) {
        if (targetForm === "edit") {
          handleEditFormChange("platformId", String(newPlatform.id));
        } else {
          handleFormChange("platformId", String(newPlatform.id));
        }
      }
      toast.success("Platform added successfully!");
      setAddPlatformDialog({
        open: false,
        platformName: "",
        error: "",
        targetForm,
      });
    } catch (error: any) {
      setAddPlatformDialog((prev) => ({
        ...prev,
        error: error?.message || "Failed to create platform. Please try again.",
      }));
    }
  }, [
    addPlatformDialog.platformName,
    addPlatformDialog.targetForm,
    createContactPlatformMutation,
    handleEditFormChange,
    handleFormChange,
    platformOptions,
  ]);

  const handlePlatformSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_PLATFORM_SELECT_VALUE) {
        handleAddPlatformDialogOpenChange(true, "add");
        return;
      }
      handleFormChange("platformId", value);
    },
    [handleAddPlatformDialogOpenChange, handleFormChange]
  );

  const handleEditPlatformSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_PLATFORM_SELECT_VALUE) {
        handleAddPlatformDialogOpenChange(true, "edit");
        return;
      }
      handleEditFormChange("platformId", value);
    },
    [handleAddPlatformDialogOpenChange, handleEditFormChange]
  );

  const handlePrioritySelectChange = useCallback(
    (value: string) => {
      handleFormChange("priorityId", value);
    },
    [handleFormChange]
  );

  const handleEditPrioritySelectChange = useCallback(
    (value: string) => {
      handleEditFormChange("priorityId", value);
    },
    [handleEditFormChange]
  );

  const handleContactSelectChange = useCallback(
    (value: string) => {
      handleFormChange("contactId", value);
    },
    [handleFormChange]
  );

  const handleEditContactSelectChange = useCallback(
    (value: string) => {
      handleEditFormChange("contactId", value);
    },
    [handleEditFormChange]
  );

  const handleSubmit = useCallback(
    async (saveAndExit: boolean = true) => {
      if (!workspaceId) {
        toast.error("Please select a workspace before creating leads.");
        return;
      }

      if (!validateForm()) {
        toast.error("Please fix the highlighted errors.");
        return;
      }

      let platformId: number | null =
        formData.platformId && formData.platformId !== NO_SELECTION_VALUE
          ? Number(formData.platformId)
          : null;

      const manualPlatformName = formData.platformCustom.trim();

      if (!platformId && manualPlatformName) {
        const existingPlatform = platformOptions.find(
          (platform) =>
            platform.name.toLowerCase() === manualPlatformName.toLowerCase()
        );

        if (existingPlatform) {
          platformId = existingPlatform.id ?? null;
        } else {
          try {
            const newPlatform = await createContactPlatformMutation.mutateAsync(
              manualPlatformName
            );
            platformId = newPlatform?.id ?? null;
          } catch (error: any) {
            toast.error(
              error?.message || "Failed to create platform. Please try again."
            );
            return;
          }
        }
      }

      const payload: SalesLeadInsert = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim() || null,
        email: formData.email.trim() || null,
        phone_number: normalizePhoneNumber(formData.phoneNumber),
        location: formData.location.trim() || null,
        contact_time_zone: formData.contactTimeZone.trim() || null,
        status: formData.status,
        workspace_id: workspaceId,
        platform: platformId,
        priority:
          formData.priorityId !== NO_SELECTION_VALUE
            ? formData.priorityId
            : null,
        contact_id:
          formData.contactId !== NO_SELECTION_VALUE ? formData.contactId : null,
        owner_id:
          formData.ownerId !== NO_SELECTION_VALUE ? formData.ownerId : null,
        alternative_email: formData.alternativeEmail.trim() || null,
        alternative_phone_number:
          formData.alternativePhoneNumber.trim() || null,
        linkedin_url: formData.linkedinUrl.trim() || null,
        business_name: formData.businessName.trim() || null,
        business_linkedin: formData.businessLinkedin.trim() || null,
        business_contact: formData.businessContact.trim() || null,
        business_id: formData.businessId.trim() || null,
        comment: formData.comment.trim() || null,
      } as SalesLeadInsert;

      try {
        await createSalesLeadMutation.mutateAsync(payload);
        toast.success("Sales lead created successfully!");
        resetFormState();
        if (saveAndExit) {
          setAddSalesLeadSidebarOpen(false);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to create sales lead.");
      }
    },
    [
      createContactPlatformMutation,
      createSalesLeadMutation,
      workspaceId,
      formData,
      platformOptions,
      resetFormState,
      validateForm,
      setAddSalesLeadSidebarOpen,
    ]
  );

  const handleUpdateSubmit = useCallback(async () => {
    const leadId = previewLead?.id;
    if (!leadId) {
      toast.error("Select a sales lead to update.");
      return;
    }

    if (!validateEditForm()) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    // Check if status is changing to "opportunities"
    const previousStatus = previewLead?.status;
    const newStatus = editFormData.status;
    const isChangingToOpportunities =
      previousStatus !== "opportunities" && newStatus === "opportunities";

    let platformId: number | null =
      editFormData.platformId && editFormData.platformId !== NO_SELECTION_VALUE
        ? Number(editFormData.platformId)
        : null;

    const manualPlatformName = editFormData.platformCustom.trim();

    if (!platformId && manualPlatformName) {
      const existingPlatform = platformOptions.find(
        (platform) =>
          platform.name.toLowerCase() === manualPlatformName.toLowerCase()
      );

      if (existingPlatform) {
        platformId = existingPlatform.id ?? null;
      } else {
        try {
          const newPlatform = await createContactPlatformMutation.mutateAsync(
            manualPlatformName
          );
          platformId = newPlatform?.id ?? null;
        } catch (error: any) {
          toast.error(
            error?.message || "Failed to create platform. Please try again."
          );
          return;
        }
      }
    }

    const payload: any = {
      status: editFormData.status,
      platform: platformId,
      priority:
        editFormData.priorityId !== NO_SELECTION_VALUE
          ? editFormData.priorityId
          : null,
      contact_id:
        editFormData.contactId !== NO_SELECTION_VALUE
          ? editFormData.contactId
          : null,
      owner_id:
        editFormData.ownerId !== NO_SELECTION_VALUE
          ? editFormData.ownerId
          : null,
    };

    if (editFormData.firstName.trim()) {
      payload.first_name = editFormData.firstName.trim();
    }
    if (editFormData.lastName.trim()) {
      payload.last_name = editFormData.lastName.trim();
    }
    if (editFormData.email.trim()) {
      payload.email = editFormData.email.trim();
    }
    const normalizedPhone = normalizePhoneNumber(editFormData.phoneNumber);
    if (normalizedPhone) {
      payload.phone_number = normalizedPhone;
    }
    if (editFormData.location.trim()) {
      payload.location = editFormData.location.trim();
    }
    if (editFormData.contactTimeZone.trim()) {
      payload.contact_time_zone = editFormData.contactTimeZone.trim();
    }
    if (editFormData.alternativeEmail.trim()) {
      payload.alternative_email = editFormData.alternativeEmail.trim();
    }
    if (editFormData.alternativePhoneNumber.trim()) {
      payload.alternative_phone_number =
        editFormData.alternativePhoneNumber.trim();
    }
    if (editFormData.linkedinUrl.trim()) {
      payload.linkedin_url = editFormData.linkedinUrl.trim();
    }
    if (editFormData.businessName.trim()) {
      payload.business_name = editFormData.businessName.trim();
    }
    if (editFormData.businessLinkedin.trim()) {
      payload.business_linkedin = editFormData.businessLinkedin.trim();
    }
    if (editFormData.businessContact.trim()) {
      payload.business_contact = editFormData.businessContact.trim();
    }
    if (editFormData.businessId.trim()) {
      payload.business_id = editFormData.businessId.trim();
    }
    if (editFormData.comment.trim()) {
      payload.comment = editFormData.comment.trim();
    }

    try {
      const updatedLead = await updateSalesLeadMutation.mutateAsync({
        id: String(leadId),
        data: payload,
      });
      toast.success("Sales lead updated successfully!");

      // Show special message if status changed to opportunities
      if (isChangingToOpportunities) {
        toast.info(
          "Lead moved to Opportunities! You can view it in the Opportunities page.",
          {
            duration: 5000,
          }
        );
      }

      setPreviewLead((prev: any) => {
        if (!prev) return prev;
        const mappedRow = mapLeadToTableRow(updatedLead, {
          priorityMap,
          platformMap,
          contactNameMap,
          contactPhoneMap,
        });
        return {
          ...prev,
          ...mappedRow,
        };
      });
      setEditFormData(mapLeadToFormData(updatedLead));
      setEditErrors({ ...INITIAL_FORM_ERRORS });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sales lead.");
    }

    setPreviewDialogOpen(false);
  }, [
    createContactPlatformMutation,
    editFormData,
    mapLeadToFormData,
    platformOptions,
    previewLead?.id,
    previewLead?.status,
    priorityMap,
    platformMap,
    contactNameMap,
    updateSalesLeadMutation,
    validateEditForm,
    setPreviewLead,
    setEditFormData,
    setEditErrors,
    setPreviewDialogOpen,
  ]);

  const handleDeleteSalesLead = useCallback(
    (salesLeadId: string, salesLeadName: string) => {
      setDeleteDialog({
        open: true,
        salesLeadId,
        salesLeadName,
      });
    },
    [setDeleteDialog]
  );

  const confirmDeleteSalesLead = useCallback(
    async (salesLeadId?: string) => {
      if (!salesLeadId) return;
      try {
        await deleteSalesLeadMutation.mutateAsync(salesLeadId);
        toast.success("Sales lead deleted successfully");
        if (previewLead?.id === salesLeadId) {
          setPreviewDialogOpen(false);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete sales lead");
        throw err;
      }
    },
    [deleteSalesLeadMutation, previewLead?.id, setPreviewDialogOpen]
  );

  const handlePreviewLead = useCallback(
    async (lead: any, setIsLoadingPreview?: (loading: boolean) => void) => {
      setPreviewLead(lead);
      setPreviewDialogOpen(true);
      setNewCommentText("");
      setEditErrors({ ...INITIAL_FORM_ERRORS });
      setIsLoadingPreview?.(true);

      try {
        const response = await fetch(`/api/sales-leads/${lead.id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json();

        if (data.success && data.data) {
          setPreviewLead(data.data);
          setEditFormData(mapLeadToFormData(data.data));
        } else {
          setEditFormData(mapLeadToFormData(lead));
          toast.error("Failed to load complete lead details");
        }
      } catch (error) {
        console.error("Failed to fetch lead details:", error);
        setEditFormData(mapLeadToFormData(lead));
        toast.error("Failed to load complete lead details");
      } finally {
        setIsLoadingPreview?.(false);
      }
    },
    [
      mapLeadToFormData,
      token,
      setPreviewLead,
      setPreviewDialogOpen,
      setEditFormData,
      setEditErrors,
    ]
  );

  const handlePreviewDialogOpenChange = useCallback(
    (open: boolean) => {
      setPreviewDialogOpen(open);
      if (!open) {
        setPreviewLead(null);
        resetEditFormState();
        setNewCommentText("");
      }
    },
    [resetEditFormState, setPreviewDialogOpen, setPreviewLead]
  );

  const handleAddSalesLeadSidebarOpenChange = useCallback(
    (open: boolean) => {
      setAddSalesLeadSidebarOpen(open);
      if (!open) {
        resetFormState();
      }
    },
    [resetFormState, setAddSalesLeadSidebarOpen]
  );

  const handleAddComment = useCallback(async () => {
    if (!previewLead?.id) {
      toast.error("Select a lead to comment on.");
      return;
    }
    const comment = newCommentText.trim();
    if (!comment) {
      toast.error("Comment cannot be empty.");
      return;
    }

    try {
      await createLeadCommentMutation.mutateAsync({
        leadId: String(previewLead.id),
        comment,
        createdBy: user?.userId ?? null,
      });
      toast.success("Comment added.");
      setNewCommentText("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to add comment.");
    }
  }, [createLeadCommentMutation, newCommentText, previewLead, user?.userId]);

  const handleEditComment = useCallback(
    async (commentId: string, newComment: string) => {
      if (!previewLead?.id) return;
      try {
        await updateLeadCommentMutation.mutateAsync({
          commentId,
          comment: newComment,
          leadId: String(previewLead.id),
        });
        toast.success("Comment updated.");
      } catch (error: any) {
        toast.error(error?.message || "Failed to update comment.");
        throw error;
      }
    },
    [updateLeadCommentMutation, previewLead]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!previewLead?.id) return;
      try {
        await deleteLeadCommentMutation.mutateAsync({
          commentId,
          leadId: String(previewLead.id),
        });
        toast.success("Comment deleted.");
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete comment.");
      }
    },
    [deleteLeadCommentMutation, previewLead]
  );

  const handleDeleteMeeting = useCallback(
    async (meetingId: string) => {
      if (!meetingId) return;
      try {
        await deleteMeetingMutation.mutateAsync(meetingId);
        toast.success("Meeting deleted successfully");
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete meeting");
      }
    },
    [deleteMeetingMutation]
  );

  return {
    handleDeleteSalesLead,
    confirmDeleteSalesLead,
    handlePreviewLead,
    handlePreviewDialogOpenChange,
    handleAddSalesLeadSidebarOpenChange,
    handleSubmit,
    handleUpdateSubmit,
    handlePlatformSelectChange,
    handleEditPlatformSelectChange,
    handlePrioritySelectChange,
    handleEditPrioritySelectChange,
    handleContactSelectChange,
    handleEditContactSelectChange,
    handleAddPlatformDialogAddPlatform,
    handleAddPlatformDialogOpenChange,
    handleAddPlatformDialogPlatformNameChange,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleDeleteMeeting,
    isSaving:
      createSalesLeadMutation.isPending ||
      createContactPlatformMutation.isPending,
    isAddingPlatform: createContactPlatformMutation.isPending,
    isUpdating: updateSalesLeadMutation.isPending,
    deleteSalesLeadMutation,
    createLeadCommentMutation,
    updateLeadCommentMutation,
    deleteLeadCommentMutation,
    addPlatformDialog,
    newCommentText,
    setNewCommentText,
  };
}
