"use client";

import { SidebarPanel } from "@/components/common/sidebar-panel";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2, MoveRight } from "lucide-react";
import { SalesContactFormFields } from "./sales-contact-form-fields";
import type { FormData } from "@/lib/constants/sales-contacts";
import type { ContactPlatform } from "@/lib/data/contact-platforms";

export interface EditContactSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewContact: any | null;
  formData: FormData;
  errors: Record<keyof FormData, string>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onPlatformSelectChange: (value: string) => void;
  platformOptions: ContactPlatform[];
  platformsLoading: boolean;
  isUpdating: boolean;
  onUpdate: () => Promise<void>;
  onMoveToLead: (contact: any) => Promise<void>;
  movingToLeadContactId: string | null;
  businessOptions?: Array<{ id: string; business_name: string | null }>;
  businessesLoading?: boolean;
  onBusinessSelectChange?: (value: string) => void;
  onAddBusinessClick?: () => void;
}

export function EditContactSidebar({
  open,
  onOpenChange,
  previewContact,
  formData,
  errors,
  onChange,
  onPlatformSelectChange,
  platformOptions,
  platformsLoading,
  isUpdating,
  onUpdate,
  onMoveToLead,
  movingToLeadContactId,
  businessOptions = [],
  businessesLoading = false,
  onBusinessSelectChange,
  onAddBusinessClick,
}: EditContactSidebarProps) {
  return (
    <SidebarPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Contact Details"
      description={
        previewContact
          ? `${previewContact.first_name || ""} ${
              previewContact.last_name || ""
            }`.trim()
          : "Select a sales contact to view details"
      }
    >
      {previewContact ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">
              {`${previewContact.first_name || ""} ${
                previewContact.last_name || ""
              }`.trim() || "Unnamed Contact"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {previewContact.email || "No email provided"}
            </p>
          </div>

          <SalesContactFormFields
            data={formData}
            errors={errors}
            onChange={onChange}
            onPlatformSelectChange={onPlatformSelectChange}
            platformOptions={platformOptions}
            platformsLoading={platformsLoading}
            businessOptions={businessOptions}
            businessesLoading={businessesLoading}
            onBusinessSelectChange={onBusinessSelectChange}
            onAddBusinessClick={onAddBusinessClick}
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            </div>

            <div>
              <Button
                variant="outline"
                className="min-w-[150px]"
                onClick={() => {
                  void onMoveToLead(previewContact);
                }}
                disabled={
                  movingToLeadContactId !== null ||
                  previewContact.status === "moved_to_lead"
                }
              >
                {movingToLeadContactId === String(previewContact.id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <MoveRight className="h-4 w-4 mr-2" />
                    Move to Lead
                  </>
                )}
              </Button>{" "}
              &nbsp;
              <Button
                className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
                onClick={() => {
                  void onUpdate();
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Contact
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          Select a sales contact to view details.
        </div>
      )}
    </SidebarPanel>
  );
}

export interface AddContactSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  errors: Record<keyof FormData, string>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onPlatformSelectChange: (value: string) => void;
  platformOptions: ContactPlatform[];
  platformsLoading: boolean;
  isSaving: boolean;
  onSave: (saveAndExit: boolean) => Promise<void>;
  businessOptions?: Array<{ id: string; business_name: string | null }>;
  businessesLoading?: boolean;
  onBusinessSelectChange?: (value: string) => void;
  onAddBusinessClick?: () => void;
}

export function AddContactSidebar({
  open,
  onOpenChange,
  formData,
  errors,
  onChange,
  onPlatformSelectChange,
  platformOptions,
  platformsLoading,
  isSaving,
  onSave,
  businessOptions = [],
  businessesLoading = false,
  onBusinessSelectChange,
  onAddBusinessClick,
}: AddContactSidebarProps) {
  return (
    <SidebarPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Add Sales Contact"
      description={"Add a new sales contact to your workspace"}
    >
      <div className="space-y-6">
        <CardContent className="p-1">
          <SalesContactFormFields
            data={formData}
            errors={errors}
            onChange={onChange}
            onPlatformSelectChange={onPlatformSelectChange}
            platformOptions={platformOptions}
            platformsLoading={platformsLoading}
            businessOptions={businessOptions}
            businessesLoading={businessesLoading}
            onBusinessSelectChange={onBusinessSelectChange}
            onAddBusinessClick={onAddBusinessClick}
          />
        </CardContent>

        <div className="flex items-end justify-end mt-4">
          <div className="flex items-center gap-3">
            <Button
              className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
              onClick={() => {
                void onSave(true);
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Exit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SidebarPanel>
  );
}
