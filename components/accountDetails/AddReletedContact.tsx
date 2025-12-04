"use client";

import { IdCard } from "lucide-react";
import React, { useState, useEffect } from "react";
import {
  useSalesContacts,
  useCreateSalesContact,
} from "@/hooks/use-sales-contact";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SalesContactFormFields } from "@/components/sales-contacts/sales-contact-form-fields";
import { useSalesContactForm } from "@/hooks/use-sales-contact-form";
import { useContactPlatforms } from "@/hooks/use-contact-platforms";
import { useBusinesses } from "@/hooks/use-business";
import { useSalesContactActions } from "@/hooks/use-sales-contact-actions";
import { AddPlatformDialog } from "@/components/sales-contacts/add-platform-dialog";

interface AddReletedContactProps {
  accountId?: string;
  businessId?: string;
}

export default function AddReletedContact({
  accountId,
  businessId,
}: AddReletedContactProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addPlatformDialog, setAddPlatformDialog] = useState({
    open: false,
    platformName: "",
    error: "",
    targetForm: "add" as "add" | "edit",
  });

  // Fetch sales contacts by business_id
  const {
    data: salesContactsData,
    isLoading,
    refetch,
  } = useSalesContacts({
    workspaceId: currentWorkspace?.id,
    businessId: businessId,
    limit: 100,
  });

  const salesContacts = salesContactsData?.data || [];

  // Form management
  const {
    formData,
    setFormData,
    errors,
    setErrors,
    handleFormChange,
    validateForm,
    resetFormState,
    editFormData,
    setEditFormData,
    editErrors,
    setEditErrors,
    handleEditFormChange,
    validateEditForm,
    resetEditFormState,
    mapContactToFormData,
  } = useSalesContactForm();

  // Fetch platforms and businesses
  const { data: platforms = [] } = useContactPlatforms();
  const { data: businessesData } = useBusinesses({
    limit: 100,
    page: 1,
  });
  const businesses = businessesData?.data || [];

  const createSalesContactMutation = useCreateSalesContact();

  const platformNameMap = new Map(platforms.map((p) => [p.id, p.name]));

  useEffect(() => {
    if (isDialogOpen && businessId) {
      handleFormChange("businessId", businessId);
    }
  }, [isDialogOpen, businessId]);

  // Handle platform name change
  const handleAddPlatformDialogPlatformNameChange = (name: string) => {
    setAddPlatformDialog((prev) => ({
      ...prev,
      platformName: name,
      error: "",
    }));
  };

  const { handleSubmit, handleAddPlatformDialogAddPlatform, isAddingPlatform } =
    useSalesContactActions({
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
      platformOptions: platforms,
      platformNameMap,
      previewContact: null,
      setPreviewContact: () => {},
      setPreviewSidebarOpen: () => {},
      setAddSalesContactSidebarOpen: setIsDialogOpen,
      setDeleteDialog: () => {},
      setAddPlatformDialog,
      addPlatformDialog,
      handleAddPlatformDialogOpenChange: (open, targetForm) => {
        setAddPlatformDialog((prev) => ({
          ...prev,
          open,
          targetForm: targetForm || "add",
        }));
      },
    });

  const handleCreateContact = async () => {
    await handleSubmit(true);
    // Refetch contacts after creation
    if (refetch) {
      setTimeout(() => {
        void refetch();
      }, 500);
    }
  };

  const handlePlatformSelectChange = (value: string) => {
    if (value === "+add-platform") {
      setAddPlatformDialog({
        open: true,
        platformName: "",
        error: "",
        targetForm: "add",
      });
      return;
    }
    handleFormChange("platformId", value);
  };

  const handleBusinessSelectChange = (value: string) => {
    if (value === "+add-business") {
      toast.info("Please create business first");
      return;
    }
    handleFormChange("businessId", value);
  };

  return (
    <>
      <div className="flex bg-[#e1effc] justify-between p-4 rounded-[2px] items-center border-b border-[#e1ecfe]">
        <div className="font-semibold text-md flex gap-2 items-center">
          <IdCard className="w-5 h-5 text-[#2563eb]" />
          Contacts
        </div>
        <div>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="border-[#2563eb] text-[#2563eb] text-xs px-3 rounded-[2px] py-1 border hover:bg-[#2563eb] hover:text-white transition"
          >
            New
          </button>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : salesContacts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No contacts found
          </div>
        ) : (
          salesContacts.map((contact: any) => (
            <div key={contact.id} className="mb-4 pb-4 border-b last:border-0">
              <div className="font-semibold text-sm">
                {contact.first_name} {contact.last_name}
              </div>
              <div className="mt-2 space-y-1">
                {contact.email && (
                  <div className="flex gap-4">
                    <h5 className="text-xs w-28 font-semibold text-muted-foreground">
                      Email
                    </h5>
                    <p className="text-xs">{contact.email}</p>
                  </div>
                )}
                {contact.phone_number && (
                  <div className="flex gap-4">
                    <h5 className="text-xs w-28 font-semibold text-muted-foreground">
                      Phone Number
                    </h5>
                    <p className="text-xs">{contact.phone_number}</p>
                  </div>
                )}
                {contact.location && (
                  <div className="flex gap-4">
                    <h5 className="text-xs w-28 font-semibold text-muted-foreground">
                      Location
                    </h5>
                    <p className="text-xs">{contact.location}</p>
                  </div>
                )}
                {contact.alternative_phone_number && (
                  <div className="flex gap-4">
                    <h5 className="text-xs w-28 font-semibold text-muted-foreground">
                      Alternative Number
                    </h5>
                    <p className="text-xs">
                      {contact.alternative_phone_number}
                    </p>
                  </div>
                )}
                {contact.alternative_email && (
                  <div className="flex gap-4">
                    <h5 className="text-xs w-28 font-semibold text-muted-foreground">
                      Alternative Email Id
                    </h5>
                    <p className="text-xs">{contact.alternative_email}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Contact Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SalesContactFormFields
              data={formData}
              errors={errors}
              onChange={handleFormChange}
              onPlatformSelectChange={handlePlatformSelectChange}
              platformOptions={platforms}
              platformsLoading={false}
              businessOptions={businesses.map((b) => ({
                id: b.id,
                business_name: b.business_name,
              }))}
              businessesLoading={false}
              onBusinessSelectChange={handleBusinessSelectChange}
              onAddBusinessClick={() => {
                toast.info("Please create business first");
              }}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetFormState();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateContact}
                disabled={createSalesContactMutation.isPending}
              >
                {createSalesContactMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Contact"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddPlatformDialog
        open={addPlatformDialog.open}
        onOpenChange={(open) => {
          setAddPlatformDialog((prev) => ({ ...prev, open }));
        }}
        platformName={addPlatformDialog.platformName}
        onPlatformNameChange={handleAddPlatformDialogPlatformNameChange}
        error={addPlatformDialog.error}
        isLoading={isAddingPlatform}
        onAdd={handleAddPlatformDialogAddPlatform}
      />
    </>
  );
}
