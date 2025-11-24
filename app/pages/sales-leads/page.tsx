"use client";

import { useCallback, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReactTable } from "@/components/reuseableComponent/ReactTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  useWorkspacePermissions,
  useWorkspaceRoutePermission,
} from "@/hooks/use-workspace-permissions";
import {
  useCreateSalesLead,
  useDeleteSalesLead,
  useSalesLeads,
  useUpdateSalesLead,
} from "@/hooks/use-sales-leads";
import {
  useContactPlatforms,
  useCreateContactPlatform,
} from "@/hooks/use-contact-platforms";
import {
  useLeadPriorities,
  useCreateLeadPriority,
  useUpdateLeadPriority,
  useDeleteLeadPriority,
} from "@/hooks/use-lead-priorities";
import { useSalesContacts } from "@/hooks/use-sales-contact";
import {
  useCreateLeadComment,
  useDeleteLeadComment,
  useUpdateLeadComment,
  useLeadComments,
} from "@/hooks/use-lead-comments";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import { SidebarPanel } from "@/components/common/sidebar-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Mail,
  AlertCircle,
  Phone,
  MapPin,
  Globe,
  Loader2,
  Save,
  Flag,
  Paperclip,
  Smile,
  AtSign,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SalesLeadInsert } from "@/lib/data/sales-leads";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/stores/auth-store";

import {
  X,
  ChevronDown,
  Clock,
  Calendar,
  Send,
  Users,
  UserCog,
  Contact2,
  ChevronRight,
} from "lucide-react";
import { AssigneeInlineEditor } from "@/components/assignees";
import { OwnerInlineEditor } from "@/components/owner";
import { ContactAvatar } from "@/components/contact";
import { CommentCard, CommentInput } from "@/components/comments";
import { NoteDialog } from "@/components/notes/note-dialog";
import { MeetingDialog } from "@/components/meetings/meeting-dialog";
import { MeetingDetailsDialog } from "@/components/meetings/meeting-details-dialog";
import { LeadMediaDialog } from "@/components/lead-media/lead-media-dialog";
import { useMeetings, useDeleteMeeting } from "@/hooks/use-meetings";
// import { X, Calendar, Clock, Tag, Users, Link2, ChevronDown, MessageSquare, Send, Paperclip, Smile, AtSign, Hash, MoreHorizontal } from 'lucide-react';

const ADD_PLATFORM_SELECT_VALUE = "__add_new_platform__";
const NO_SELECTION_VALUE = "__none__";

type StatusOptionValue = NonNullable<SalesLeadInsert["status"]>;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  contactTimeZone: string;
  platformId: string;
  platformCustom: string;
  status: StatusOptionValue;
  priorityId: string;
  contactId: string;
  ownerId: string;
}

const INITIAL_FORM_STATE: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  contactTimeZone: "",
  platformId: NO_SELECTION_VALUE,
  platformCustom: "",
  status: "pipeline",
  priorityId: NO_SELECTION_VALUE,
  contactId: NO_SELECTION_VALUE,
  ownerId: NO_SELECTION_VALUE,
};

const INITIAL_FORM_ERRORS: Record<keyof FormData, string> = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  contactTimeZone: "",
  platformId: "",
  platformCustom: "",
  status: "",
  priorityId: "",
  contactId: "",
  ownerId: "",
};

const STATUS_OPTIONS: Array<{ value: StatusOptionValue; label: string }> = [
  { value: "pipeline", label: "Pipeline" },
  { value: "in_progress", label: "In Progress" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STATUS_STYLE_MAP: Record<StatusOptionValue, string> = {
  pipeline: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
};

const KNOWN_PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444", // red
  high: "#f59e0b", // amber / yellow
  normal: "#3b82f6", // blue
  medium: "#3b82f6",
  low: "#6b7280", // gray
};

const PRIORITY_COLOR_ARRAY = [
  "#ef4444", // Red - Urgent
  "#f59e0b", // Amber - High
  "#3b82f6", // Blue - Normal/Medium
  "#6b7280", // Gray - Low
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

function resolvePriorityColor(name?: string | null, fallback?: string | null) {
  // Check if fallback is a valid color (not null, undefined, or empty string)
  if (fallback && fallback.trim() !== "") {
    return fallback;
  }
  if (!name) return "#2563eb";
  const key = name.toLowerCase();
  return KNOWN_PRIORITY_COLORS[key] ?? "#2563eb";
}

function formatStatus(status?: string | null) {
  if (!status) return "";
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTimeWithTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizePhoneNumber(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const INT32_MAX = 2_147_483_647;
  const INT32_MIN = -2_147_483_648;
  if (parsed > INT32_MAX || parsed < INT32_MIN) {
    return null;
  }
  return parsed;
}

function formatPhoneNumber(value?: number | null): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function hexToRgba(hex: string, alpha: number): string | undefined {
  if (!hex) return undefined;
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return undefined;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return undefined;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildContactLabel(contact: any) {
  if (!contact) return "";
  const parts = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (parts) return parts;
  return contact.email || `Contact ${contact.id}`;
}

type SalesLeadRow = ReturnType<typeof mapLeadToTableRow>;

function mapLeadToTableRow(
  lead: any,
  options: {
    priorityMap: Map<string, LeadPriority>;
    platformMap: Map<number, string>;
    contactNameMap: Map<string, string>;
    contactPhoneMap: Map<string, string>;
  }
) {
  const priority = lead.priority
    ? options.priorityMap.get(lead.priority)
    : undefined;
  const platformLabel =
    lead.platform !== undefined && lead.platform !== null
      ? options.platformMap.get(lead.platform) ?? `ID ${lead.platform}`
      : "";
  const contactLabel = lead.contact_id
    ? options.contactNameMap.get(lead.contact_id) ?? ""
    : "";
  const contactPhone =
    lead.contact_id && options.contactPhoneMap.has(lead.contact_id)
      ? options.contactPhoneMap.get(lead.contact_id)
      : undefined;
  const phoneDisplay =
    lead.phone_number !== undefined &&
    lead.phone_number !== null &&
    lead.phone_number !== ""
      ? formatPhoneNumber(lead.phone_number)
      : contactPhone ?? "";

  return {
    ...lead,
    priority_label: priority?.name ?? "",
    priority_color:
      priority?.color && priority.color.trim() !== "" ? priority.color : null,
    platform_label: platformLabel,
    status_label: formatStatus(lead.status),
    contact_label: contactLabel,
    phone_display: phoneDisplay,
    created_at_label: formatDateTime(lead.created_at),
    updated_at_label: formatDateTime(lead.updated_at),
  };
}

const SalesLeadFormFields = ({
  data,
  errors: formErrors,
  onChange,
  onPlatformSelectChange,
  onPrioritySelectChange,
  onContactSelectChange,
  platformOptions,
  priorityOptions,
  contactOptions,
  platformsLoading,
}: {
  data: FormData;
  errors: Record<keyof FormData, string>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onPlatformSelectChange: (value: string) => void;
  onPrioritySelectChange: (value: string) => void;
  onContactSelectChange: (value: string) => void;
  platformOptions: Array<{ id: number | null; name: string }>;
  priorityOptions: LeadPriority[];
  contactOptions: any[];
  platformsLoading: boolean;
}) => {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        {/* <h3 className="text-base font-medium text-muted-foreground">Basic Details</h3> */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="firstName"
                  value={data.firstName}
                  onChange={(event) =>
                    onChange("firstName", event.target.value)
                  }
                  placeholder="John"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.firstName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="lastName"
                  value={data.lastName}
                  onChange={(event) => onChange("lastName", event.target.value)}
                  placeholder="Doe"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.lastName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  placeholder="john.doe@example.com"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.email
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={data.phoneNumber}
                  onChange={(event) => {
                    const value = event.target.value;
                    // Only allow digits
                    const digitsOnly = value.replace(/\D/g, "");
                    // Limit to 10 digits
                    const limitedDigits = digitsOnly.slice(0, 10);
                    onChange("phoneNumber", limitedDigits);
                  }}
                  placeholder="1234567890"
                  maxLength={10}
                  className={`pl-10 bg-gray-100 ${
                    formErrors.phoneNumber
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.phoneNumber && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={data.status}
                onValueChange={(value) =>
                  onChange("status", value as FormData["status"])
                }
              >
                <SelectTrigger className="bg-gray-100">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={data.priorityId}
                onValueChange={onPrioritySelectChange}
                disabled={priorityOptions.length === 0}
              >
                <SelectTrigger className="bg-gray-100">
                  {data.priorityId && data.priorityId !== NO_SELECTION_VALUE ? (
                    (() => {
                      const selectedPriority = priorityOptions.find(
                        (p) => p.id === data.priorityId
                      );
                      if (selectedPriority) {
                        const priorityColor = resolvePriorityColor(
                          selectedPriority.name,
                          selectedPriority.color
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
                  <SelectItem value={NO_SELECTION_VALUE}>
                    No priority
                  </SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                      <div className="flex items-center gap-2">
                        <Flag
                          className="h-3 w-3"
                          style={{
                            color: resolvePriorityColor(
                              priority.name,
                              priority.color
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
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-medium text-muted-foreground">
          Additional Information
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="contact">Linked Contact</Label>
              <Select
                value={data.contactId}
                onValueChange={onContactSelectChange}
                disabled={contactOptions.length === 0}
              >
                <SelectTrigger className="bg-gray-100">
                  <SelectValue
                    placeholder={
                      contactOptions.length === 0
                        ? "No contacts available"
                        : "Select a contact"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION_VALUE}>
                    No linked contact
                  </SelectItem>
                  {contactOptions.map((contact: any) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {buildContactLabel(contact)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformId">Lead Platform</Label>
              <Select
                value={data.platformId}
                onValueChange={onPlatformSelectChange}
                disabled={platformsLoading}
              >
                <SelectTrigger className="bg-gray-100">
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
                  <SelectItem value={NO_SELECTION_VALUE}>
                    No platform
                  </SelectItem>
                  {platformOptions.length > 0 ? (
                    platformOptions.map((platform) => (
                      <SelectItem
                        key={platform.id ?? `platform-${platform.name}`}
                        value={
                          platform.id !== null
                            ? String(platform.id)
                            : platform.name
                        }
                      >
                        {platform.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-platforms" disabled>
                      No saved platforms
                    </SelectItem>
                  )}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="location"
                  value={data.location}
                  onChange={(event) => {
                    const value = event.target.value;
                    // Only allow alphabets, spaces, commas, and hyphens
                    const locationRegex = /^[a-zA-Z\s,\-]*$/;
                    if (locationRegex.test(value) || value === "") {
                      onChange("location", value);
                    }
                  }}
                  placeholder="New York, USA"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.location
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.location && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.location}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactTimeZone">Contact Time Zone</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="contactTimeZone"
                  value={data.contactTimeZone}
                  onChange={(event) =>
                    onChange("contactTimeZone", event.target.value)
                  }
                  placeholder="America/New_York"
                  className="pl-10 bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SalesLeadsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const { user, token } = useAuthStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filters = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      page,
      limit: pageSize,
      workspaceId,
    };
  }, [workspaceId, page, pageSize]);

  const contactLookupFilters = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      page: 1,
      limit: 100,
      workspaceId,
    };
  }, [workspaceId]);

  const {
    data: salesLeads,
    isLoading,
    isError,
    error,
  } = useSalesLeads(filters);

  // Get workspace permissions
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
  const isSalesLeadsVisible = useWorkspaceRoutePermission(
    "Sales Leads",
    "visible"
  );

  const { data: priorityList } = useLeadPriorities();
  const { data: platformList, isLoading: platformsLoading } =
    useContactPlatforms();
  const contactLookup = useSalesContacts(contactLookupFilters);
  const createLeadCommentMutation = useCreateLeadComment();
  const updateLeadCommentMutation = useUpdateLeadComment();
  const deleteLeadCommentMutation = useDeleteLeadComment();
  const createLeadPriorityMutation = useCreateLeadPriority();
  const updateLeadPriorityMutation = useUpdateLeadPriority();
  const deleteLeadPriorityMutation = useDeleteLeadPriority();
  const prioritySaving =
    createLeadPriorityMutation.isPending ||
    updateLeadPriorityMutation.isPending;
  const priorityDeleting = deleteLeadPriorityMutation.isPending;

  const createSalesLeadMutation = useCreateSalesLead();
  const createContactPlatformMutation = useCreateContactPlatform();
  const updateSalesLeadMutation = useUpdateSalesLead();
  const deleteSalesLeadMutation = useDeleteSalesLead();

  const platformOptions = useMemo(() => platformList ?? [], [platformList]);
  const priorityOptions = useMemo(() => priorityList ?? [], [priorityList]);
  const priorityMap = useMemo(() => {
    const map = new Map<string, LeadPriority>();
    (priorityList ?? []).forEach((priority) => {
      map.set(priority.id, priority);
    });
    return map;
  }, [priorityList]);
  const priorityColorsByKey = useMemo(() => {
    const lookup: Record<string, string> = {};
    priorityOptions.forEach((priority) => {
      const fallback =
        priority.color ??
        KNOWN_PRIORITY_COLORS[priority.name?.toLowerCase() ?? ""] ??
        "#2563eb";
      if (priority.id) {
        lookup[priority.id] = fallback;
      }
      if (priority.name) {
        lookup[priority.name.toLowerCase()] = fallback;
      }
    });
    return lookup;
  }, [priorityOptions]);
  const getPriorityColor = useCallback(
    (key?: string | null) => {
      if (!key) return "#2563eb";
      return (
        priorityColorsByKey[key] ??
        priorityColorsByKey[key.toLowerCase?.() ?? key] ??
        "#2563eb"
      );
    },
    [priorityColorsByKey]
  );

  const platformMap = useMemo(() => {
    const map = new Map<number, string>();
    platformOptions.forEach((platform) => {
      if (platform.id !== undefined && platform.id !== null) {
        map.set(platform.id, platform.name);
      }
    });
    return map;
  }, [platformOptions]);

  const contactOptions = useMemo(
    () => contactLookup.data?.data ?? [],
    [contactLookup.data?.data]
  );
  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    contactOptions.forEach((contact: any) => {
      if (contact.id) {
        map.set(contact.id, buildContactLabel(contact));
      }
    });
    return map;
  }, [contactOptions]);
  const contactPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    contactOptions.forEach((contact: any) => {
      if (contact.id && contact.phone_number) {
        map.set(contact.id, String(contact.phone_number));
      }
    });
    return map;
  }, [contactOptions]);

  const tableData = useMemo(() => {
    const leads = salesLeads?.data ?? [];
    return leads.map((lead) =>
      mapLeadToTableRow(lead, {
        priorityMap,
        platformMap,
        contactNameMap,
        contactPhoneMap,
      })
    );
  }, [
    salesLeads?.data,
    priorityMap,
    platformMap,
    contactNameMap,
    contactPhoneMap,
  ]);

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

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    salesLeadId?: string;
    salesLeadName?: string;
  }>({ open: false });
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [addSalesLeadSidebarOpen, setAddSalesLeadSidebarOpen] = useState(false);
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
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM_STATE });
  const [errors, setErrors] = useState<Record<keyof FormData, string>>({
    ...INITIAL_FORM_ERRORS,
  });
  const [editFormData, setEditFormData] = useState<FormData>({
    ...INITIAL_FORM_STATE,
  });
  const [editErrors, setEditErrors] = useState<Record<keyof FormData, string>>({
    ...INITIAL_FORM_ERRORS,
  });
  const [previewLead, setPreviewLead] = useState<any | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
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
  const statusLabel = useMemo(
    () => formatStatus(editFormData.status),
    [editFormData.status]
  );
  const statusClassName = useMemo(
    () => STATUS_STYLE_MAP[editFormData.status] ?? "bg-gray-100 text-gray-700",
    [editFormData.status]
  );
  const [priorityFormState, setPriorityFormState] = useState<{
    id: string | null;
    name: string;
    color: string;
  }>({
    id: null,
    name: "",
    color: "#2563eb",
  });

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

  const resetPriorityFormState = useCallback(() => {
    setPriorityFormState({
      id: null,
      name: "",
      color: "#2563eb",
    });
  }, []);

  const handlePriorityFormSubmit = useCallback(async () => {
    const name = priorityFormState.name.trim();
    if (!name) {
      toast.error("Priority name is required.");
      return;
    }

    // Auto-assign color based on name if not set or default
    let colorToUse = priorityFormState.color;
    if (!colorToUse || colorToUse === "#2563eb" || colorToUse.trim() === "") {
      const nameLower = name.toLowerCase();
      colorToUse = KNOWN_PRIORITY_COLORS[nameLower] || PRIORITY_COLOR_ARRAY[0];
    }

    try {
      if (priorityFormState.id) {
        await updateLeadPriorityMutation.mutateAsync({
          id: priorityFormState.id,
          data: { name, color: colorToUse },
        });
        toast.success("Priority updated.");
      } else {
        await createLeadPriorityMutation.mutateAsync({
          name,
          color: colorToUse,
        });
        toast.success("Priority created.");
      }
      resetPriorityFormState();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save priority.");
    }
  }, [
    createLeadPriorityMutation,
    priorityFormState.color,
    priorityFormState.id,
    priorityFormState.name,
    resetPriorityFormState,
    updateLeadPriorityMutation,
  ]);

  const handleDeletePriority = useCallback(
    async (priorityId: string) => {
      try {
        await deleteLeadPriorityMutation.mutateAsync(priorityId);
        toast.success("Priority deleted.");
        if (priorityFormState.id === priorityId) {
          resetPriorityFormState();
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete priority.");
      }
    },
    [deleteLeadPriorityMutation, priorityFormState.id, resetPriorityFormState]
  );

  const handleSelectPriorityForEdit = useCallback(
    (priority: LeadPriority) => {
      setPriorityFormState({
        id: priority.id ?? null,
        name: priority.name ?? "",
        color: priority.color ?? "#2563eb",
      });
    },
    [setPriorityFormState]
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
        throw error; // Re-throw so CommentCard can handle it
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

  const { data: leadComments = [], isLoading: leadCommentsLoading } =
    useLeadComments(previewLead?.id);

  // Fetch upcoming meetings for the preview lead
  const { data: meetingsData, isLoading: meetingsLoading } = useMeetings({
    leadId: previewLead?.id ? String(previewLead.id) : undefined,
  });

  const deleteMeetingMutation = useDeleteMeeting();

  const upcomingMeetings = useMemo(() => {
    if (!meetingsData) return [];

    // Handle different possible response structures
    const meetings =
      meetingsData?.data?.meetings ||
      meetingsData?.meetings ||
      (Array.isArray(meetingsData?.data) ? meetingsData.data : []);

    // Debug logging in development
    if (process.env.NODE_ENV === "development" && previewLead?.id) {
      console.log("Meetings data structure:", {
        meetingsData,
        meetings,
        meetingsCount: Array.isArray(meetings) ? meetings.length : 0,
      });
    }

    if (!Array.isArray(meetings) || meetings.length === 0) return [];

    const now = new Date();
    const filtered = meetings
      .filter((meeting: any) => {
        if (!meeting?.time) return false;
        const meetingTime = new Date(meeting.time);
        return !isNaN(meetingTime.getTime()) && meetingTime >= now;
      })
      .sort((a: any, b: any) => {
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      })
      .slice(0, 3); // Show only next 3 upcoming meetings

    // Debug logging in development
    if (process.env.NODE_ENV === "development" && previewLead?.id) {
      console.log("Upcoming meetings:", {
        totalMeetings: meetings.length,
        upcomingCount: filtered.length,
        upcomingMeetings: filtered,
      });
    }

    return filtered;
  }, [meetingsData, previewLead?.id]);

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

  const isSaving =
    createSalesLeadMutation.isPending ||
    createContactPlatformMutation.isPending;
  const isAddingPlatform = createContactPlatformMutation.isPending;
  const isUpdating = updateSalesLeadMutation.isPending;

  const validateField = useCallback(
    (fieldName: keyof FormData, value: string) => {
      switch (fieldName) {
        case "firstName":
          return !value.trim() ? "First name is required" : "";
        case "lastName":
          return !value.trim() ? "Last name is required" : "";
        case "email":
          if (!value.trim()) {
            return "Email is required";
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value.trim())
            ? ""
            : "Please enter a valid email";
        case "phoneNumber":
          if (!value.trim()) {
            return "Phone number is required";
          }
          // Remove common phone number characters for validation
          const digits = value.replace(/\D/g, "");
          // Phone must have exactly 10 digits
          if (digits.length !== 10) {
            return "Phone number must be exactly 10 digits";
          }
          return "";
        case "location":
          // Location is optional, but if provided, should only contain alphabets, spaces, commas, and hyphens
          if (value && value.trim()) {
            const locationRegex = /^[a-zA-Z\s,\-]+$/;
            if (!locationRegex.test(value.trim())) {
              return "Location can only contain letters, spaces, commas, and hyphens";
            }
          }
          return "";
        default:
          return "";
      }
    },
    []
  );

  const buildValidationErrors = useCallback(
    (data: FormData) => {
      const newErrors: Record<keyof FormData, string> = {
        firstName: validateField("firstName", data.firstName),
        lastName: validateField("lastName", data.lastName),
        email: validateField("email", data.email),
        phoneNumber: validateField("phoneNumber", data.phoneNumber),
        location: validateField("location", data.location),
        contactTimeZone: "",
        platformId: "",
        platformCustom: "",
        status: "",
        priorityId: "",
        contactId: "",
        ownerId: "",
      };

      return newErrors;
    },
    [validateField]
  );

  const handleFormChange = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors]
  );

  const handleEditFormChange = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setEditFormData((prev) => ({ ...prev, [field]: value }));

      if (editErrors[field]) {
        setEditErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [editErrors]
  );

  const validateForm = useCallback(() => {
    const allErrors = buildValidationErrors(formData);
    const filteredErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([, value]) => value !== "")
    ) as Record<keyof FormData, string>;

    if (Object.keys(filteredErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...allErrors }));
      return false;
    }
    return true;
  }, [buildValidationErrors, formData]);

  const validateEditForm = useCallback(() => {
    const allErrors = buildValidationErrors(editFormData);
    const filteredErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([, value]) => value !== "")
    ) as Record<keyof FormData, string>;

    if (Object.keys(filteredErrors).length > 0) {
      setEditErrors((prev) => ({ ...prev, ...allErrors }));
      return false;
    }
    return true;
  }, [buildValidationErrors, editFormData]);

  const resetFormState = useCallback(() => {
    setFormData(() => ({ ...INITIAL_FORM_STATE }));
    setErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const resetEditFormState = useCallback(() => {
    setEditFormData(() => ({ ...INITIAL_FORM_STATE }));
    setEditErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const mapLeadToFormData = useCallback((lead: any): FormData => {
    if (!lead) {
      return { ...INITIAL_FORM_STATE };
    }

    return {
      firstName: lead.first_name ?? "",
      lastName: lead.last_name ?? "",
      email: lead.email ?? "",
      phoneNumber: formatPhoneNumber(lead.phone_number),
      location: lead.location ?? "",
      contactTimeZone: lead.contact_time_zone ?? "",
      platformId:
        lead.platform !== undefined && lead.platform !== null
          ? String(lead.platform)
          : NO_SELECTION_VALUE,
      platformCustom: "",
      status: (lead.status as StatusOptionValue) ?? "pipeline",
      priorityId: lead.priority ?? NO_SELECTION_VALUE,
      contactId: lead.contact_id ?? NO_SELECTION_VALUE,
      ownerId: lead.owner_id ?? NO_SELECTION_VALUE,
    };
  }, []);

  const handleAddSalesLeadSidebarOpenChange = useCallback(
    (open: boolean) => {
      setAddSalesLeadSidebarOpen(open);
      if (!open) {
        resetFormState();
      }
    },
    [resetFormState]
  );

  const handlePreviewDialogOpenChange = useCallback(
    (open: boolean) => {
      setPreviewDialogOpen(open);
      if (!open) {
        setPreviewLead(null);
        resetEditFormState();
        setNewCommentText("");
        resetPriorityFormState();
      }
    },
    [resetEditFormState, resetPriorityFormState]
  );

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

  const handleSubmit = useCallback(
    async (saveAndExit: boolean = true) => {
      if (!currentWorkspace?.id) {
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
        workspace_id: currentWorkspace.id,
        platform: platformId,
        priority:
          formData.priorityId !== NO_SELECTION_VALUE
            ? formData.priorityId
            : null,
        contact_id:
          formData.contactId !== NO_SELECTION_VALUE ? formData.contactId : null,
        owner_id:
          formData.ownerId !== NO_SELECTION_VALUE ? formData.ownerId : null,
      };

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
      currentWorkspace?.id,
      formData,
      platformOptions,
      resetFormState,
      validateForm,
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

    const payload = {
      first_name: editFormData.firstName.trim(),
      last_name: editFormData.lastName.trim() || null,
      email: editFormData.email.trim() || null,
      phone_number: normalizePhoneNumber(editFormData.phoneNumber),
      location: editFormData.location.trim() || null,
      contact_time_zone: editFormData.contactTimeZone.trim() || null,
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

    try {
      const updatedLead = await updateSalesLeadMutation.mutateAsync({
        id: String(leadId),
        data: payload,
      });
      toast.success("Sales lead updated successfully!");
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
  }, [
    createContactPlatformMutation,
    editFormData,
    mapLeadToFormData,
    platformOptions,
    previewLead?.id,
    priorityMap,
    platformMap,
    contactNameMap,
    updateSalesLeadMutation,
    validateEditForm,
  ]);

  const handleDeleteSalesLead = useCallback(
    (salesLeadId: string, salesLeadName: string) => {
      setDeleteDialog({
        open: true,
        salesLeadId,
        salesLeadName,
      });
    },
    []
  );

  const confirmDeleteSalesLead = useCallback(
    async (salesLeadId?: string) => {
      if (!salesLeadId) return;
      try {
        await deleteSalesLeadMutation.mutateAsync(salesLeadId);
        toast.success("Sales lead deleted successfully");
        if (previewLead?.id === salesLeadId) {
          handlePreviewDialogOpenChange(false);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete sales lead");
        throw err;
      }
    },
    [deleteSalesLeadMutation, handlePreviewDialogOpenChange, previewLead?.id]
  );

  const handlePreviewLead = useCallback(
    async (lead: any) => {
      // Open dialog immediately with basic data
      setPreviewLead(lead);
      setPreviewDialogOpen(true);
      setIsLoadingPreview(true);
      setNewCommentText("");
      resetPriorityFormState();
      setEditErrors({ ...INITIAL_FORM_ERRORS });

      // Fetch full lead data with relations from API
      try {
        const response = await fetch(`/api/sales-leads/${lead.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
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
        setIsLoadingPreview(false);
      }
    },
    [mapLeadToFormData, resetPriorityFormState, token]
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

  const columns = useMemo(
    () => [
      {
        id: "name",
        name: "Lead Name",
        selector: (row: SalesLeadRow) =>
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          "Unnamed Lead",
        sortable: true,
      },
      {
        id: "email",
        name: "Email",
        selector: (row: SalesLeadRow) => row.email || "",
        sortable: true,
      },
      {
        id: "phone_number",
        name: "Phone",
        selector: (row: SalesLeadRow) => row.phone_display || "",
        cell: (row: SalesLeadRow) =>
          row.phone_display ? (
            <span className="text-sm text-muted-foreground">
              {row.phone_display}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">—</span>
          ),
        sortable: true,
      },
      {
        id: "status",
        name: "Status",
        selector: (row: SalesLeadRow) => row.status_label || "",
        cell: (row: SalesLeadRow) => {
          const status = (row.status as StatusOptionValue) ?? "pipeline";
          const classes =
            STATUS_STYLE_MAP[status] ?? "bg-gray-100 text-gray-700";
          return row.status_label ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${classes}`}
            >
              {row.status_label}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">—</span>
          );
        },
        sortable: true,
      },
      {
        id: "priority",
        name: "Priority",
        selector: (row: SalesLeadRow) => row.priority_label || "",
        cell: (row: SalesLeadRow) => {
          if (!row.priority_label) {
            return <span className="text-sm text-muted-foreground/60">—</span>;
          }
          const badgeColor = resolvePriorityColor(
            row.priority_label,
            row.priority_color
          );
          const background = badgeColor
            ? hexToRgba(badgeColor, 0.15)
            : undefined;
          const style = background
            ? { backgroundColor: background, color: badgeColor }
            : undefined;
          const className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium gap-1.5 ${
            background ? "" : "bg-gray-100 text-gray-700"
          }`;
          return (
            <span className={className} style={style}>
              <Flag className="h-3.5 w-3.5" style={{ color: badgeColor }} />
              {row.priority_label}
            </span>
          );
        },
        sortable: true,
      },
      {
        id: "Location",
        name: "Location ",
        selector: (row: SalesLeadRow) => row.location || "",
        sortable: true,
      },
      {
        id: "updated_at",
        name: "Updated",
        selector: (row: SalesLeadRow) => row.updated_at_label || "",
        sortable: true,
      },
      {
        id: "actions",
        name: "Actions",
        cell: (row: SalesLeadRow) => {
          // Only show actions menu if user has any permissions
          const hasAnyPermission =
            canUpdateSalesLeads || canDeleteSalesLeads || canCreateSalesLeads;
          if (!hasAnyPermission) {
            return null;
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUpdateSalesLeads && (
                  <DropdownMenuItem
                    onClick={() => {
                      handlePreviewLead(row);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    View & Edit
                  </DropdownMenuItem>
                )}
                {canDeleteSalesLeads && (
                  <>
                    {(canUpdateSalesLeads || canCreateSalesLeads) && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        handleDeleteSalesLead(
                          row.id,
                          `${row.first_name || ""} ${
                            row.last_name || ""
                          }`.trim() || "this lead"
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
      },
    ],
    [
      handleDeleteSalesLead,
      handlePreviewLead,
      canUpdateSalesLeads,
      canDeleteSalesLeads,
      canCreateSalesLeads,
    ]
  );

  const totalRows = salesLeads?.count ?? 0;
  const currentPage = salesLeads?.page ?? page;

  const renderTable = () => {
    if (!workspaceId) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground">
          Select a workspace to view sales leads.
        </div>
      );
    }

    if (isLoading) {
      return <Skeleton className="h-[420px] w-full" />;
    }

    if (isError) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load sales leads. {message}
        </div>
      );
    }

    if (tableData.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No sales leads yet. Add your first lead to get started.
        </div>
      );
    }

    return (
      <ReactTable
        columns={columns}
        data={tableData}
        pagination
        paginationTotalRows={totalRows}
        paginationPerPage={pageSize}
        paginationDefaultPage={currentPage}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={handleRowsPerPageChange}
        onRowClicked={handlePreviewLead}
      />
    );
  };

  // Show loading state while permissions are being fetched
  if (isLoadingPermissions && !permissionsData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Sales Leads</h1>
            <p className="text-sm text-muted-foreground">
              Manage your sales pipeline
            </p>
          </div>
        </div>
        <div className="mt-6 border border-muted-foreground/30 overflow-hidden">
          <Skeleton className="h-[420px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Check if user has permission to view (only after permissions are loaded)
  if (permissionsData && !canViewSalesLeads && !isSalesLeadsVisible) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p>
            You don't have permission to view sales leads in this workspace.
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
          <h1 className="text-2xl font-medium tracking-tight">Sales Leads</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateSalesLeads && (
            <Button onClick={() => handleAddSalesLeadSidebarOpenChange(true)}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 border border-muted-foreground/30 overflow-hidden">
        {renderTable()}
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
        onConfirm={confirmDeleteSalesLead}
        isLoading={deleteSalesLeadMutation.isPending}
        title="Delete Sales Lead"
      />

      <Dialog
        open={previewDialogOpen}
        onOpenChange={handlePreviewDialogOpenChange}
      >
        <DialogContent className="max-w-7xl p-0">
          {previewLead ? (
            <div className="bg-white rounded-lg shadow-xl   min-w-7xl h-[80vh] overflow-hidden flex flex-col relative">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="">
                  <div>
                    <span className="text-sm text-gray-500">Lead Id : </span>
                    <span className="text-sm text-gray-400">
                      {previewLead.id ?? "—"}
                    </span>
                  </div>

                  <h1 className="text-2xl font-semibold text-gray-900 mb-0">
                    {previewLeadDisplayName}
                  </h1>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-10 relative h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10                                                                                                                                                                                                 ">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-32">
                          Status
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            className=" outline-none focus:outline-none
    focus:ring-0 focus:ring-offset-0"
                          >
                            <button
                              className={`inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-medium transition-colors ${statusClassName}`}
                            >
                              {statusLabel || "Select status"}
                              <ChevronDown size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {STATUS_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onClick={() =>
                                  handleEditFormChange("status", option.value)
                                }
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-32">
                          Priority
                        </span>
                        <Select
                          value={editFormData.priorityId}
                          onValueChange={handleEditPrioritySelectChange}
                          disabled={priorityOptions.length === 0}
                        >
                          <SelectTrigger
                            className=" outline-none focus:outline-none
    focus:ring-0 focus:ring-offset-0 px-2 border-none shadow-none bg-[#f1f5f980] hover:bg-muted/50 transition-colors group w-52 justify-between"
                          >
                            {editFormData.priorityId &&
                            editFormData.priorityId !== NO_SELECTION_VALUE ? (
                              (() => {
                                const selectedPriority = priorityOptions.find(
                                  (p) => p.id === editFormData.priorityId
                                );
                                if (selectedPriority) {
                                  const priorityColor = resolvePriorityColor(
                                    selectedPriority.name,
                                    selectedPriority.color
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
                            <SelectItem value={NO_SELECTION_VALUE}>
                              No priority
                            </SelectItem>
                            {priorityOptions.map((priority) => (
                              <SelectItem key={priority.id} value={priority.id}>
                                <div className="flex items-center gap-2">
                                  <Flag
                                    className="h-3 w-3"
                                    style={{
                                      color: resolvePriorityColor(
                                        priority.name,
                                        priority.color
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
                        <span className="text-sm text-gray-600 w-32">
                          Platform
                        </span>
                        <Select
                          value={editFormData.platformId}
                          onValueChange={handleEditPlatformSelectChange}
                          disabled={platformsLoading}
                        >
                          <SelectTrigger
                            className="outline-none focus:outline-none
    focus:ring-0 focus:ring-offset-0 px-2 border-none shadow-none bg-[#f1f5f980]  hover:bg-muted/50 transition-colors group w-52 justify-between"
                          >
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
                            <SelectItem value={NO_SELECTION_VALUE}>
                              No platform
                            </SelectItem>
                            {platformOptions.map((platform) => (
                              <SelectItem
                                key={platform.id ?? `platform-${platform.name}`}
                                value={
                                  platform.id !== null &&
                                  platform.id !== undefined
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
                          {/* <UserCog className="h-4 w-4" /> */}
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
                          {/* <Users className="h-4 w-4" /> */}
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
                          {/* <Contact2 className="h-4 w-4" /> */}
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
                        <span className="text-sm text-gray-600 w-32">
                          Created
                        </span>
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
                        <span className="text-sm text-gray-600 w-32">
                          Updated
                        </span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock size={14} />
                          <span>
                            {previewLead.updated_at
                              ? formatDateTimeWithTime(previewLead.updated_at)
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-8">
                        <div
                          className="bg-blue-500 text-white px-4 w-fit flex gap-1 py-2 rounded-md cursor-pointer flex items-center text-sm font-regular text-gray-900"
                          onClick={() => setNoteDialogOpen(true)}
                        >
                          <Plus className="!h-3 !w-3" />
                          Create Notes
                        </div>
                        <button
                          className="bg-[#f9fafb] text-[#111827] border-[#e5e7eb] border px-4 w-fit flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          onClick={() => setMediaDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Upload File
                        </button>
                      </div>
                    </div>

                    <hr className="my-4" />

                    {/* Upcoming Meetings List */}
                    {previewLead?.id && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {meetingsLoading
                              ? "Loading meetings..."
                              : `Upcoming Meetings${
                                  upcomingMeetings.length > 0
                                    ? ` (${upcomingMeetings.length})`
                                    : ""
                                }`}
                          </h3>
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            onClick={() => {
                              setSelectedMeetingId(null);
                              setMeetingDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Create Meeting
                          </button>
                        </div>
                        {meetingsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : upcomingMeetings.length > 0 ? (
                          <div className="h-[190px] overflow-y-auto">
                            <div className="space-y-2">
                              {upcomingMeetings.map((meeting: any) => {
                                const meetingDate = new Date(meeting.time);
                                const formattedDate =
                                  meetingDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  });
                                const formattedTime =
                                  meetingDate.toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  });
                                return (
                                  <div
                                    key={meeting.id}
                                    className="flex group items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                    onClick={() => {
                                      setSelectedMeetingId(meeting.id);
                                      setMeetingDetailsDialogOpen(true);
                                    }}
                                  >
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {meeting.title}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formattedDate} at {formattedTime}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedMeetingId(meeting.id);
                                          setMeetingDetailsDialogOpen(false);
                                          setMeetingDialogOpen(true);
                                        }}
                                        title="Edit meeting"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMeetingDeleteDialog({
                                            open: true,
                                            meetingId: meeting.id,
                                            meetingTitle: meeting.title,
                                          });
                                        }}
                                        title="Delete meeting"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                            No upcoming meetings
                          </div>
                        )}
                      </div>
                    )}

                    {/* <div className="mt-8 space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Lead Details
                        </h2>
                        <p className="text-sm text-gray-500">
                          Update the contact and source information for this lead.
                        </p>
                      </div>
                      <SalesLeadFormFields
                        data={editFormData}
                        errors={editErrors}
                        onChange={handleEditFormChange}
                        onPlatformSelectChange={handleEditPlatformSelectChange}
                        onPrioritySelectChange={handleEditPrioritySelectChange}
                        onContactSelectChange={handleEditContactSelectChange}
                        platformOptions={platformOptions}
                        priorityOptions={priorityOptions}
                        contactOptions={contactOptions}
                        platformsLoading={platformsLoading}
                      />
                    </div> */}

                    {/* <div className="mt-10 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          Priority Levels
                        </h3>
                        <p className="text-xs text-gray-500">
                          Create, edit, or remove priority levels.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px),1fr] gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="priorityName">Priority name</Label>
                            <Input
                              id="priorityName"
                              value={priorityFormState.name}
                              onChange={(event) =>
                                setPriorityFormState((prev) => ({
                                  ...prev,
                                  name: event.target.value,
                                }))
                              }
                              placeholder="e.g. Urgent"
                              className="bg-gray-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="priorityColor">
                              Priority color
                            </Label>
                            <Input
                              id="priorityColor"
                              type="color"
                              value={priorityFormState.color}
                              onChange={(event) =>
                                setPriorityFormState((prev) => ({
                                  ...prev,
                                  color: event.target.value,
                                }))
                              }
                              className="h-11 w-16 p-1"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              className="min-w-[140px]"
                              onClick={() => {
                                void handlePriorityFormSubmit();
                              }}
                              disabled={prioritySaving}
                            >
                              {prioritySaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : priorityFormState.id ? (
                                "Update priority"
                              ) : (
                                "Create priority"
                              )}
                            </Button>
                            {priorityFormState.id ? (
                              <Button
                                variant="ghost"
                                onClick={resetPriorityFormState}
                                disabled={prioritySaving}
                              >
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {priorityOptions.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No priority levels yet.
                            </p>
                          ) : (
                            priorityOptions.map((priority) => (
                              <div
                                key={priority.id}
                                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  className="flex items-center gap-2 text-left"
                                  onClick={() =>
                                    handleSelectPriorityForEdit(priority)
                                  }
                                >
                                  <Flag
                                    className="h-3.5 w-3.5"
                                    style={{
                                      color: getPriorityColor(
                                        priority.id ?? priority.name ?? ""
                                      ),
                                    }}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">
                                      {priority.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {priority.id}
                                    </span>
                                  </div>
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    void handleDeletePriority(priority.id);
                                  }}
                                  disabled={priorityDeleting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div> */}

                    <div className="mt-10 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between absolute bottom-4 left-4 right-4">
                      <div className="text-xs text-muted-foreground">
                        {previewLead.updated_at
                          ? `Last updated ${formatDateTimeWithTime(
                              previewLead.updated_at
                            )}`
                          : ""}
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handlePreviewDialogOpenChange(false)}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
                          onClick={() => {
                            void handleUpdateSubmit();
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
                              Update Lead
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 w-80 lg:w-96 flex-shrink-0 flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Activity
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {leadCommentsLoading ? "…" : leadComments.length}
                        </span>
                      </div>
                      {/* <button className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                          <ChevronRight className="h-3.5 w-3.5" />
                          Show more
                        </button> */}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {leadCommentsLoading ? (
                      <>
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                      </>
                    ) : leadComments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <Send className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          No activity yet
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Start the conversation below
                        </p>
                      </div>
                    ) : (
                      leadComments.map((comment) => (
                        <CommentCard
                          key={comment.id}
                          comment={comment}
                          currentUser={{
                            user_id: user?.userId,
                            first_name: user?.firstName,
                            last_name: user?.lastName,
                            email: user?.email,
                          }}
                          onEdit={handleEditComment}
                          onDelete={handleDeleteComment}
                          isDeleting={deleteLeadCommentMutation.isPending}
                          isEditing={updateLeadCommentMutation.isPending}
                        />
                      ))
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <CommentInput
                      currentUser={{
                        user_id: user?.userId,
                        first_name: user?.firstName,
                        last_name: user?.lastName,
                        email: user?.email,
                      }}
                      value={newCommentText}
                      onChange={setNewCommentText}
                      onSubmit={handleAddComment}
                      isSubmitting={createLeadCommentMutation.isPending}
                      disabled={!previewLead?.id}
                      placeholder="Add a comment..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Select a sales lead to view details.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SidebarPanel
        open={addSalesLeadSidebarOpen}
        onOpenChange={handleAddSalesLeadSidebarOpenChange}
        title="Add Sales Lead"
        description="Add a new sales lead to your workspace"
      >
        <div className="space-y-6">
          <CardContent className="p-1">
            <SalesLeadFormFields
              data={formData}
              errors={errors}
              onChange={handleFormChange}
              onPlatformSelectChange={handlePlatformSelectChange}
              onPrioritySelectChange={handlePrioritySelectChange}
              onContactSelectChange={handleContactSelectChange}
              platformOptions={platformOptions}
              priorityOptions={priorityOptions}
              contactOptions={contactOptions}
              platformsLoading={platformsLoading}
            />
          </CardContent>

          <div className="flex items-end justify-end mt-4">
            <div className="flex items-center gap-3">
              <Button
                className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
                onClick={() => {
                  void handleSubmit(true);
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

      <Dialog
        open={addPlatformDialog.open}
        onOpenChange={handleAddPlatformDialogOpenChange}
      >
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <Input
              id="platformName"
              value={addPlatformDialog.platformName}
              onChange={(event) =>
                handleAddPlatformDialogPlatformNameChange(event.target.value)
              }
              placeholder="Enter platform name"
            />
            {addPlatformDialog.error && (
              <p className="text-sm text-destructive">
                {addPlatformDialog.error}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  void handleAddPlatformDialogAddPlatform();
                }}
                disabled={isAddingPlatform}
              >
                {isAddingPlatform ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Platform"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      {previewLead && (
        <NoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          leadId={previewLead.id}
          onSuccess={() => {
            // Optionally refresh notes or show success message
          }}
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
            // Optionally refresh meetings or show success message
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
    </DashboardLayout>
  );
}
