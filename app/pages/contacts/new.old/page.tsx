"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateContact, useUpdateContact, useContact } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyId: string;
  location: string;
  description: string;
  contactTimeZone: string;
}

export default function NewContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editContactId = searchParams.get("edit");
  const isEditMode = !!editContactId;
  
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const { currentWorkspace } = useWorkspaceContext();
  
  const { data: companiesData, isLoading: companiesLoading } = useCompanies({
    workspaceId: currentWorkspace?.id,
    limit: 100,
  });
  const companies = companiesData?.companies || [];

  const { data: contactData, isLoading: isLoadingContact } = useContact(
    editContactId || ""
  );

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    companyId: "",
    location: "",
    description: "",
    contactTimeZone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Removed auto-selection - let users manually select a company
  // useEffect(() => {
  //   if (companies.length > 0 && !formData.companyId && !isEditMode) {
  //     setFormData((prev) => ({
  //       ...prev,
  //       companyId: companies[0].id,
  //     }));
  //   }
  // }, [companies, isEditMode]);

  useEffect(() => {
    if (isEditMode && contactData) {
      setFormData({
        firstName: contactData.firstName || "",
        lastName: contactData.lastName || "",
        email: contactData.email || "",
        phoneNumber: contactData.phoneNumber || "",
        companyId: contactData.companyId || "",
        location: contactData.location || "",
        description: contactData.description || "",
        contactTimeZone: contactData.contactTimeZone || "",
      });
    }
  }, [isEditMode, contactData]);

  const validateField = useCallback(
    (fieldName: string, value: string): string => {
      switch (fieldName) {
        case "firstName":
          return !value.trim() ? "First name is required" : "";
        case "email":
          if (value && value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !emailRegex.test(value) ? "Please enter a valid email address" : "";
          }
          return "";
        default:
          return "";
      }
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    newErrors.firstName = validateField("firstName", formData.firstName);
    newErrors.email = validateField("email", formData.email);

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  }, [formData.firstName, formData.email, validateField]);

  const handleFormChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (saveAndExit: boolean = false) => {
      if (!validateForm()) {
        toast.error("Please fill in all required fields");
        return;
      }

      try {
        const contactData = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || undefined,
          email: formData.email.trim() || undefined,
          phoneNumber: formData.phoneNumber.trim() || undefined,
          companyId: formData.companyId || undefined,
          workspaceId: currentWorkspace?.id || undefined,
          location: formData.location.trim() || undefined,
          description: formData.description.trim() || undefined,
          contactTimeZone: formData.contactTimeZone.trim() || undefined,
        };

        const cleanedData = Object.fromEntries(
          Object.entries(contactData).filter(([_, value]) => value !== undefined)
        ) as any;

        if (isEditMode && editContactId) {
          await updateContactMutation.mutateAsync({
            contactId: editContactId,
            data: cleanedData,
          });
          toast.success("Contact updated successfully!");
          router.push("/pages/contacts");
        } else {
          await createContactMutation.mutateAsync(cleanedData);
          toast.success("Contact created successfully!");

          if (saveAndExit) {
            router.push("/pages/contacts");
          } else {
            setFormData({
              firstName: "",
              lastName: "",
              email: "",
              phoneNumber: "",
              companyId: "",
              location: "",
              description: "",
              contactTimeZone: "",
            });
            setErrors({});
            toast.success("Ready to add another contact!");
          }
        }
      } catch (error: any) {
        toast.error(error?.message || (isEditMode ? "Failed to update contact" : "Failed to create contact"));
      }
    },
    [validateForm, formData, createContactMutation, updateContactMutation, router, isEditMode, editContactId, companies, currentWorkspace?.id]
  );

  const renderForm = () => {
    return (
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Essential Information</h3>
              <p className="text-sm text-gray-600 font-regular">
                {isEditMode ? "Update contact information" : "Required fields to create the contact"}
              </p>
            </div>
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="companyId">Company *</Label>
            {companies.length === 0 && !companiesLoading ? (
              <div className="space-y-2">
                <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>No companies available. Please create a company first.</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="w-full"
                >
                  <Link href="/pages/companies/new">
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Company
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => handleFormChange("companyId", value)}
                  disabled={companiesLoading || isEditMode}
                >
                  <SelectTrigger className={errors.companyId ? "border-red-500 focus:border-red-500" : ""}>
                    <SelectValue
                      placeholder={
                        companiesLoading
                          ? "Loading companies..."
                          : companies.length === 0
                          ? "No companies available"
                          : "Select a company"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.length > 0 ? (
                      companies.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-companies" disabled>
                        No companies available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.companyId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.companyId}
                  </p>
                )}
              </>
            )}
          </div> */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleFormChange("firstName", e.target.value)}
                  placeholder="John"
                  className={`pl-10 ${
                    errors.firstName ? "border-red-500 focus:border-red-500" : ""
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
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleFormChange("lastName", e.target.value)}
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
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="john.doe@example.com"
                  className={`pl-10 ${
                    errors.email ? "border-red-500 focus:border-red-500" : ""
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
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
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
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleFormChange("location", e.target.value)}
                placeholder="New York, NY"
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
                        <Label htmlFor="companyId">Select Company</Label>
                        {companies.length === 0 && !companiesLoading ? (
                          <div className="space-y-2">
                            <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span>No companies available. Please create a company first.</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              asChild
                              className="w-full"
                            >
                              <Link href="/pages/companies/new">
                                <Building2 className="h-4 w-4 mr-2" />
                                Create Company
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Select
                              value={formData.companyId || undefined}
                              onValueChange={(value) => handleFormChange("companyId", value)}
                              disabled={companiesLoading}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    companiesLoading
                                      ? "Loading companies..."
                                      : companies.length === 0 
                                      ? "No companies available"
                                      : "Select Company"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.length > 0 ? (
                                  companies.map((company: any) => (
                                    <SelectItem key={company.id} value={company.id}>
                                      {company.title}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-companies" disabled>
                                    No companies available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>

          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                placeholder="Additional notes and information about the contact..."
                rows={3}
                className="pl-10"
              />
            </div>
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="contactTimeZone">Time Zone</Label>
            <Input
              id="contactTimeZone"
              value={formData.contactTimeZone}
              onChange={(e) => handleFormChange("contactTimeZone", e.target.value)}
              placeholder="America/New_York"
              className="max-w-md"
            />
          </div> */}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">
                {isEditMode ? "Edit Contact" : "Add New Contact"}
              </h1>
            </div>
          </div>
        </div>

        {isLoadingContact && isEditMode ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground">Loading contact data...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">{renderForm()}</CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/pages/contacts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={createContactMutation.isPending || updateContactMutation.isPending}
              >
                Save & Add Another
              </Button>
            )}

            <Button
              onClick={() => handleSubmit(true)}
              disabled={createContactMutation.isPending || updateContactMutation.isPending || isLoadingContact}
              className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
            >
              {(createContactMutation.isPending || updateContactMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? "Update Contact" : "Save & Exit"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
