"use client";

import { SidebarPanel } from "@/components/common/sidebar-panel";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { SalesLeadFormFields } from "./sales-lead-form-fields";
import type { FormData } from "@/lib/constants/sales-leads";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import type { ContactPlatform } from "@/lib/data/contact-platforms";

export interface AddLeadSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  errors: Record<keyof FormData, string>;
  onFormChange: <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => void;
  onPlatformSelectChange: (value: string) => void;
  onPrioritySelectChange: (value: string) => void;
  onContactSelectChange: (value: string) => void;
  platformOptions: ContactPlatform[];
  priorityOptions: LeadPriority[];
  contactOptions: any[];
  platformsLoading: boolean;
  onSave: () => void;
  isSaving: boolean;
  businessOptions?: Array<{ id: string; business_name: string | null }>;
  businessesLoading?: boolean;
  onBusinessSelectChange?: (value: string) => void;
  onAddBusinessClick?: () => void;
}

export function AddLeadSidebar({
  open,
  onOpenChange,
  formData,
  errors,
  onFormChange,
  onPlatformSelectChange,
  onPrioritySelectChange,
  onContactSelectChange,
  platformOptions,
  priorityOptions,
  contactOptions,
  platformsLoading,
  onSave,
  isSaving,
  businessOptions = [],
  businessesLoading = false,
  onBusinessSelectChange,
  onAddBusinessClick,
}: AddLeadSidebarProps) {
  return (
    <SidebarPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Add Lead"
      description="Add a new lead to your workspace"
    >
      <div className="space-y-6">
        <CardContent className="p-1">
          <SalesLeadFormFields
            data={formData}
            errors={errors}
            onChange={onFormChange}
            onPlatformSelectChange={onPlatformSelectChange}
            onPrioritySelectChange={onPrioritySelectChange}
            onContactSelectChange={onContactSelectChange}
            platformOptions={platformOptions}
            priorityOptions={priorityOptions}
            contactOptions={contactOptions}
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
              onClick={onSave}
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
