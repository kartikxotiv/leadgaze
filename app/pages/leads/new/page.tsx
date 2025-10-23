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
import { useCreateLead, useLeadConfigs } from "@/hooks/use-leads";
import { useAuth } from "@/lib/hooks/use-auth";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  linkedinUrl: string;
  statusId: string;
  sourceId: string;
  industryId: string;
  companySizeId: string;
  scoreGradeId: string;
  productInterestIds: string[];
  assignedTo: string;
  notes: string;
  leadScore: number;
}

export default function NewLeadPage() {
  const router = useRouter();
  const createLeadMutation = useCreateLead();
  const { data: configs, isLoading: configsLoading } = useLeadConfigs();
  const { user: currentUser, currentOrganization } = useAuth();

  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    website: "",
    linkedinUrl: "",
    statusId: "",
    sourceId: "",
    industryId: "",
    companySizeId: "",
    scoreGradeId: "",
    productInterestIds: [],
    assignedTo: "",
    notes: "",
    leadScore: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

 
  const statuses = configs?.status || [];
  const sources = configs?.source || [];
  const industries = configs?.industry || [];
  const companySizes = configs?.company_size || [];
  const scoreGrades = configs?.score_grade || [];

 
  const validateField = useCallback(
    (fieldName: string, value: string): string => {
      switch (fieldName) {
        case "firstName":
          return !value.trim() ? "Required" : "";
        case "lastName":
          return !value.trim() ? "Required" : "";
        case "email":
          if (!value.trim()) return "Required";
          if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
          return "";
        case "company":
          return !value.trim() ? "Required" : "";
        default:
          return "";
      }
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

   
    newErrors.firstName = validateField("firstName", formData.firstName);
    newErrors.lastName = validateField("lastName", formData.lastName);
    newErrors.email = validateField("email", formData.email);
    newErrors.company = validateField("company", formData.company);

   
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  }, [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.company,
    validateField,
  ]);

 
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

     
      if (!currentOrganization?.organizationId && !currentOrganization?.id) {
        toast.error("Organization not found. Please log in again.");
        return;
      }

      if (!currentUser?.userId) {
        toast.error("User not found. Please log in again.");
        return;
      }

      try {
       
       
        const leadData = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          businessName: formData.company.trim(),
          companyWebsite: formData.website.trim() || undefined,
         
          organizationId: currentOrganization?.organizationId || currentOrganization?.id,
          createdBy: currentUser?.userId,
         
          sourceId: formData.sourceId || undefined,
          industryId: formData.industryId || undefined,
          companySizeId: formData.companySizeId || undefined,
          productInterest: undefined,
          tags: [],
          assignedTo: formData.assignedTo || undefined,
          notes: formData.notes.trim() || undefined,
        };

       
        const cleanedData = Object.fromEntries(
          Object.entries(leadData).filter(([_, value]) => value !== undefined)
        ) as any;

        await createLeadMutation.mutateAsync(cleanedData);

        toast.success("Lead created successfully!");

        if (saveAndExit) {
          router.push("/pages/leads");
        } else {
         
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            company: "",
            jobTitle: "",
            website: "",
            linkedinUrl: "",
            statusId: "",
            sourceId: "",
            industryId: "",
            companySizeId: "",
            scoreGradeId: "",
            productInterestIds: [],
            assignedTo: "",
            notes: "",
            leadScore: 0,
          });
          setErrors({});
          toast.success("Ready to add another lead!");
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to create lead");
      }
    },
    [validateForm, formData, createLeadMutation, router]
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
                
                Required fields to create the lead

              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleFormChange("firstName", e.target.value)}
                placeholder="John"
                className={
                  errors.firstName ? "border-red-500 focus:border-red-500" : ""
                }
              />
              {errors.firstName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleFormChange("lastName", e.target.value)}
                placeholder="Doe"
                className={
                  errors.lastName ? "border-red-500 focus:border-red-500" : ""
                }
              />
              {errors.lastName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="john.doe@company.com"
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
              <Label htmlFor="company">Company Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleFormChange("company", e.target.value)}
                  placeholder="Acme Corporation"
                  className={`pl-10 ${
                    errors.company ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
              </div>
              {errors.company && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.company}
                </p>
              )}
            </div>
          </div>
        </div>

        {}
        <div className="border-t pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <span>
              {showOptionalFields ? "Hide" : "Show"} Additional Details
            </span>
            <ArrowRight
              className={`h-4 w-4 transition-transform ${
                showOptionalFields ? "rotate-90" : ""
              }`}
            />
          </Button>
        </div>

        {}
        {showOptionalFields && (
          <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Additional Details</h3>
                <p className="text-sm text-gray-600">
                  Optional information for better lead management
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleFormChange("jobTitle", e.target.value)}
                  placeholder="Sales Manager"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="website">Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      handleFormChange("website", e.target.value)
                    }
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceId">Lead Source</Label>
                <Select
                  value={formData.sourceId}
                  onValueChange={(value) => handleFormChange("sourceId", value)}
                  disabled={configsLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        configsLoading
                          ? "Loading sources..."
                          : sources.length === 0
                          ? "No sources available"
                          : "How did you find this lead?"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.length > 0 ? (
                      sources.map((source: any) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.label || source.value}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-sources" disabled>
                        No sources available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {!configsLoading && sources.length === 0 && (
                  <p className="text-xs text-yellow-600">
                    No lead sources configured. Please contact your
                    administrator.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Any additional information about this lead..."
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

 
  if (configsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pages/leads">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Add New Lead
              </h1>
              <p className="text-gray-600">Loading form...</p>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-medium tracking-tight">
                  Add New Lead
                </h1>
              
              </div>
            </div>
        </div>

        {}
        <Card>
          <CardContent className="pt-6">{renderForm()}</CardContent>
        </Card>

        {}
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/pages/leads">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Link>
            </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={createLeadMutation.isPending}
            >
              Save & Add Another
            </Button>

            <Button
              onClick={() => handleSubmit(true)}
              disabled={createLeadMutation.isPending}
              className="min-w-[140px]"
            >
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
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
