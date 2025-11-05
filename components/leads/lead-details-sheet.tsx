"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface LeadDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    leadId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    businessName?: string;
    companyWebsite?: string;
    linkedinProfile?: string;
    statusId?: string;
    sourceId?: string;
    scoreGradeId?: string;
    leadScore?: number;
    qualificationNotes?: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: any; // Allow additional fields
  } | null;
  configs?: {
    status?: Array<{ id: string; entityValue?: string; value?: string }>;
    source?: Array<{ id: string; entityValue?: string; value?: string }>;
    score_grade?: Array<{ id: string; entityValue?: string; value?: string }>;
    [key: string]: any;
  };
  title?: string;
  description?: string;
}

export function LeadDetailsSheet({
  open,
  onOpenChange,
  lead,
  configs = {},
  title = "Lead Details",
  description = "View detailed information about the selected lead",
}: LeadDetailsSheetProps) {
  const statuses = configs?.status || [];
  const sources = configs?.source || [];
  const grades = configs?.score_grade || [];

  const getConfigValue = (
    configId: string | undefined,
    configArray: Array<{ id: string; entityValue?: string; value?: string }>
  ): string => {
    if (!configId) return "Not provided";
    const config = configArray.find((c) => c.id === configId);
    return config?.entityValue || config?.value || "Unknown";
  };

  if (!lead) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="text-[12px] !mt-[0px]">
              {description}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3">
            <p className="text-muted-foreground">No lead selected</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="text-[12px] !mt-[0px]">
            {description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-6">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-base mb-1">Basic Information</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium text-xs">
                    {lead.firstName} {lead.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-xs">
                    {lead.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium text-xs">
                    {lead.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job Title</p>
                  <p className="font-medium text-xs">
                    {lead.jobTitle || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-base mb-1">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="font-medium text-xs">
                    {lead.businessName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="font-medium text-xs">
                    {lead.companyWebsite || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">LinkedIn</p>
                  <p className="font-medium text-xs">
                    {lead.linkedinProfile || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Lead Information */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-base mb-1">Lead Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium text-xs">
                    {getConfigValue(lead.statusId, statuses)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium text-xs">
                    {getConfigValue(lead.sourceId, sources)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <p className="font-medium text-xs">
                    {getConfigValue(lead.scoreGradeId, grades)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="font-medium text-xs">
                    {lead.leadScore || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {lead.qualificationNotes && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium text-base mb-1">Notes</h3>
                <p className="text-xs text-muted-foreground">
                  {lead.qualificationNotes}
                </p>
              </div>
            )}

            {/* Dates */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-base mb-1">Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium text-xs">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="font-medium text-xs">
                    {new Date(lead.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

