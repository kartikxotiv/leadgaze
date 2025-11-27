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
  useCreateSalesContact,
  useDeleteSalesContact,
  useSalesContacts,
  useUpdateSalesContact,
} from "@/hooks/use-sales-contact";
import { useCreateSalesLead } from "@/hooks/use-sales-leads";
import {
  useContactPlatforms,
  useCreateContactPlatform,
} from "@/hooks/use-contact-platforms";
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
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Mail,
  AlertCircle,
  Phone,
  MapPin,
  Loader2,
  Save,
  MoveRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { SalesContactInsert } from "@/lib/data/sales-contacts";
import type { SalesLeadInsert } from "@/lib/data/sales-leads";
import type { ContactPlatform } from "@/lib/data/contact-platforms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulkImportExportDialog } from "@/components/reuseableComponent/bulk-import-export-dialog";
import type {
  FieldDefinition,
  ImportResult,
} from "@/components/reuseableComponent/bulk-import-export-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";

type StatusOptionValue = NonNullable<SalesContactInsert["status"]>;

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

  alternativeEmail: string;
  alternativePhoneNumber: string;
  businessContact: string;
  businessLinkedin: string;
  businessName: string;
  comment: string;
  linkedinUrl: string;
}

const INITIAL_FORM_STATE: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  contactTimeZone: "",
  platformId: "",
  platformCustom: "",
  status: "pending",
  alternativeEmail: "",
  alternativePhoneNumber: "",
  businessContact: "",
  businessLinkedin: "",
  businessName: "",
  comment: "",
  linkedinUrl: "",
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
  alternativeEmail: "",
  alternativePhoneNumber: "",
  businessContact: "",
  businessLinkedin: "",
  businessName: "",
  comment: "",
  linkedinUrl: "",
};

const STATUS_OPTIONS: Array<{ value: StatusOptionValue; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "moved_to_lead", label: "Moved to Lead" },
  { value: "rejected", label: "Rejected" },
];

const CONTACT_STATUS_STYLE_MAP: Record<StatusOptionValue, string> = {
  pending: "bg-blue-100 text-blue-700",
  moved_to_lead: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

function getPlatformBadgeColors(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return undefined;
  }
  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const backgroundColor = `hsla(${hue}, 80%, 90%, 0.9)`;
  const color = `hsl(${hue}, 60%, 32%)`;
  return { backgroundColor, color };
}

const ADD_PLATFORM_SELECT_VALUE = "__add_new_platform__";

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
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizePhoneNumberFromString(value?: string | null): number | null {
  if (!value) return null;
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

interface SalesContactFormFieldsProps {
  data: FormData;
  errors: Record<keyof FormData, string>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onPlatformSelectChange: (value: string) => void;
  platformOptions: ContactPlatform[];
  platformsLoading: boolean;
}

function SalesContactFormFields({
  data,
  errors: formErrors,
  onChange,
  onPlatformSelectChange,
  platformOptions,
  platformsLoading,
}: SalesContactFormFieldsProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="firstName"
                value={data.firstName}
                onChange={(event) => onChange("firstName", event.target.value)}
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
                  formErrors.email ? "border-red-500 focus:border-red-500" : ""
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="alternativePhoneNumber">
              Alternative Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="alternativePhoneNumber"
                type="tel"
                value={data.alternativePhoneNumber}
                onChange={(event) => {
                  const value = event.target.value;
                  const digitsOnly = value.replace(/\D/g, "");
                  const limitedDigits = digitsOnly.slice(0, 10);
                  onChange("alternativePhoneNumber", limitedDigits);
                }}
                placeholder="1234567890"
                maxLength={10}
                className="pl-10 bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternativeEmail">Alternative Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="alternativeEmail"
                type="email"
                value={data.alternativeEmail}
                onChange={(event) =>
                  onChange("alternativeEmail", event.target.value)
                }
                placeholder="alt.email@example.com"
                className="pl-10 bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              type="url"
              value={data.linkedinUrl}
              onChange={(event) => onChange("linkedinUrl", event.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="bg-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={data.businessName}
              onChange={(event) => onChange("businessName", event.target.value)}
              placeholder="Company Name"
              className="bg-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="businessLinkedin">Business LinkedIn</Label>
            <Input
              id="businessLinkedin"
              type="url"
              value={data.businessLinkedin}
              onChange={(event) =>
                onChange("businessLinkedin", event.target.value)
              }
              placeholder="https://linkedin.com/company/companyname"
              className="bg-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessContact">Business Contact</Label>
            <Input
              id="businessContact"
              value={data.businessContact}
              onChange={(event) =>
                onChange("businessContact", event.target.value)
              }
              placeholder="Business contact person"
              className="bg-gray-100"
              maxLength={10}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment">Comment</Label>
          <textarea
            id="comment"
            value={data.comment}
            onChange={(event) => onChange("comment", event.target.value)}
            placeholder="Additional notes or comments..."
            rows={4}
            className="w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {platformOptions.length > 0 ? (
                  platformOptions.map((platform) => (
                    <SelectItem
                      key={platform.id}
                      value={String(platform.id)}
                      className={` hover:bg-gray-200 hover:text-black`}
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
      </div>
    </div>
  );
}

export default function SalesContactsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Get workspace permissions
  const { data: permissionsData } = useWorkspacePermissions();
  const canViewSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "view"
  );
  const canCreateSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "create"
  );
  const canUpdateSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "update"
  );
  const canDeleteSalesContacts = useWorkspaceRoutePermission(
    "Sales Contacts",
    "delete"
  );
  const isSalesContactsVisible = useWorkspaceRoutePermission(
    "Sales Contacts",
    "visible"
  );

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

  const {
    data: salesContacts,
    isLoading,
    isError,
    error,
  } = useSalesContacts(filters);
  const { data: platformList, isLoading: platformsLoading } =
    useContactPlatforms();
  const createSalesContactMutation = useCreateSalesContact();
  const createSalesLeadMutation = useCreateSalesLead();
  const createContactPlatformMutation = useCreateContactPlatform();
  const updateSalesContactMutation = useUpdateSalesContact();
  const deleteSalesContactMutation = useDeleteSalesContact();
  const platformOptions = useMemo(() => platformList ?? [], [platformList]);
  const platformNameMap = useMemo(() => {
    const map = new Map<number, string>();
    platformOptions.forEach((platform) => {
      if (platform.id !== undefined && platform.id !== null) {
        map.set(platform.id, platform.name);
      }
    });
    return map;
  }, [platformOptions]);

  const tableData = useMemo(() => {
    const contacts = salesContacts?.data ?? [];
    return contacts.map((contact) => ({
      ...contact,
      company_label: contact.company_id ?? "",
      platform_label: contact.platform
        ? platformNameMap.get(contact.platform) ?? `ID ${contact.platform}`
        : "",
      status_label: formatStatus(contact.status),
      created_at_label: formatDateTime(contact.created_at),
      updated_at_label: formatDateTime(contact.updated_at),
    }));
  }, [salesContacts?.data, platformNameMap]);

  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    salesContactId?: string;
    salesContactName?: string;
  }>({ open: false });
  const [previewSidebarOpen, setPreviewSidebarOpen] = useState(false);
  const [addSalesContactSidebarOpen, setAddSalesContactSidebarOpen] =
    useState(false);
  const [movingToLeadContactId, setMovingToLeadContactId] = useState<
    string | null
  >(null);
  const [importExportDialogOpen, setImportExportDialogOpen] = useState(false);
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
  const isSaving =
    createSalesContactMutation.isPending ||
    createContactPlatformMutation.isPending;
  const isAddingPlatform = createContactPlatformMutation.isPending;
  const isUpdating = updateSalesContactMutation.isPending;

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
        alternativeEmail: validateField(
          "alternativeEmail",
          data.alternativeEmail
        ),
        alternativePhoneNumber: validateField(
          "alternativePhoneNumber",
          data.alternativePhoneNumber
        ),
        businessContact: validateField("businessContact", data.businessContact),
        businessLinkedin: validateField(
          "businessLinkedin",
          data.businessLinkedin
        ),
        businessName: validateField("businessName", data.businessName),
        comment: validateField("comment", data.comment),
        linkedinUrl: validateField("linkedinUrl", data.linkedinUrl),
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

  const mapContactToFormData = useCallback((contact: any): FormData => {
    if (!contact) {
      return { ...INITIAL_FORM_STATE };
    }

    return {
      firstName: contact.first_name ?? "",
      lastName: contact.last_name ?? "",
      email: contact.email ?? "",
      phoneNumber: contact.phone_number ?? "",
      location: contact.location ?? "",
      contactTimeZone: contact.contact_time_zone ?? "",
      platformId:
        contact.platform !== undefined && contact.platform !== null
          ? String(contact.platform)
          : "",
      platformCustom: "",
      status: (contact.status as StatusOptionValue) ?? "pending",

      alternativeEmail: contact.alternative_email ?? "",
      alternativePhoneNumber: contact.alternative_phone_number ?? "",
      businessContact: contact.business_contact ?? "",
      businessLinkedin: contact.business_linkedin ?? "",
      businessName: contact.business_name ?? "",
      comment: contact.comment ?? "",
      linkedinUrl: contact.linkedin_url ?? "",
    };
  }, []);
  const [previewContact, setPreviewContact] = useState<any | null>(null);

  const handleDeleteSalesContact = useCallback(
    (salesContactId: string, salesContactName: string) => {
      setDeleteDialog({
        open: true,
        salesContactId,
        salesContactName,
      });
    },
    []
  );

  const handleMoveToLead = useCallback(
    async (contact: any) => {
      if (!contact?.id) {
        toast.error("Select a sales contact to move to leads.");
        return;
      }

      if (!currentWorkspace?.id) {
        toast.error(
          "Please select a workspace before moving contacts to leads."
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
        contact.phone_number != null ? String(contact.phone_number) : null
      );
      const normalizedAlternativePhone = normalizePhoneNumberFromString(
        contact.alternative_phone_number != null
          ? String(contact.alternative_phone_number)
          : null
      );
      const rawPlatformId =
        contact.platform !== undefined && contact.platform !== null
          ? Number(contact.platform)
          : null;
      const platformId =
        rawPlatformId !== null && Number.isNaN(rawPlatformId)
          ? null
          : rawPlatformId;

      const payload: SalesLeadInsert = {
        first_name: firstName || "Unnamed Contact",
        last_name: contact.last_name?.trim() || null,
        email: contact.email?.trim() || null,
        phone_number: normalizedPhone,
        location: contact.location?.trim() || null,
        contact_time_zone: contact.contact_time_zone?.trim() || null,
        status: "pipeline",
        workspace_id: currentWorkspace.id,
        platform: platformId,
        priority: null,
        contact_id: contactId,
        alternative_email: contact.alternative_email?.trim() || null,
        alternative_phone_number:
          normalizedAlternativePhone != null
            ? String(normalizedAlternativePhone)
            : null,
        linkedin_url: contact.linkedin_url?.trim() || null,
        business_name: contact.business_name?.trim() || null,
        business_linkedin: contact.business_linkedin?.trim() || null,
        business_contact: contact.business_contact?.trim() || null,
        comment: contact.comment?.trim() || null,
      };

      try {
        setMovingToLeadContactId(contactId);
        await createSalesLeadMutation.mutateAsync(payload);
        const updatedContact = await updateSalesContactMutation.mutateAsync({
          id: contactId,
          data: { status: "moved_to_lead" },
        });
        toast.success("Sales contact moved to Sales Leads successfully!");

        setPreviewContact((prev: any) => {
          if (!prev || prev.id !== contact.id) {
            return prev;
          }
          const platformLabel =
            updatedContact?.platform !== undefined &&
            updatedContact?.platform !== null
              ? platformNameMap.get(updatedContact.platform) ??
                prev.platform_label ??
                ""
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
    ]
  );

  const confirmDeleteSalesContact = useCallback(
    async (salesContactId?: string) => {
      if (!salesContactId) return;
      try {
        await deleteSalesContactMutation.mutateAsync(salesContactId);
        toast.success("Sales contact deleted successfully");
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete sales contact");
        throw err;
      }
    },
    [deleteSalesContactMutation]
  );

  const handlePreviewContact = useCallback(
    (contact: any) => {
      setPreviewContact(contact);
      setPreviewSidebarOpen(true);
      setEditFormData(mapContactToFormData(contact));
      setEditErrors({ ...INITIAL_FORM_ERRORS });
    },
    [mapContactToFormData]
  );

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      setPreviewSidebarOpen(open);
      if (!open) {
        setPreviewContact(null);
        resetEditFormState();
      }
    },
    [resetEditFormState]
  );

  const handleAddSalesContactSidebarOpenChange = useCallback(
    (open: boolean) => {
      setAddSalesContactSidebarOpen(open);
      if (!open) {
        resetFormState();
      }
    },
    [resetFormState]
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
    createContactPlatformMutation,
    handleEditFormChange,
    handleFormChange,
    platformOptions,
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

      const payload: SalesContactInsert = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim() || null,
        email: formData.email.trim() || null,
        phone_number: formData.phoneNumber.trim() || null,
        location: formData.location.trim() || null,
        contact_time_zone: formData.contactTimeZone.trim() || null,
        status: formData.status,
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
      };

      try {
        await createSalesContactMutation.mutateAsync(payload);
        toast.success("Sales contact created successfully!");
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
    ]
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
    };

    try {
      const updatedContact = await updateSalesContactMutation.mutateAsync({
        id: String(contactId),
        data: payload,
      });
      toast.success("Sales contact updated successfully!");
      setPreviewContact((prev: any) => {
        if (!prev) return prev;
        const platformLabel =
          updatedContact?.platform !== undefined &&
          updatedContact?.platform !== null
            ? platformNameMap.get(updatedContact.platform) ??
              prev.platform_label ??
              ""
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
    deleteDialog,
    createContactPlatformMutation,
    editFormData,
    mapContactToFormData,
    platformNameMap,
    platformOptions,
    previewContact?.id,
    updateSalesContactMutation,
    validateEditForm,
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

  const columns = useMemo(
    () => [
      {
        id: "full name",
        name: "Full Name",
        selector: (row: any) =>
          `${row.first_name || ""} ${row.last_name || ""}`.trim(),
        sortable: true,
      },

      {
        id: "phone_number",
        name: "Phone Number",
        selector: (row: any) => row.phone_number || "",
        sortable: true,
      },
      {
        id: "email",
        name: "Email",
        selector: (row: any) => row.email || "",
        sortable: true,
      },

      {
        id: "location",
        name: "Location",
        selector: (row: any) => row.location || "",
        sortable: true,
      },
      {
        id: "platform",
        name: "Platform",
        selector: (row: any) => row.platform_label || "",
        cell: (row: any) => {
          if (!row.platform_label) {
            return <span className="text-sm text-muted-foreground/60">—</span>;
          }
          const badgeColors = getPlatformBadgeColors(row.platform_label);
          return (
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700"
              style={badgeColors}
            >
              {row.platform_label}
            </span>
          );
        },
        sortable: true,
      },

      {
        id: "alternative_email",
        name: "Alternative Email",
        selector: (row: any) => row.alternative_email || "",
        sortable: true,
      },
      {
        id: "alternative_phone_number",
        name: "Alternative Phone Number",
        selector: (row: any) => row.alternative_phone_number || "",
        sortable: true,
      },
      {
        id: "business_contact",
        name: "Business Contact",
        selector: (row: any) => row.business_contact || "",
        sortable: true,
      },
      {
        id: "business_linkedin",
        name: "Business LinkedIn",
        selector: (row: any) => row.business_linkedin || "",
        sortable: true,
      },
      {
        id: "business_name",
        name: "Business Name",
        selector: (row: any) => row.business_name || "",
        sortable: true,
      },
      {
        id: "comment",
        name: "Comment",
        selector: (row: any) => row.comment || "",
        sortable: true,
      },
      {
        id: "linkedin_url",
        name: "LinkedIn URL",
        selector: (row: any) => row.linkedin_url || "",
        sortable: true,
      },

      {
        id: "status",
        name: "Status",
        selector: (row: any) => row.status_label || "",
        cell: (row: any) => {
          const statusValue = (row.status as StatusOptionValue) ?? "pending";
          const classes =
            CONTACT_STATUS_STYLE_MAP[statusValue] ??
            "bg-gray-100 text-gray-700";
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
        id: "actions",
        name: "Actions",
        cell: (row: any) => {
          // Only show actions menu if user has any permissions
          const hasAnyPermission =
            canUpdateSalesContacts ||
            canDeleteSalesContacts ||
            canCreateSalesContacts;
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
                {canUpdateSalesContacts && (
                  <DropdownMenuItem
                    onClick={() => {
                      handlePreviewContact(row);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                )}
                {canCreateSalesContacts && (
                  <DropdownMenuItem
                    onClick={() => {
                      void handleMoveToLead(row);
                    }}
                    disabled={
                      movingToLeadContactId !== null ||
                      row.status === "moved_to_lead"
                    }
                  >
                    {movingToLeadContactId === String(row.id) ? (
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
                  </DropdownMenuItem>
                )}
                {canDeleteSalesContacts && (
                  <>
                    {(canUpdateSalesContacts || canCreateSalesContacts) && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        handleDeleteSalesContact(
                          row.id,
                          `${row.first_name || ""} ${
                            row.last_name || ""
                          }`.trim()
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
      handleDeleteSalesContact,
      handleMoveToLead,
      movingToLeadContactId,
      router,
      canUpdateSalesContacts,
      canDeleteSalesContacts,
      canCreateSalesContacts,
    ]
  );

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
    []
  );

  // Import/Export configuration
  const importFields: FieldDefinition[] = useMemo(
    () => [
      { key: "firstName", label: "First Name", required: true },
      { key: "lastName", label: "Last Name", required: true },
      { key: "email", label: "Email", required: true },
      { key: "phoneNumber", label: "Phone Number", required: false },
      { key: "location", label: "Location", required: false },
      { key: "alternativeEmail", label: "Alternative Email", required: false },
      {
        key: "alternativePhoneNumber",
        label: "Alternative Phone Number",
        required: false,
      },
      { key: "businessName", label: "Business Name", required: false },
      { key: "businessLinkedin", label: "Business LinkedIn", required: false },
      { key: "businessContact", label: "Business Contact", required: false },
      { key: "linkedinUrl", label: "LinkedIn URL", required: false },
      { key: "comment", label: "Comment", required: false },
      { key: "status", label: "Status", required: false },
      { key: "platform", label: "Platform", required: false },
    ],
    []
  );

  const exportFields: FieldDefinition[] = useMemo(
    () => [
      { key: "first_name", label: "First Name", required: false },
      { key: "last_name", label: "Last Name", required: false },
      { key: "email", label: "Email", required: false },
      { key: "phone_number", label: "Phone Number", required: false },
      { key: "location", label: "Location", required: false },
      { key: "alternative_email", label: "Alternative Email", required: false },
      {
        key: "alternative_phone_number",
        label: "Alternative Phone Number",
        required: false,
      },
      { key: "business_name", label: "Business Name", required: false },
      { key: "business_linkedin", label: "Business LinkedIn", required: false },
      { key: "business_contact", label: "Business Contact", required: false },
      { key: "linkedin_url", label: "LinkedIn URL", required: false },
      { key: "comment", label: "Comment", required: false },
      { key: "status", label: "Status", required: false },
      { key: "platform_label", label: "Platform", required: false },
    ],
    []
  );

  const importSampleData = useMemo(
    () => [
      [
        "John",
        "Doe",
        "john.doe@example.com",
        "1234567890",
        "New York, USA",
        "alt.john@example.com",
        "9876543210",
        "Acme Corp",
        "https://linkedin.com/company/acme",
        "Jane Smith",
        "https://linkedin.com/in/johndoe",
        "Interested in product",
        "pending",
        "LinkedIn",
      ],
      [
        "Jane",
        "Smith",
        "jane.smith@techcorp.com",
        "2345678901",
        "San Francisco, CA",
        "",
        "",
        "TechCorp Inc",
        "https://linkedin.com/company/techcorp",
        "Mike Johnson",
        "https://linkedin.com/in/janesmith",
        "Need follow up",
        "pending",
        "Website",
      ],
    ],
    []
  );

  const handleImportComplete = useCallback(
    (results: ImportResult) => {
      // Refetch sales contacts after import
      queryClient.invalidateQueries({ queryKey: ["sales-contacts"] });
      toast.success(
        `Import completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicates} duplicates`
      );
    },
    [queryClient]
  );

  const exportDataTransform = useCallback((row: any) => {
    return [
      row.first_name || "",
      row.last_name || "",
      row.email || "",
      row.phone_number || "",
      row.location || "",
      row.alternative_email || "",
      row.alternative_phone_number || "",
      row.business_name || "",
      row.business_linkedin || "",
      row.business_contact || "",
      row.linkedin_url || "",
      row.comment || "",
      row.status_label || "",
      row.platform_label || "",
    ];
  }, []);

  const renderTable = () => {
    if (!workspaceId) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground">
          Select a workspace to view sales contacts.
        </div>
      );
    }

    // Check if user has permission to view
    if (permissionsData && !canViewSalesContacts && !isSalesContactsVisible) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p>
            You don't have permission to view sales contacts in this workspace.
          </p>
          <p className="text-xs mt-1">
            Contact your workspace administrator to grant access.
          </p>
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
          Failed to load sales contacts. {message}
        </div>
      );
    }

    if (tableData.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No sales contacts yet. Add your first contact to get started.
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
        onRowClicked={handlePreviewContact}
      />
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight"> Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportExportDialogOpen(true)}
            disabled={!workspaceId}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportExportDialogOpen(true)}
            disabled={!tableData || tableData.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreateSalesContacts && (
            <Button
              onClick={() => handleAddSalesContactSidebarOpenChange(true)}
            >
              <Plus className="h-4 w-4" />
              Add Contact
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
            salesContactId: open ? prev.salesContactId : undefined,
            salesContactName: open ? prev.salesContactName : undefined,
          }))
        }
        itemName={deleteDialog.salesContactName || ""}
        itemId={deleteDialog.salesContactId}
        onConfirm={confirmDeleteSalesContact}
        isLoading={deleteSalesContactMutation.isPending}
        title="Delete Sales Contact"
      />
      <SidebarPanel
        open={previewSidebarOpen}
        onOpenChange={handleSidebarOpenChange}
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
              data={editFormData}
              errors={editErrors}
              onChange={handleEditFormChange}
              onPlatformSelectChange={handleEditPlatformSelectChange}
              platformOptions={platformOptions}
              platformsLoading={platformsLoading}
            />

            <div className="flex items-center justify-between gap-3">
              <div>
                <Button
                  variant="outline"
                  onClick={() => handleSidebarOpenChange(false)}
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
                    void handleMoveToLead(previewContact);
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

      <SidebarPanel
        open={addSalesContactSidebarOpen}
        onOpenChange={handleAddSalesContactSidebarOpenChange}
        title="Add Sales Contact"
        description={"Add a new sales contact to your workspace"}
      >
        <div className="space-y-6">
          <CardContent className="p-1">
            <SalesContactFormFields
              data={formData}
              errors={errors}
              onChange={handleFormChange}
              onPlatformSelectChange={handlePlatformSelectChange}
              platformOptions={platformOptions}
              platformsLoading={platformsLoading}
            />
          </CardContent>

          <div className="flex items-end justify-end mt-4">
            <div className="flex items-center gap-3">
              {/* <Button
                variant="outline"
                onClick={() => {
                  void handleSubmit(false);
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & Add Another"
                )}
              </Button> */}
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
          <DialogHeader>
            <DialogTitle>Add Platform</DialogTitle>
          </DialogHeader>
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

      <BulkImportExportDialog
        open={importExportDialogOpen}
        onOpenChange={setImportExportDialogOpen}
        title="Import / Export Sales Contacts"
        description="Import contacts from Excel/CSV files or export existing contacts"
        importFields={importFields}
        importApiEndpoint="/api/sales-contacts/import"
        importSampleData={importSampleData}
        importFileName="sales-contacts"
        exportData={tableData}
        exportFields={exportFields}
        exportFileName="sales-contacts"
        exportDataTransform={exportDataTransform}
        workspaceId={workspaceId}
        onImportComplete={handleImportComplete}
        token={token || undefined}
      />
    </DashboardLayout>
  );
}
