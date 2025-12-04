"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Save,
  User,
  Mail,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useCreateSalesContact } from "@/hooks/use-sales-contact";
import {
  useContactPlatforms,
  useCreateContactPlatform,
} from "@/hooks/use-contact-platforms";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import type { SalesContactInsert } from "@/lib/data/sales-contacts";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  contactTimeZone: string;
  platformId: string;
  platformCustom: string;
  status: SalesContactInsert["status"];
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
};

export default function NewSalesContactPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceContext();
  const createSalesContactMutation = useCreateSalesContact();
  const { data: platformsData, isLoading: platformsLoading } =
    useContactPlatforms();
  const createContactPlatformMutation = useCreateContactPlatform();

  const platformOptions = useMemo(() => platformsData ?? [], [platformsData]);
  const isSaving =
    createSalesContactMutation.isPending ||
    createContactPlatformMutation.isPending;

  const statusOptions = useMemo(
    () =>
      [
        { value: "pending", label: "Pending" },
        { value: "moved_to_lead", label: "Moved to Lead" },
        { value: "rejected", label: "Rejected" },
      ] satisfies Array<{
        value: SalesContactInsert["status"];
        label: string;
      }>,
    []
  );

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<keyof FormData, string>>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    location: "",
    contactTimeZone: "",
    platformId: "",
    platformCustom: "",
    status: "",
  });

  const validateField = useCallback(
    (fieldName: keyof FormData, value: string) => {
      switch (fieldName) {
        case "firstName":
          return !value.trim() ? "First name is required" : "";
        case "email":
          if (value && value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? "" : "Please enter a valid email";
          }
          return "";
        default:
          return "";
      }
    },
    []
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

  const validateForm = useCallback(() => {
    const newErrors: Record<keyof FormData, string> = {
      firstName: validateField("firstName", formData.firstName),
      email: validateField("email", formData.email),
      lastName: "",
      phoneNumber: "",
      location: "",
      contactTimeZone: "",
      platformId: "",
      platformCustom: "",
      status: "",
    };

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([, value]) => value !== "")
    ) as Record<keyof FormData, string>;

    setErrors((prev) => ({ ...prev, ...filteredErrors }));
    return Object.keys(filteredErrors).length === 0;
  }, [formData, validateField]);

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
          platformId = existingPlatform.id;
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
      };

      try {
        await createSalesContactMutation.mutateAsync(payload);
        toast.success("Sales contact created successfully!");

        if (saveAndExit) {
          router.push("/pages/sales-contacts");
        } else {
          setFormData(INITIAL_FORM_STATE);
          setErrors({
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            location: "",
            contactTimeZone: "",
            platformId: "",
            platformCustom: "",
            status: "",
          });
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to create sales contact.");
      }
    },
    [
      currentWorkspace?.id,
      createSalesContactMutation,
      createContactPlatformMutation,
      formData,
      platformOptions,
      router,
      validateForm,
    ]
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">
              Add Sales Contact
            </h1>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Contact Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Provide the essential details to create a sales contact.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(event) =>
                          handleFormChange("firstName", event.target.value)
                        }
                        placeholder="John"
                        className={`pl-10 ${
                          errors.firstName
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }`}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(event) =>
                          handleFormChange("lastName", event.target.value)
                        }
                        placeholder="Doe"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          handleFormChange("email", event.target.value)
                        }
                        placeholder="john.doe@example.com"
                        className={`pl-10 ${
                          errors.email
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(event) =>
                          handleFormChange("phoneNumber", event.target.value)
                        }
                        placeholder="+1 (555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(event) =>
                          handleFormChange("location", event.target.value)
                        }
                        placeholder="New York, USA"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactTimeZone">Contact Time Zone</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                      <Input
                        id="contactTimeZone"
                        value={formData.contactTimeZone}
                        onChange={(event) =>
                          handleFormChange(
                            "contactTimeZone",
                            event.target.value
                          )
                        }
                        placeholder="America/New_York"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platformId">Lead Platform</Label>
                    <Select
                      value={formData.platformId}
                      onValueChange={(value) =>
                        handleFormChange("platformId", value)
                      }
                      disabled={platformsLoading}
                    >
                      <SelectTrigger>
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
                            >
                              {platform.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-platforms" disabled>
                            No saved platforms
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platformCustom">Platform (manual)</Label>
                    <Input
                      id="platformCustom"
                      value={formData.platformCustom}
                      onChange={(event) =>
                        handleFormChange("platformCustom", event.target.value)
                      }
                      placeholder="Enter a new platform name"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll add it to the list automatically if it's new.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleFormChange("status", value as FormData["status"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/pages/sales-contacts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
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
            </Button>
            <Button
              className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
              onClick={() => handleSubmit(true)}
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
    </DashboardLayout>
  );
}
