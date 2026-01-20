"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Flag,
  Upload,
} from "lucide-react";
import { AssigneeInlineEditor } from "@/components/assignees";
import { OwnerInlineEditor } from "@/components/owner";
import { ContactAvatar } from "@/components/contact";
import {
  STATUS_OPTIONS,
  NO_SELECTION_VALUE,
} from "@/lib/constants/sales-leads";
import { ADD_PLATFORM_SELECT_VALUE } from "@/lib/utils/sales-lead-utils";
import {
  resolvePriorityColor,
  formatDateTimeWithTime,
} from "@/lib/utils/sales-lead-utils";
import type { FormData } from "@/lib/constants/sales-leads";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import type { ContactPlatform } from "@/lib/data/contact-platforms";
import { useState } from "react";
import { LeadTabsSection, type TabValue } from "./lead-tabs-section";

export interface LeadDetailsSectionProps {
  previewLead: any;
  isLoadingPreview: boolean;
  editFormData: FormData;
  statusLabel: string;
  statusClassName: string;
  priorityOptions: LeadPriority[];
  platformOptions: ContactPlatform[];
  platformsLoading: boolean;
  onEditFormChange: <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => void;
  onEditPlatformSelectChange: (value: string) => void;
  onEditPrioritySelectChange: (value: string) => void;
  onAddPlatformClick: () => void;
  onNoteDialogOpen: () => void;
  onMediaDialogOpen: () => void;
  upcomingMeetings: any[];
  meetingsLoading: boolean;
  onMeetingCreate: () => void;
  onMeetingClick: (meetingId: string) => void;
  onMeetingEdit: (meetingId: string) => void;
  onMeetingDelete: (meetingId: string, meetingTitle: string) => void;
  onCancel: () => void;
  onUpdate: () => void;
  isUpdating: boolean;
}

export function LeadDetailsSection({
  previewLead,
  isLoadingPreview,
  editFormData,
  statusLabel,
  statusClassName,
  priorityOptions,
  platformOptions,
  platformsLoading,
  onEditFormChange,
  onEditPlatformSelectChange,
  onEditPrioritySelectChange,
  onAddPlatformClick,
  onNoteDialogOpen,
  onMediaDialogOpen,
  upcomingMeetings,
  meetingsLoading,
  onMeetingCreate,
  onMeetingClick,
  onMeetingEdit,
  onMeetingDelete,
  onCancel,
  onUpdate,
  isUpdating,
}: LeadDetailsSectionProps) {
  const [tabSelected, setTabSelected] = useState<TabValue>("notes");

  const handleTabSelect = (tab: TabValue) => {
    setTabSelected(tab);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-10  h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32">Status</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                className="outline-none focus:outline-none focus:ring-0 focus:ring-offset-0"
              >
                <button
                  className={`inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-medium transition-colors ${statusClassName}`}
                >
                  {statusLabel || "Select status"}
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(previewLead?.status === "opportunities"
                  ? STATUS_OPTIONS.filter(
                      (opt) => opt.value === "won" || opt.value === "lost",
                    )
                  : STATUS_OPTIONS.filter(
                      (opt) =>
                        !["qualified_lead", "won", "lost"].includes(opt.value),
                    )
                ).map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onEditFormChange("status", option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32">Priority</span>
            <Select
              value={editFormData.priorityId}
              onValueChange={onEditPrioritySelectChange}
              disabled={priorityOptions.length === 0}
            >
              <SelectTrigger className="outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 px-2 border-none shadow-none bg-[#f1f5f980] hover:bg-muted/50 transition-colors group w-52 justify-between">
                {editFormData.priorityId &&
                editFormData.priorityId !== NO_SELECTION_VALUE ? (
                  (() => {
                    const selectedPriority = priorityOptions.find(
                      (p) => p.id === editFormData.priorityId,
                    );
                    if (selectedPriority) {
                      const priorityColor = resolvePriorityColor(
                        selectedPriority.name,
                        selectedPriority.color,
                      );
                      return (
                        <div className="flex items-center gap-2 w-full">
                          <Flag
                            className="h-3 w-3"
                            style={{ color: priorityColor }}
                          />
                          <span>{selectedPriority.name}</span>
                        </div>
                      );
                    }
                    return (
                      <SelectValue
                        placeholder={
                          priorityOptions.length === 0
                            ? "No priorities"
                            : "Select priority"
                        }
                      />
                    );
                  })()
                ) : (
                  <SelectValue
                    placeholder={
                      priorityOptions.length === 0
                        ? "No priorities"
                        : "Select priority"
                    }
                  />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION_VALUE}>No priority</SelectItem>
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority.id} value={priority.id}>
                    <div className="flex items-center gap-2">
                      <Flag
                        className="h-3 w-3"
                        style={{
                          color: resolvePriorityColor(
                            priority.name,
                            priority.color,
                          ),
                        }}
                      />
                      <span>{priority.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32">Platform</span>
            <Select
              value={editFormData.platformId}
              onValueChange={(value) => {
                if (value === ADD_PLATFORM_SELECT_VALUE) {
                  onAddPlatformClick();
                  return;
                }
                onEditPlatformSelectChange(value);
              }}
              disabled={platformsLoading}
            >
              <SelectTrigger className="outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 px-2 border-none shadow-none bg-[#f1f5f980] hover:bg-muted/50 transition-colors group w-52 justify-between">
                <SelectValue
                  placeholder={
                    platformsLoading
                      ? "Loading platforms..."
                      : platformOptions.length === 0
                        ? "No saved platforms"
                        : "Select a platform"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION_VALUE}>No platform</SelectItem>
                {platformOptions.map((platform) => (
                  <SelectItem
                    key={platform.id ?? `platform-${platform.name}`}
                    value={
                      platform.id !== null && platform.id !== undefined
                        ? String(platform.id)
                        : platform.name
                    }
                  >
                    {platform.name}
                  </SelectItem>
                ))}
                <div className="my-1 border-t border-muted-foreground/20" />
                <SelectItem
                  value={ADD_PLATFORM_SELECT_VALUE}
                  className="text-sm text-muted-foreground"
                >
                  + Add platform
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32 flex items-center gap-2">
              Owner
            </span>
            <div className="flex items-center gap-2">
              {isLoadingPreview ? (
                <Skeleton className="h-8 w-48" />
              ) : previewLead?.id ? (
                <OwnerInlineEditor
                  leadId={previewLead.id}
                  owner={previewLead.owner}
                  size="md"
                  showLabel={true}
                />
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32 flex items-center gap-2">
              Assignees
            </span>
            <div className="flex items-center gap-2">
              {isLoadingPreview ? (
                <Skeleton className="h-8 w-32" />
              ) : previewLead?.id ? (
                <AssigneeInlineEditor
                  leadId={previewLead.id}
                  size="md"
                  maxVisible={3}
                />
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32 flex items-center gap-2">
              Linked Contact
            </span>
            <div className="flex items-center gap-2">
              {isLoadingPreview ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <ContactAvatar
                  contact={previewLead?.contact}
                  size="md"
                  showLabel={true}
                  showEmail={true}
                  showPhone={false}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32">Created</span>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={14} />
              <span>
                {previewLead.created_at
                  ? formatDateTimeWithTime(previewLead.created_at)
                  : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-32">Updated</span>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              <span>
                {previewLead.updated_at
                  ? formatDateTimeWithTime(previewLead.updated_at)
                  : "—"}
              </span>
            </div>
          </div>

          {/* <div className="flex items-center gap-2 mt-8">
            <div
              className="bg-blue-500 text-white px-4 w-fit flex gap-1 py-2 rounded-md cursor-pointer flex items-center text-sm font-regular text-gray-900"
              onClick={onNoteDialogOpen}
            >
              <Plus className="!h-3 !w-3" />
              Create Notes
            </div>
            <button
              className="bg-[#f9fafb] text-[#111827] border-[#e5e7eb] border px-4 w-fit flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              onClick={onMediaDialogOpen}
            >
              <Plus className="h-4 w-4" />
              Upload File
            </button>
          </div> */}
        </div>

        {/* Tabs Section */}
        <LeadTabsSection
          activeTab={tabSelected}
          onTabChange={handleTabSelect}
          onNoteDialogOpen={onNoteDialogOpen}
          previewLead={previewLead}
        />

        {/* Upcoming Meetings List */}

        {/* <hr /> */}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between absolute bottom-0 left-0 right-0 w-full m-auto bg-[#f8fafc] px-10 py-2">
          <div className="text-xs text-muted-foreground">
            {previewLead.updated_at
              ? `Last updated ${formatDateTimeWithTime(previewLead.updated_at)}`
              : ""}
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
              onClick={onUpdate}
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
                  Update Lead
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
