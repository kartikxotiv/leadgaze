import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { FormData } from "@/lib/constants/sales-contacts";
import {
  INITIAL_FORM_ERRORS,
  ADD_PLATFORM_SELECT_VALUE,
} from "@/lib/constants/sales-contacts";
import {
  normalizePhoneNumberFromString,
  formatStatus,
  formatDateTime,
} from "@/lib/utils/sales-contact-utils";
import type { SalesContactInsert } from "@/lib/data/sales-contacts";
import type { SalesLeadInsert } from "@/lib/data/sales-leads";
import type { ContactPlatform } from "@/lib/data/contact-platforms";
import {
  useCreateSalesContact,
  useUpdateSalesContact,
  useDeleteSalesContact,
} from "@/hooks/use-sales-contact";
import { useCreateSalesLead } from "@/hooks/use-sales-leads";
import { useCreateContactPlatform } from "@/hooks/use-contact-platforms";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

interface UseSalesContactActionsProps {
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
    value: FormData[K],
  ) => void;
  handleEditFormChange: <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => void;
  validateForm: () => boolean;
  validateEditForm: () => boolean;
  resetFormState: () => void;
  resetEditFormState: () => void;
  mapContactToFormData: (contact: any) => FormData;
  platformOptions: ContactPlatform[];
  platformNameMap: Map<number, string>;
  previewContact: any | null;
  setPreviewContact: React.Dispatch<React.SetStateAction<any | null>>;
  setPreviewSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAddSalesContactSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      salesContactId?: string;
      salesContactName?: string;
    }>
  >;
  setAddPlatformDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      platformName: string;
      error: string;
      targetForm: "add" | "edit";
    }>
  >;
  addPlatformDialog: {
    open: boolean;
    platformName: string;
    error: string;
    targetForm: "add" | "edit";
  };
  handleAddPlatformDialogOpenChange: (
    open: boolean,
    targetForm?: "add" | "edit",
  ) => void;
}

export function useSalesContactActions({
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
}: UseSalesContactActionsProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const createSalesContactMutation = useCreateSalesContact();
  const createSalesLeadMutation = useCreateSalesLead();
  const createContactPlatformMutation = useCreateContactPlatform();
  const updateSalesContactMutation = useUpdateSalesContact();
  const deleteSalesContactMutation = useDeleteSalesContact();
  const [movingToLeadContactId, setMovingToLeadContactId] = useState<
    string | null
  >(null);

  const handleDeleteSalesContact = useCallback(
    (salesContactId: string, salesContactName: string) => {
      setDeleteDialog({
        open: true,
        salesContactId,
        salesContactName,
      });
    },
    [setDeleteDialog],
  );

  const handleMoveToLead = useCallback(
    async (contact: any) => {
      if (!contact?.id) {
        toast.error("Select a sales contact to move to leads.");
        return;
      }

      if (!currentWorkspace?.id) {
        toast.error(
          "Please select a workspace before moving contacts to leads.",
        );
        return;
      }

      if (contact.status === "moved_to_lead") {
        toast.info("This contact is already moved to Sales Leads.");
        return;
      }

      const contactId = String(contact.id);
      const firstName = (contact.first_name ?? "").trim();
      const normalizedPhone = normalizePhoneNumberFromString(
        contact.phone_number != null ? String(contact.phone_number) : null,
      );
      // Keep alternative_phone_number as string - don't normalize to number
      // The database column is VARCHAR(255), so we should store it as string directly
      const alternativePhoneNumber = contact.alternative_phone_number
        ? String(contact.alternative_phone_number).trim()
        : null;
      const rawPlatformId =
        contact.platform !== undefined && contact.platform !== null
          ? Number(contact.platform)
          : null;
      const platformId =
        rawPlatformId !== null && Number.isNaN(rawPlatformId)
          ? null
          : rawPlatformId;

      const payload: SalesLeadInsert & { business_id?: string | null } = {
        first_name: firstName || "Unnamed Contact",
        last_name: contact.last_name?.trim() || null,
        email: contact.email?.trim() || null,
        phone_number: normalizedPhone,
        location: contact.location?.trim() || null,
        contact_time_zone: contact.contact_time_zone?.trim() || null,
        status: "in_progress",
        workspace_id: currentWorkspace.id,
        platform: platformId,
        priority: null,
        contact_id: contactId,
        alternative_email: contact.alternative_email?.trim() || null,
        alternative_phone_number: alternativePhoneNumber,
        linkedin_url: contact.linkedin_url?.trim() || null,
        business_name: contact.business_name?.trim() || null,
        business_linkedin: contact.business_linkedin?.trim() || null,
        business_contact: contact.business_contact?.trim() || null,
        comment: contact.comment?.trim() || null,
        business_id: contact.business_id || null,
      };

      try {
        setMovingToLeadContactId(contactId);
        await createSalesLeadMutation.mutateAsync(payload);
        const updatedContact = await updateSalesContactMutation.mutateAsync({
          id: contactId,
          data: { status: "moved_to_lead" },
        });
        toast.success(
          "Contact moved to Lead successfully. You can view it in the Leads page",
        );

        setPreviewContact((prev: any) => {
          if (!prev || prev.id !== contact.id) {
            return prev;
          }
          const platformLabel =
            updatedContact?.platform !== undefined &&
            updatedContact?.platform !== null
              ? (platformNameMap.get(updatedContact.platform) ??
                prev.platform_label ??
                "")
              : "";
          return {
            ...prev,
            ...updatedContact,
            status_label: formatStatus(updatedContact.status),
            platform_label: platformLabel,
            created_at_label: formatDateTime(updatedContact.created_at),
            updated_at_label: formatDateTime(updatedContact.updated_at),
          };
        });

        if (previewContact?.id === contact.id) {
          setEditFormData(mapContactToFormData(updatedContact));
          setEditErrors({ ...INITIAL_FORM_ERRORS });
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to move contact to lead.");
      } finally {
        setMovingToLeadContactId(null);
      }
    },
    [
      currentWorkspace?.id,
      createSalesLeadMutation,
      mapContactToFormData,
      previewContact?.id,
      platformNameMap,
      updateSalesContactMutation,
      setPreviewContact,
      setEditFormData,
      setEditErrors,
    ],
  );

  const handleReject = useCallback(
    async (contact: any) => {
      if (!contact?.id) {
        toast.error("Select a sales contact to reject.");
        return;
      }

      if (contact.status === "rejected") {
        toast.info("This contact is already rejected.");
        return;
      }

      const contactId = String(contact.id);

      try {
        const updatedContact = await updateSalesContactMutation.mutateAsync({
          id: contactId,
          data: { status: "rejected" },
        });
        toast.success("Sales contact rejected successfully!");

        setPreviewContact((prev: any) => {
          if (!prev || prev.id !== contact.id) {
            return prev;
          }
          const platformLabel =
            updatedContact?.platform !== undefined &&
            updatedContact?.platform !== null
              ? (platformNameMap.get(updatedContact.platform) ??
                prev.platform_label ??
                "")
              : "";
          return {
            ...prev,
            ...updatedContact,
            status_label: formatStatus(updatedContact.status),
            platform_label: platformLabel,
            created_at_label: formatDateTime(updatedContact.created_at),
            updated_at_label: formatDateTime(updatedContact.updated_at),
          };
        });

        if (previewContact?.id === contact.id) {
          setEditFormData(mapContactToFormData(updatedContact));
          setEditErrors({ ...INITIAL_FORM_ERRORS });
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to reject contact.");
      }
    },
    [
      mapContactToFormData,
      platformNameMap,
      previewContact?.id,
      updateSalesContactMutation,
      setPreviewContact,
      setEditFormData,
      setEditErrors,
    ],
  );

  const confirmDeleteSalesContact = useCallback(
    async (salesContactId?: string) => {
      if (!salesContactId) return;
      try {
        await deleteSalesContactMutation.mutateAsync(salesContactId);
        toast.success("Contact deleted successfully");
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete contact");
        throw err;
      }
    },
    [deleteSalesContactMutation],
  );

  const handlePreviewContact = useCallback(
    (contact: any) => {
      setPreviewContact(contact);
      setPreviewSidebarOpen(true);
      setEditFormData(mapContactToFormData(contact));
      setEditErrors({ ...INITIAL_FORM_ERRORS });
    },
    [
      mapContactToFormData,
      setPreviewContact,
      setPreviewSidebarOpen,
      setEditFormData,
      setEditErrors,
    ],
  );

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      setPreviewSidebarOpen(open);
      if (!open) {
        setPreviewContact(null);
        resetEditFormState();
      }
    },
    [resetEditFormState, setPreviewSidebarOpen, setPreviewContact],
  );

  const handleAddSalesContactSidebarOpenChange = useCallback(
    (open: boolean) => {
      setAddSalesContactSidebarOpen(open);
      if (!open) {
        resetFormState();
      }
    },
    [resetFormState, setAddSalesContactSidebarOpen],
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
      (platform) => platform.name.toLowerCase() === platformName.toLowerCase(),
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
      const newPlatform =
        await createContactPlatformMutation.mutateAsync(platformName);
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
    createContactPlatformMutation,
    handleEditFormChange,
    handleFormChange,
    platformOptions,
    setAddPlatformDialog,
  ]);

  const handleSubmit = useCallback(
    async (saveAndExit: boolean = true) => {
      if (!currentWorkspace?.id) {
        toast.error("Please select a workspace before creating contacts.");
        return;
      }

      if (!validateForm()) {
        toast.error("Please fix the highlighted errors.");
        return;
      }

      let platformId: number | null = formData.platformId
        ? Number(formData.platformId)
        : null;

      const manualPlatformName = formData.platformCustom.trim();

      if (!platformId && manualPlatformName) {
        const existingPlatform = platformOptions.find(
          (platform) =>
            platform.name.toLowerCase() === manualPlatformName.toLowerCase(),
        );

        if (existingPlatform) {
          platformId = existingPlatform.id ?? null;
        } else {
          try {
            const newPlatform =
              await createContactPlatformMutation.mutateAsync(
                manualPlatformName,
              );
            platformId = newPlatform?.id ?? null;
          } catch (error: any) {
            toast.error(
              error?.message || "Failed to create platform. Please try again.",
            );
            return;
          }
        }
      }

      const payload: SalesContactInsert = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim() || null,
        email: formData.email.trim() || null,
        phone_number: formData.phoneNumber.trim() || null,
        location: formData.location.trim() || null,
        contact_time_zone: formData.contactTimeZone.trim() || null,
        status: "pending", // Force status to "pending" when creating new contact
        workspace_id: currentWorkspace.id,
        platform: platformId,

        alternative_email: formData.alternativeEmail.trim() || null,
        alternative_phone_number:
          formData.alternativePhoneNumber.trim() || null,
        business_contact: formData.businessContact.trim() || null,
        business_linkedin: formData.businessLinkedin.trim() || null,
        business_name: formData.businessName.trim() || null,
        comment: formData.comment.trim() || null,
        linkedin_url: formData.linkedinUrl.trim() || null,
        business_id: formData.businessId.trim() || null,
      } as SalesContactInsert;

      try {
        await createSalesContactMutation.mutateAsync(payload);
        toast.success("Contact saved success fully");
        resetFormState();
        if (saveAndExit) {
          setAddSalesContactSidebarOpen(false);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to create sales contact.");
      }
    },
    [
      createContactPlatformMutation,
      createSalesContactMutation,
      currentWorkspace?.id,
      formData,
      platformOptions,
      resetFormState,
      validateForm,
      setAddSalesContactSidebarOpen,
    ],
  );

  const handleUpdateSubmit = useCallback(async () => {
    const contactId = previewContact?.id;
    if (!contactId) {
      toast.error("Select a sales contact to update.");
      return;
    }

    if (!validateEditForm()) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    let platformId: number | null = editFormData.platformId
      ? Number(editFormData.platformId)
      : null;

    const manualPlatformName = editFormData.platformCustom.trim();

    if (!platformId && manualPlatformName) {
      const existingPlatform = platformOptions.find(
        (platform) =>
          platform.name.toLowerCase() === manualPlatformName.toLowerCase(),
      );

      if (existingPlatform) {
        platformId = existingPlatform.id ?? null;
      } else {
        try {
          const newPlatform =
            await createContactPlatformMutation.mutateAsync(manualPlatformName);
          platformId = newPlatform?.id ?? null;
        } catch (error: any) {
          toast.error(
            error?.message || "Failed to create platform. Please try again.",
          );
          return;
        }
      }
    }

    const payload = {
      first_name: editFormData.firstName.trim(),
      last_name: editFormData.lastName.trim() || null,
      email: editFormData.email.trim() || null,
      phone_number: editFormData.phoneNumber.trim() || null,
      location: editFormData.location.trim() || null,
      contact_time_zone: editFormData.contactTimeZone.trim() || null,
      status: editFormData.status,
      platform: platformId,
      alternative_email: editFormData.alternativeEmail.trim() || null,
      alternative_phone_number:
        editFormData.alternativePhoneNumber.trim() || null,
      business_contact: editFormData.businessContact.trim() || null,
      business_linkedin: editFormData.businessLinkedin.trim() || null,
      business_name: editFormData.businessName.trim() || null,
      comment: editFormData.comment.trim() || null,
      linkedin_url: editFormData.linkedinUrl.trim() || null,
      business_id: editFormData.businessId.trim() || null,
    };

    try {
      const updatedContact = await updateSalesContactMutation.mutateAsync({
        id: String(contactId),
        data: payload,
      });
      toast.success("Contact saved success fully");
      setPreviewContact((prev: any) => {
        if (!prev) return prev;
        const platformLabel =
          updatedContact?.platform !== undefined &&
          updatedContact?.platform !== null
            ? (platformNameMap.get(updatedContact.platform) ??
              prev.platform_label ??
              "")
            : "";
        return {
          ...prev,
          ...updatedContact,
          platform_label: platformLabel,
          status_label: formatStatus(updatedContact?.status),
          created_at_label: formatDateTime(updatedContact?.created_at),
          updated_at_label: formatDateTime(updatedContact?.updated_at),
        };
      });
      setEditFormData(mapContactToFormData(updatedContact));
      setEditErrors({ ...INITIAL_FORM_ERRORS });
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sales contact.");
    }
    handleSidebarOpenChange(false);
  }, [
    createContactPlatformMutation,
    editFormData,
    mapContactToFormData,
    platformNameMap,
    platformOptions,
    previewContact?.id,
    updateSalesContactMutation,
    validateEditForm,
    setPreviewContact,
    setEditFormData,
    setEditErrors,
    handleSidebarOpenChange,
  ]);

  const handlePlatformSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_PLATFORM_SELECT_VALUE) {
        handleAddPlatformDialogOpenChange(true, "add");
        return;
      }
      handleFormChange("platformId", value);
    },
    [handleAddPlatformDialogOpenChange, handleFormChange],
  );

  const handleEditPlatformSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_PLATFORM_SELECT_VALUE) {
        handleAddPlatformDialogOpenChange(true, "edit");
        return;
      }
      handleEditFormChange("platformId", value);
    },
    [handleAddPlatformDialogOpenChange, handleEditFormChange],
  );

  return {
    handleDeleteSalesContact,
    handleMoveToLead,
    handleReject,
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
    isSaving:
      createSalesContactMutation.isPending ||
      createContactPlatformMutation.isPending,
    isAddingPlatform: createContactPlatformMutation.isPending,
    isUpdating: updateSalesContactMutation.isPending,
    deleteSalesContactMutation,
  };
}
