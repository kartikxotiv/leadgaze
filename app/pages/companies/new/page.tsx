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
import { useCreateCompany, useUpdateCompany, useCompany } from "@/hooks/use-companies";
import { useWorkspaces, type Workspace } from "@/hooks/use-workspaces";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Building2,
  MapPin,
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FormData {
  title: string;
  description: string;
  location: string;
  industry: string;
  workspaceId: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCompanyId = searchParams.get("edit");
  const isEditMode = !!editCompanyId;
  
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const { currentWorkspace } = useWorkspaceContext();
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces({
    limit: 100,
  });

  const workspaces = workspacesData?.workspaces || [];

  
  const { data: companyData, isLoading: isLoadingCompany } = useCompany(
    editCompanyId || ""
  );

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    location: "",
    industry: "",
    workspaceId: currentWorkspace?.id || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentWorkspace?.id) {
      setFormData((prev) => ({
        ...prev,
        workspaceId: currentWorkspace.id,
      }));
    }
  }, [currentWorkspace?.id]);

  
  useEffect(() => {
    if (isEditMode && companyData) {
      setFormData({
        title: companyData.title || "",
        description: companyData.description || "",
        location: companyData.location || "",
        industry: companyData.industry || "",
        workspaceId: currentWorkspace?.id || "",
      });
    }
  }, [isEditMode, companyData, currentWorkspace?.id]);

  const validateField = useCallback(
    (fieldName: string, value: string): string => {
      switch (fieldName) {
        case "title":
          return !value.trim() ? "Company name is required" : "";
        default:
          return "";
      }
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    newErrors.title = validateField("title", formData.title);

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  }, [formData.title, validateField]);

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
      const workspaceId = currentWorkspace?.id;
      
      if (!workspaceId) {
        toast.error("Please select a workspace first");
        return;
      }

      if (!validateForm()) {
        toast.error("Please fill in all required fields");
        return;
      }

      try {
        const companyData = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          workspaceId: workspaceId, 
        };

        const cleanedData = Object.fromEntries(
          Object.entries(companyData).filter(([_, value]) => value !== undefined)
        ) as any;

        if (isEditMode && editCompanyId) {
          await updateCompanyMutation.mutateAsync({
            companyId: editCompanyId,
            data: cleanedData,
          });
          toast.success("Company updated successfully!");
          router.push("/pages/companies");
        } else {
          await createCompanyMutation.mutateAsync(cleanedData);
          toast.success("Company created successfully!");

          if (saveAndExit) {
            router.push("/pages/companies");
          } else {
            setFormData({
              title: "",
              description: "",
              location: "",
              industry: "",
              workspaceId: currentWorkspace?.id || "", // Reset with current workspace
            });
            setErrors({});
            toast.success("Ready to add another company!");
          }
        }
      } catch (error: any) {
        toast.error(error?.message || (isEditMode ? "Failed to update company" : "Failed to create company"));
      }
    },
    [validateForm, formData, createCompanyMutation, updateCompanyMutation, router, currentWorkspace, isEditMode, editCompanyId]
  );

  const renderForm = () => {
    return (
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Essential Information</h3>
              <p className="text-sm text-gray-600 font-regular">
                {isEditMode ? "Update company information" : "Required fields to create the company"}
              </p>
            </div>
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="workspaceId">Workspace *</Label>
            <Select
              value={formData.workspaceId}
              onValueChange={(value) => handleFormChange("workspaceId", value)}
              disabled={workspacesLoading}
            >
              <SelectTrigger className={errors.workspaceId ? "border-red-500 focus:border-red-500" : ""}>
                <SelectValue
                  placeholder={
                    workspacesLoading
                      ? "Loading workspaces..."
                      : workspaces.length === 0
                      ? "No workspaces available"
                      : "Select a workspace"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {workspaces.length > 0 ? (
                  workspaces.map((workspace: Workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-workspaces" disabled>
                    No workspaces available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.workspaceId && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.workspaceId}
              </p>
            )}
          </div> */}

          <div className="space-y-2">
            <Label htmlFor="title">Company Name *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Company Name"
                className={`pl-10 ${
                  errors.title ? "border-red-500 focus:border-red-500" : ""
                }`}
              />
            </div>
            {errors.title && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Company description and additional information..."
              rows={3}
            />
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
              <Label htmlFor="industry">Industry</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleFormChange("industry", e.target.value)}
                  placeholder="Technology, Healthcare, Finance..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
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
                {isEditMode ? "Edit Company" : "Add New Company"}
              </h1>
            </div>
          </div>
        </div>

        {isLoadingCompany && isEditMode ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground">Loading company data...</p>
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
            <Link href="/pages/companies">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
              >
                Save & Add Another
              </Button>
            )}

            <Button
              onClick={() => handleSubmit(true)}
              disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending || isLoadingCompany}
              className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
            >
              {(createCompanyMutation.isPending || updateCompanyMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? "Update Company" : "Save & Exit"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}